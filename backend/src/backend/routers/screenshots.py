import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from ..schemas.screenshot import (
    ClassifyRequest,
    ClassifyResponse,
    AnalyzeRequest,
    AnalyzeResponse,
    SavedScreenshot,
    INAPPROPRIATE_CATEGORIES,
    is_appropriate_category,
)
from ..schemas.user import UserProfile
from ..dependencies import get_optional_user
from ..services.vision_service import vision_service
from ..services.screenshot_service import screenshot_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/screenshots", tags=["Screenshots"])

@router.get(
    "",
    response_model=list[SavedScreenshot],
    summary="Get authenticated user's screenshots",
)
async def get_screenshots(
    user: Optional[UserProfile] = Depends(get_optional_user),
) -> list[SavedScreenshot]:
    email = user.email if user else None
    return await screenshot_service.get_user_screenshots(email)

@router.post(
    "",
    response_model=SavedScreenshot,
    summary="Save or upsert user screenshot",
)
async def save_screenshot(
    item: SavedScreenshot,
    user: Optional[UserProfile] = Depends(get_optional_user),
) -> SavedScreenshot:
    email = user.email if user else None
    return await screenshot_service.save_screenshot(email, item)

@router.delete(
    "/{screenshot_id}",
    summary="Delete a user screenshot",
)
async def delete_screenshot(
    screenshot_id: str,
    user: Optional[UserProfile] = Depends(get_optional_user),
):
    email = user.email if user else None
    deleted = await screenshot_service.delete_screenshot(email, screenshot_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Screenshot not found or unauthorized.",
        )
    return {"success": True, "id": screenshot_id}

@router.post(
    "/classify",
    response_model=ClassifyResponse,
    summary="Categorize screenshot relevance (Gatekeeper)",
)
async def classify_screenshot(req: ClassifyRequest) -> ClassifyResponse:
    """
    Sub-second classification of screenshot using gpt-4o-mini with low detail.
    Evaluates whether the photo contains actionable content (LinkedIn post, code,
    architecture diagram, article, UI design) vs. personal/non-actionable photos.
    """
    if not req.image_base64:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="image_base64 is required.",
        )
    try:
        return await vision_service.classify_screenshot(req.image_base64)
    except Exception as e:
        logger.exception("Classification endpoint error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )

@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    summary="Multimodal visual analysis with GPT-4o",
)
async def analyze_screenshot(
    req: AnalyzeRequest,
    user: Optional[UserProfile] = Depends(get_optional_user),
) -> AnalyzeResponse:
    """
    Analyzes visual content deeply using GPT-4o vision.
    Produces structured title, category, summary, key points, contextual actions,
    and follow-up questions.
    """
    if not req.image_base64:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="image_base64 is required.",
        )
    try:
        # If gatekeeper is not skipped, we can optionally gatekeep first
        if not req.skip_gatekeeper:
            gate = await vision_service.classify_screenshot(req.image_base64)
            if not gate.is_worth_analyzing or gate.category in INAPPROPRIATE_CATEGORIES or not is_appropriate_category(gate.category):
                return AnalyzeResponse(
                    title=f"Personal / Non-Actionable ({gate.category})",
                    category=gate.category,
                    summary=gate.reason,
                    key_points=[],
                    contextual_actions=[],
                    follow_up_questions=[],
                    is_worth_analyzing=False,
                    image_hash=gate.image_hash,
                )

        return await vision_service.analyze_screenshot(
            req.image_base64,
            req.custom_instruction,
            force_reanalyze=req.force_reanalyze,
        )
    except Exception as e:
        logger.exception("Analysis endpoint error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )

