from pydantic import BaseModel, Field
from typing import Optional, Literal

class UserProfile(BaseModel):
    name: str = "Muhammad Ahmed"
    email: str = "muhammad.ahmed@screenalyze.ai"
    role: str = "Staff Product Architect"
    company: str = "Screenalyze Labs"
    avatar_uri: str = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80"
    plan: Literal["free", "pro", "enterprise"] = "pro"
    plan_name: str = "Pro"
    member_since: str = "March 2025"
    total_captures: int = 142
    total_tutorials: int = 48
    accuracy_rate: str = "99.4%"
    cloud_sync: bool = True
    biometric_lock: bool = True
    telemetry_enabled: bool = False
    is_registered: bool = False

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    company: Optional[str] = None
    avatar_uri: Optional[str] = None
    plan: Optional[Literal["free", "pro", "enterprise"]] = None
    plan_name: Optional[str] = None
    cloud_sync: Optional[bool] = None
    biometric_lock: Optional[bool] = None
    telemetry_enabled: Optional[bool] = None
    is_registered: Optional[bool] = None


class AppSettings(BaseModel):
    auto_analyze_screenshots: bool = True
    enable_notifications: bool = True
    daily_nudge_enabled: bool = True
    daily_nudge_hour: int = 20
    daily_nudge_minute: int = 0
    smart_categorization_enabled: bool = True
    preferred_detail_level: Literal["concise", "detailed", "comprehensive"] = "detailed"
    custom_prompt_instruction: str = ""
    theme_mode: Literal["system", "dark", "light"] = "system"
    prompt_past_screenshots_enabled: bool = True

class AppSettingsUpdate(BaseModel):
    auto_analyze_screenshots: Optional[bool] = None
    enable_notifications: Optional[bool] = None
    daily_nudge_enabled: Optional[bool] = None
    daily_nudge_hour: Optional[int] = None
    daily_nudge_minute: Optional[int] = None
    smart_categorization_enabled: Optional[bool] = None
    preferred_detail_level: Optional[Literal["concise", "detailed", "comprehensive"]] = None
    custom_prompt_instruction: Optional[str] = None
    theme_mode: Optional[Literal["system", "dark", "light"]] = None
    prompt_past_screenshots_enabled: Optional[bool] = None

