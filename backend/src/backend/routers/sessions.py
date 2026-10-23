import os
import logging
from pathlib import Path
from fastapi import APIRouter, Request, HTTPException, status
from fastapi.responses import HTMLResponse
from ..schemas.session import (
    ForwardSessionRequest,
    ForwardSessionResponse,
    SessionPromptRequest,
    SessionPromptResponse,
    WorkflowSuggestion,
    WorkflowRunRequest,
    WorkflowRunResponse,
    MCPToolExecuteRequest,
    MCPToolExecuteResponse,
)
from ..services.session_service import session_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Forwarding & Web Sessions"])

TEMPLATE_PATH = Path(__file__).resolve().parent.parent / "templates" / "dashboard.html"

def get_dashboard_html() -> str:
    if TEMPLATE_PATH.exists():
        return TEMPLATE_PATH.read_text(encoding="utf-8")
    return "<html><body><h1>Screenalyze Web Dashboard</h1><p>Template loading...</p></body></html>"

@router.get("/dashboard", response_class=HTMLResponse, summary="Serve Web Dashboard")
async def serve_dashboard(request: Request, session: str = ""):
    """Serves the standalone browser dashboard with the connected analysation engine."""
    html_content = get_dashboard_html()
    return HTMLResponse(content=html_content, status_code=200)

@router.get("/dashboard/{session_id}", response_class=HTMLResponse, summary="Serve Web Dashboard for specific session")
async def serve_dashboard_with_path(session_id: str):
    """Serves the web dashboard and preselects the given session."""
    html_content = get_dashboard_html()
    # Inject auto session selection into script if needed
    modified_html = html_content.replace(
        "let currentSessionId = new URLSearchParams(window.location.search).get('session') || '';",
        f"let currentSessionId = '{session_id}';",
    )
    return HTMLResponse(content=modified_html, status_code=200)

@router.post(
    "/api/v1/sessions/forward",
    response_model=ForwardSessionResponse,
    summary="Forward screenshot session from mobile app to web dashboard",
)
async def forward_session(req: ForwardSessionRequest, request: Request) -> ForwardSessionResponse:
    """
    Called by the mobile app's Share button to forward the screenshot, prompt,
    and analysis into a standalone web browser session.
    """
    try:
        # Determine host for the client
        host_header = request.headers.get("host")
        scheme = request.headers.get("x-forwarded-proto", "http")
        host_override = f"{scheme}://{host_header}" if host_header else None

        session_id, dashboard_url = await session_service.create_forwarded_session(
            req, host_override=host_override
        )

        return ForwardSessionResponse(
            session_id=session_id,
            dashboard_url=dashboard_url,
            created_at=int(os.path.getmtime(TEMPLATE_PATH) * 1000) if TEMPLATE_PATH.exists() else 0,
            status="active",
            message="Screenshot successfully forwarded to Web Dashboard.",
        )
    except Exception as e:
        logger.exception("Error forwarding screenshot session: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to forward session: {str(e)}",
        )

@router.get(
    "/api/v1/sessions/{session_id}",
    summary="Get forwarded session payload",
)
async def get_session(session_id: str):
    session = await session_service.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' not found.",
        )
    return session

@router.get(
    "/api/v1/sessions/{session_id}/workflows",
    response_model=list[WorkflowSuggestion],
    summary="Get context-aware workflow recommendations for session",
)
async def get_session_workflows(session_id: str) -> list[WorkflowSuggestion]:
    session = await session_service.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' not found.",
        )
    return session_service.get_workflow_suggestions(session)

@router.post(
    "/api/v1/sessions/{session_id}/prompt",
    response_model=SessionPromptResponse,
    summary="Execute prompt on screenshot in web session via GPT-4o",
)
async def execute_session_prompt(session_id: str, req: SessionPromptRequest) -> SessionPromptResponse:
    try:
        result = await session_service.execute_session_prompt(
            session_id=session_id,
            prompt=req.prompt,
            action_type=req.action_type or "prompt",
            previous_context=req.previous_context,
        )
        return SessionPromptResponse(
            title=result["title"],
            content=result["content"],
            next_follow_ups=result.get("next_follow_ups", []),
            timestamp=result["timestamp"],
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        logger.exception("Session prompt execution error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )

@router.post(
    "/api/v1/sessions/{session_id}/workflows/run",
    response_model=WorkflowRunResponse,
    summary="Run an automated workflow pipeline on the screenshot context",
)
async def run_session_workflow(session_id: str, req: WorkflowRunRequest) -> WorkflowRunResponse:
    try:
        return await session_service.run_workflow(
            session_id=session_id,
            workflow_id=req.workflow_id,
            params=req.custom_params,
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        logger.exception("Workflow run error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )

@router.post(
    "/api/v1/sessions/{session_id}/mcp/execute",
    response_model=MCPToolExecuteResponse,
    summary="Execute an MCP tool call for this session",
)
async def execute_mcp(session_id: str, req: MCPToolExecuteRequest) -> MCPToolExecuteResponse:
    try:
        return await session_service.execute_mcp_tool(
            session_id=session_id,
            server_id=req.server_id,
            tool_name=req.tool_name,
            parameters=req.parameters,
        )
    except Exception as e:
        logger.exception("MCP execute error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )
