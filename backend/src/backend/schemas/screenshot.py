from pydantic import BaseModel, Field
from typing import Optional, Literal

ScreenshotCategory = Literal[
    "linkedin-post",
    "social-post",
    "article",
    "code",
    "architecture",
    "system-design",
    "tutorial",
    "document",
    "ui-design",
    "receipt",
    "chat",
    "personal-photo",
    "meme",
    "other",
]

INAPPROPRIATE_CATEGORIES: set[str] = {"personal-photo", "meme", "other"}

ACTIONABLE_CATEGORIES: set[str] = {
    "linkedin-post",
    "social-post",
    "article",
    "code",
    "architecture",
    "system-design",
    "tutorial",
    "document",
    "ui-design",
    "receipt",
    "chat",
}

def is_appropriate_category(category: Optional[str]) -> bool:
    """Returns True if category is actionable and not in inappropriate/personal categories."""
    if not category:
        return False
    cat = category.strip().lower()
    return cat in ACTIONABLE_CATEGORIES and cat not in INAPPROPRIATE_CATEGORIES


class ContextualAction(BaseModel):
    id: str
    label: str
    badge: str
    type: Literal["tutorial", "explanation", "diagram", "code", "custom"] = "tutorial"

class ClassifyRequest(BaseModel):
    image_base64: str = Field(..., description="Base64-encoded image string (with or without data URI scheme)")
    image_url: Optional[str] = None

class ClassifyResponse(BaseModel):
    is_worth_analyzing: bool
    category: str
    confidence: float
    reason: str
    image_hash: Optional[str] = None
    cached: bool = False

class AnalyzeRequest(BaseModel):
    image_base64: str = Field(..., description="Base64-encoded screenshot image")
    image_url: Optional[str] = None
    custom_instruction: Optional[str] = None
    skip_gatekeeper: bool = False
    force_reanalyze: bool = False

class AnalyzeResponse(BaseModel):
    title: str
    category: str
    summary: str
    key_points: list[str]
    contextual_actions: list[ContextualAction]
    follow_up_questions: list[str]
    is_worth_analyzing: bool = True
    image_hash: Optional[str] = None
    already_analyzed: bool = False

class SavedScreenshot(BaseModel):
    id: str
    user_email: Optional[str] = None
    image_uri: Optional[str] = None
    captured_at: int
    title: str
    category: str
    summary: str
    key_points: list[str] = Field(default_factory=list)
    contextual_actions: list[ContextualAction] = Field(default_factory=list)
    follow_up_questions: list[str] = Field(default_factory=list)
    is_worth_analyzing: bool = True
    image_hash: Optional[str] = None
    asset_id: Optional[str] = None
    is_reviewed: bool = False

