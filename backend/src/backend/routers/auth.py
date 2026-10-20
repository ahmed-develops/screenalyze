import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status
from ..schemas.auth import (
    OTPRequest,
    OTPResponse,
    OTPVerifyRequest,
    OTPVerifyResponse,
    SessionUserResponse,
    BiometricLoginRequest,
)
from ..schemas.user import UserProfile
from ..dependencies import get_current_user
from ..services.auth_service import auth_service

logger = logging.getLogger("screenalyze.router.auth")

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication & Sessions"])

def _extract_token_from_header(authorization: Optional[str]) -> str:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    parts = authorization.split(" ")
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return authorization

@router.post(
    "/request-otp",
    response_model=OTPResponse,
    summary="Request a 6-digit one-time passcode delivered via email",
)
async def request_otp(req: OTPRequest) -> OTPResponse:
    if not req.email or "@" not in req.email or "." not in req.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid email address is required.",
        )
    try:
        return await auth_service.request_otp(req.email)
    except ValueError as e:
        msg = str(e)
        if "wait" in msg.lower():
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=msg,
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=msg,
        )

@router.post(
    "/verify-otp",
    response_model=OTPVerifyResponse,
    summary="Verify 6-digit one-time passcode and receive session token",
)
async def verify_otp(req: OTPVerifyRequest) -> OTPVerifyResponse:
    if not req.email or not req.code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and 6-digit code are required.",
        )
    try:
        return await auth_service.verify_otp(req.email, req.code)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

@router.post(
    "/biometric-login",
    response_model=OTPVerifyResponse,
    summary="Create authenticated session following on-device biometric verification",
)
async def biometric_login(req: BiometricLoginRequest) -> OTPVerifyResponse:
    if not req.email or "@" not in req.email or "." not in req.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid email address is required.",
        )
    return await auth_service.create_biometric_session(req.email)

@router.get(
    "/me",
    response_model=SessionUserResponse,
    summary="Get currently authenticated user session profile",
)
async def get_current_user_profile(
    user: UserProfile = Depends(get_current_user),
) -> SessionUserResponse:
    return SessionUserResponse(user=user, authenticated=True)

@router.post(
    "/logout",
    summary="Revoke active session token",
)
async def logout(
    authorization: Optional[str] = Header(None),
):
    token = _extract_token_from_header(authorization)
    await auth_service.revoke_session(token)
    return {"success": True, "message": "Session invalidated successfully."}

