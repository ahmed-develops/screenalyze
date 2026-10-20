import logging
from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException, status
from ..schemas.user import (
    UserProfile,
    UserProfileUpdate,
    AppSettings,
    AppSettingsUpdate,
)
from ..dependencies import get_optional_user
from ..services.user_service import user_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/user", tags=["User & Settings"])

@router.get("/profile", response_model=UserProfile, summary="Get user profile")
async def get_profile(
    user: Optional[UserProfile] = Depends(get_optional_user),
    authorization: Optional[str] = Header(None),
) -> UserProfile:
    if authorization and not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired or token is invalid.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    email = user.email if user else None
    return await user_service.get_profile(email)

@router.put("/profile", response_model=UserProfile, summary="Update user profile")
async def update_profile(
    update: UserProfileUpdate,
    user: Optional[UserProfile] = Depends(get_optional_user),
    authorization: Optional[str] = Header(None),
) -> UserProfile:
    if authorization and not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired or token is invalid.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    email = user.email if user else None
    return await user_service.update_profile(update, email)

@router.get("/settings", response_model=AppSettings, summary="Get app settings")
async def get_settings(
    user: Optional[UserProfile] = Depends(get_optional_user),
    authorization: Optional[str] = Header(None),
) -> AppSettings:
    if authorization and not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired or token is invalid.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    email = user.email if user else None
    return await user_service.get_settings(email)

@router.put("/settings", response_model=AppSettings, summary="Update app settings")
async def update_settings(
    update: AppSettingsUpdate,
    user: Optional[UserProfile] = Depends(get_optional_user),
    authorization: Optional[str] = Header(None),
) -> AppSettings:
    if authorization and not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired or token is invalid.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    email = user.email if user else None
    return await user_service.update_settings(update, email)


