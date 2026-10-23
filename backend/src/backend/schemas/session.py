from pydantic import BaseModel, Field
from typing import Optional, Any, Literal

class ForwardSessionRequest(BaseModel):
    screenshot_id: str
    title: str
    category: str = "general"
    summary: str = ""
    key_points: list[str] = Field(default_factory=list)
    contextual_actions: list[dict[str, Any]] = Field(default_factory=list)
    follow_up_questions: list[str] = Field(default_factory=list)
    generated_content: list[dict[str, Any]] = Field(default_factory=list)
    image_base64: Optional[str] = None
    image_url: Optional[str] = None
    initial_prompt: Optional[str] = None
    client_platform: Optional[str] = "mobile"

class ForwardSessionResponse(BaseModel):
    session_id: str
    dashboard_url: str
    created_at: int
    status: str = "active"
    message: str = "Session successfully forwarded to Web Dashboard."

class SessionPromptRequest(BaseModel):
    prompt: str
    action_type: Optional[str] = "chat"
    previous_context: Optional[str] = None

class SessionPromptResponse(BaseModel):
    title: str
    content: str
    next_follow_ups: list[str] = Field(default_factory=list)
    timestamp: int

class MCPToolExecuteRequest(BaseModel):
    server_id: str
    tool_name: str
    parameters: dict[str, Any] = Field(default_factory=dict)

class MCPToolExecuteResponse(BaseModel):
    success: bool
    server_id: str
    tool_name: str
    result: dict[str, Any]
    message: str

class WorkflowStep(BaseModel):
    id: str
    label: str
    status: Literal["pending", "running", "completed", "failed"] = "pending"
    detail: Optional[str] = None

class WorkflowSuggestion(BaseModel):
    id: str
    title: str
    badge: str
    description: str
    target_integration: str  # e.g., "GitHub MCP", "Slack MCP", "Notion MCP", "Terraform / IaC"
    steps: list[str]
    sample_trigger: str

class WorkflowRunRequest(BaseModel):
    workflow_id: str
    custom_params: Optional[dict[str, Any]] = None

class WorkflowRunResponse(BaseModel):
    workflow_id: str
    title: str
    status: str
    logs: list[str]
    output_summary: str
    artifacts: list[dict[str, Any]] = Field(default_factory=list)
