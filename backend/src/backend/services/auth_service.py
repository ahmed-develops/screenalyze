import hashlib
import logging
import secrets
import time
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional, Any
from .user_service import user_service
from .email_service import email_service
from ..database import db_service
from ..config import settings
from ..schemas.auth import OTPResponse, OTPVerifyResponse
from ..schemas.user import UserProfile

logger = logging.getLogger("screenalyze.auth")

def _to_utc_timestamp(val: Any) -> float:
    if not val:
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    if isinstance(val, datetime):
        if val.tzinfo is None:
            # MongoDB stores naive UTC datetime
            val = val.replace(tzinfo=timezone.utc)
        return val.timestamp()
    return 0.0

class AuthService:
    def __init__(self) -> None:
        # Local in-memory caches / fallbacks
        self._otps: Dict[str, dict] = {}
        self._sessions: Dict[str, dict] = {}

    def _hash_code(self, code: str) -> str:
        return hashlib.sha256(code.strip().encode("utf-8")).hexdigest()

    async def request_otp(self, email: str) -> OTPResponse:
        cleaned_email = email.strip().lower()
        now = time.time()
        now_dt = datetime.now(timezone.utc)

        # Check cooldown in MongoDB if connected
        if db_service.is_connected() and db_service.otps is not None:
            existing = await db_service.otps.find_one({"email": cleaned_email})
            if existing:
                last_req = existing.get("last_requested_at")
                last_req_ts = _to_utc_timestamp(last_req)
                elapsed = now - last_req_ts
                if elapsed < 60:
                    remaining = int(60 - elapsed)
                    raise ValueError(f"Please wait {remaining} seconds before requesting a new code.")
        elif cleaned_email in self._otps:
            last_req = self._otps[cleaned_email].get("last_requested_at", 0)
            elapsed = now - last_req
            if elapsed < 60:
                remaining = int(60 - elapsed)
                raise ValueError(f"Please wait {remaining} seconds before requesting a new code.")

        # Generate 6-digit random passcode
        if cleaned_email == "muhammad.ahmed31612@gmail.com" and settings.environment != "production":
            code = "842109"
        else:
            code = f"{secrets.randbelow(900000) + 100000}"

        expires_at_dt = now_dt + timedelta(minutes=10)
        code_hash = self._hash_code(code)

        otp_record = {
            "email": cleaned_email,
            "code_hash": code_hash,
            "plain_code": code,
            "expires_at": expires_at_dt,
            "last_requested_at": now_dt,
            "attempts": 0,
        }

        # Store in MongoDB if connected
        if db_service.is_connected() and db_service.otps is not None:
            await db_service.otps.delete_many({"email": cleaned_email})
            await db_service.otps.insert_one(otp_record)

        # Also store in local dict
        self._otps[cleaned_email] = {
            "code_hash": code_hash,
            "plain_code": code,
            "expires_at": now + 600,
            "last_requested_at": now,
            "attempts": 0,
        }

        # Dispatch email
        await email_service.send_otp_email(cleaned_email, code, expires_in_minutes=10)

        return OTPResponse(
            success=True,
            message=f"One-time verification code sent to {cleaned_email}",
            expires_in_seconds=600,
            cooldown_seconds=60,
        )

    async def verify_otp(self, email: str, code: str) -> OTPVerifyResponse:
        cleaned_email = email.strip().lower()
        cleaned_code = code.strip()
        now = time.time()
        now_dt = datetime.now(timezone.utc)

        stored = None
        if db_service.is_connected() and db_service.otps is not None:
            stored = await db_service.otps.find_one({"email": cleaned_email})

        if not stored:
            stored = self._otps.get(cleaned_email)

        if not stored:
            # Allow dev test code
            if cleaned_code == "842109" and settings.environment != "production":
                token = f"scr_sess_{secrets.token_urlsafe(32)}"
                await self._persist_session(token, cleaned_email, now_dt, now)
                profile = await user_service.get_or_create_user(cleaned_email)
                return OTPVerifyResponse(success=True, token=token, user=profile)
            raise ValueError("No active verification code found for this email. Please request a new code.")

        # Check expiration
        expires_at = stored.get("expires_at")
        expires_at_ts = _to_utc_timestamp(expires_at)
        if expires_at_ts and expires_at_ts < now:
            await self._delete_otp(cleaned_email)
            raise ValueError("Verification code has expired. Please request a new code.")

        # Check attempts
        attempts = stored.get("attempts", 0)
        if attempts >= 5:
            await self._delete_otp(cleaned_email)
            raise ValueError("Too many failed attempts. This code is now invalidated. Please request a new code.")

        # Increment attempts
        attempts += 1
        if db_service.is_connected() and db_service.otps is not None:
            await db_service.otps.update_one({"email": cleaned_email}, {"$set": {"attempts": attempts}})
        if cleaned_email in self._otps:
            self._otps[cleaned_email]["attempts"] = attempts

        # Check code match
        is_match = False
        if self._hash_code(cleaned_code) == stored.get("code_hash"):
            is_match = True
        elif cleaned_code == "842109" and settings.environment != "production":
            is_match = True

        if not is_match:
            remaining = 5 - attempts
            if remaining <= 0:
                await self._delete_otp(cleaned_email)
                raise ValueError("Too many failed attempts. This code is now invalidated. Please request a new code.")
            raise ValueError(f"Invalid verification code. {remaining} attempt(s) remaining.")

        # Clean up used OTP
        await self._delete_otp(cleaned_email)

        # Issue 30-day session token
        token = f"scr_sess_{secrets.token_urlsafe(32)}"
        await self._persist_session(token, cleaned_email, now_dt, now)

        # Retrieve or initialize user profile for this verified email
        profile = await user_service.get_or_create_user(cleaned_email)

        return OTPVerifyResponse(
            success=True,
            token=token,
            user=profile,
        )

    async def _persist_session(self, token: str, email: str, now_dt: datetime, now_ts: float) -> None:
        expires_at_dt = now_dt + timedelta(days=30)
        session_data = {
            "token": token,
            "email": email,
            "created_at": now_dt,
            "expires_at": expires_at_dt,
        }
        if db_service.is_connected() and db_service.sessions is not None:
            await db_service.sessions.insert_one(session_data)

        self._sessions[token] = {
            "email": email,
            "created_at": now_ts,
            "expires_at": now_ts + (30 * 86400),
        }

    async def _delete_otp(self, email: str) -> None:
        if db_service.is_connected() and db_service.otps is not None:
            await db_service.otps.delete_many({"email": email})
        if email in self._otps:
            del self._otps[email]

    async def get_session_user(self, token: str) -> Optional[UserProfile]:
        cleaned_token = token.strip()

        # Check MongoDB
        if db_service.is_connected() and db_service.sessions is not None:
            session = await db_service.sessions.find_one({"token": cleaned_token})
            if session:
                expires_at_ts = _to_utc_timestamp(session.get("expires_at"))
                if expires_at_ts and expires_at_ts < time.time():
                    await db_service.sessions.delete_one({"token": cleaned_token})
                    return None
                return await user_service.get_or_create_user(session["email"])

        # Check local dict
        session = self._sessions.get(cleaned_token)
        if session:
            if session["expires_at"] < time.time():
                del self._sessions[cleaned_token]
                return None
            return await user_service.get_or_create_user(session["email"])

        # Dev test token fallback
        if cleaned_token.startswith("scr_sess_dev_") and settings.environment != "production":
            return await user_service.get_profile()

        return None

    async def revoke_session(self, token: str) -> bool:
        cleaned_token = token.strip()
        revoked = False
        if db_service.is_connected() and db_service.sessions is not None:
            res = await db_service.sessions.delete_one({"token": cleaned_token})
            revoked = res.deleted_count > 0

        if cleaned_token in self._sessions:
            del self._sessions[cleaned_token]
            revoked = True

        return revoked

auth_service = AuthService()
