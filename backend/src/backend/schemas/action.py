from pydantic import BaseModel, Field
from typing import Optional, Any

class ExecuteActionRequest(BaseModel):
    action_or_question: str = Field(..., description="Action ID or follow-up question text")
    screenshot_title: str
    category: str = "general"
    summary: str = ""
    key_points: list[str] = Field(default_factory=list)
    custom_prompt: Optional[str] = None
    previous_context: Optional[str] = None

class ExecuteActionResponse(BaseModel):
    title: str
    content: str
    next_follow_ups: list[str]
