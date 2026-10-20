from typing import Optional
from fastapi import Header, HTTPException, status
from .services.auth_service import auth_service
from .schemas.user import UserProfile

async def get_current_user(authorization: Optional[str] = Header(None)) -> UserProfile:
    """
    FastAPI dependency that extracts and validates Bearer token,
    returning the authenticated UserProfile.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    parts = authorization.split(" ")
    token = parts[1] if len(parts) == 2 and parts[0].lower() == "bearer" else authorization
    user = await auth_service.get_session_user(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired or token is invalid. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

async def get_optional_user(authorization: Optional[str] = Header(None)) -> Optional[UserProfile]:
    """
    Optional user dependency: returns UserProfile if valid token provided, else None.
    """
    if not authorization:
        return None
    try:
        parts = authorization.split(" ")
        token = parts[1] if len(parts) == 2 and parts[0].lower() == "bearer" else authorization
        return await auth_service.get_session_user(token)
    except Exception:
        return None
