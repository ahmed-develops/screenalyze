from pydantic import BaseModel
from .user import UserProfile

class OTPRequest(BaseModel):
    email: str

class OTPResponse(BaseModel):
    success: bool = True
    message: str = "One-time passcode sent successfully."
    expires_in_seconds: int = 600
    cooldown_seconds: int = 60

class OTPVerifyRequest(BaseModel):
    email: str
    code: str

class OTPVerifyResponse(BaseModel):
    success: bool
    token: str
    user: UserProfile

class SessionUserResponse(BaseModel):
    user: UserProfile
    authenticated: bool = True
