import logging
from fastapi import APIRouter, HTTPException, status
from ..schemas.action import ExecuteActionRequest, ExecuteActionResponse
from ..services.action_service import action_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/actions", tags=["Actions & Tutorials"])

@router.post(
    "/execute",
    response_model=ExecuteActionResponse,
    summary="Generate masterclass tutorials, explanations, architecture, or answers",
)
async def execute_action(req: ExecuteActionRequest) -> ExecuteActionResponse:
    """
    Generates step-by-step masterclasses, architectural breakdowns, system design ASCII topologies,
    or direct follow-up answers using GPT-4o.
    """
    if not req.action_or_question and not req.custom_prompt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="action_or_question or custom_prompt is required.",
        )
    try:
        return await action_service.execute_action(req)
    except Exception as e:
        logger.exception("Action execution error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )
