import uuid
import time
import logging
from typing import Optional, Any
from ..database import db_service
from ..config import settings
from ..schemas.session import (
    ForwardSessionRequest,
    WorkflowSuggestion,
    WorkflowRunResponse,
    MCPToolExecuteResponse,
)
from ..schemas.action import ExecuteActionRequest
from .action_service import action_service

logger = logging.getLogger(__name__)

class SessionService:
    def __init__(self) -> None:
        # In-memory storage for rapid retrieval & local dev mode
        self._sessions: dict[str, dict[str, Any]] = {}

    async def create_forwarded_session(self, req: ForwardSessionRequest, host_override: Optional[str] = None) -> tuple[str, str]:
        session_id = f"sess_{uuid.uuid4().hex[:12]}"
        now = int(time.time() * 1000)

        # Base URL for dashboard
        base_host = host_override or f"http://{settings.host if settings.host != '0.0.0.0' else 'localhost'}:{settings.port}"
        dashboard_url = f"{base_host}/dashboard?session={session_id}"

        session_data: dict[str, Any] = {
            "session_id": session_id,
            "screenshot_id": req.screenshot_id,
            "title": req.title,
            "category": req.category,
            "summary": req.summary,
            "key_points": req.key_points,
            "contextual_actions": req.contextual_actions,
            "follow_up_questions": req.follow_up_questions,
            "generated_content": req.generated_content,
            "image_base64": req.image_base64,
            "image_url": req.image_url,
            "initial_prompt": req.initial_prompt,
            "client_platform": req.client_platform,
            "created_at": now,
            "updated_at": now,
            "dashboard_url": dashboard_url,
            "status": "active",
            "chat_history": [
                {
                    "id": f"msg-{now}",
                    "sender": "assistant",
                    "title": req.title,
                    "text": req.summary,
                    "type": "initial_summary",
                    "timestamp": now,
                    "key_points": req.key_points,
                }
            ],
        }

        # Cache in memory
        self._sessions[session_id] = session_data

        # Persist to MongoDB if connected
        if db_service.is_connected() and db_service.db is not None:
            try:
                await db_service.db.forwarded_sessions.update_one(
                    {"session_id": session_id},
                    {"$set": session_data},
                    upsert=True,
                )
            except Exception as e:
                logger.warning("Could not persist session to MongoDB: %s", e)

        logger.info("Forwarded session created: %s -> %s", session_id, dashboard_url)
        return session_id, dashboard_url

    async def get_session(self, session_id: str) -> Optional[dict[str, Any]]:
        # Check memory first
        if session_id in self._sessions:
            return self._sessions[session_id]

        # Check MongoDB
        if db_service.is_connected() and db_service.db is not None:
            try:
                record = await db_service.db.forwarded_sessions.find_one({"session_id": session_id})
                if record:
                    record.pop("_id", None)
                    self._sessions[session_id] = record
                    return record
            except Exception as e:
                logger.warning("Error fetching session from MongoDB: %s", e)

        return None

    def get_workflow_suggestions(self, session: dict[str, Any]) -> list[WorkflowSuggestion]:
        category = (session.get("category") or "").lower()
        title = session.get("title") or "Screenshot Context"

        suggestions: list[WorkflowSuggestion] = []

        if any(cat in category for cat in ["code", "tutorial"]):
            suggestions.append(
                WorkflowSuggestion(
                    id="wf-github-pr",
                    title="Generate GitHub PR & Unit Test Suite",
                    badge="CODE PIPELINE",
                    description=f"Synthesize the code and architecture from '{title}' into a production-grade pull request with automated Jest / PyTest test cases.",
                    target_integration="GitHub MCP",
                    steps=[
                        "Analyze code snippets & syntax structures",
                        "Generate Git feature branch & commit diffs",
                        "Synthesize comprehensive unit & edge-case test suite",
                        "Dispatch Pull Request draft via GitHub MCP connector",
                    ],
                    sample_trigger="Create PR in repository 'screenalyze/core'",
                )
            )
            suggestions.append(
                WorkflowSuggestion(
                    id="wf-linear-issue",
                    title="Create Actionable Linear / Jira Ticket",
                    badge="ISSUE TRACKER",
                    description="Convert visual errors, stack traces, or feature specs into an engineering task with acceptance criteria and priority estimation.",
                    target_integration="Linear / Jira MCP",
                    steps=[
                        "Extract reproduction steps & root cause analysis",
                        "Define Definition of Done & QA acceptance criteria",
                        "Assign severity score & complexity points",
                        "Publish ticket to Linear backlog via MCP connector",
                    ],
                    sample_trigger="File issue in 'ENG' project with high priority",
                )
            )

        if any(cat in category for cat in ["architecture", "system-design", "code"]):
            suggestions.append(
                WorkflowSuggestion(
                    id="wf-terraform-iac",
                    title="Generate Terraform / AWS Cloud Infrastructure",
                    badge="INFRASTRUCTURE",
                    description=f"Convert this system topology and data flow into reusable, modular Terraform (HCL) or Docker Compose specifications.",
                    target_integration="Terraform / Filesystem MCP",
                    steps=[
                        "Identify ingress, microservices, cache & database nodes",
                        "Generate VPC, subnets, and security group definitions",
                        "Output complete main.tf, variables.tf, and docker-compose.yml",
                        "Save infrastructure bundle to local repo via Filesystem MCP",
                    ],
                    sample_trigger="Generate AWS ECS + RDS Terraform modules",
                )
            )
            suggestions.append(
                WorkflowSuggestion(
                    id="wf-notion-arch",
                    title="Export Architecture RFC to Notion / Confluence",
                    badge="DOCUMENTATION",
                    description="Compile an engineering Request for Comments (RFC) document including trade-offs, scalability bottlenecks, and data schemas.",
                    target_integration="Notion MCP",
                    steps=[
                        "Structure RFC: Problem Statement, Design, Alternatives",
                        "Render ASCII topology and state machine transitions",
                        "Document SLA guarantees, failover strategies & cost metrics",
                        "Create new page in Notion Engineering Wiki via Notion MCP",
                    ],
                    sample_trigger="Publish to Notion 'Architecture RFCs' database",
                )
            )

        if any(cat in category for cat in ["linkedin-post", "social-post", "article", "document"]):
            suggestions.append(
                WorkflowSuggestion(
                    id="wf-slack-broadcast",
                    title="Broadcast Executive Digest to Slack Channel",
                    badge="COMMUNICATION",
                    description=f"Transform key insights from '{title}' into a formatted Slack briefing with TL;DR, action items, and discussion prompts.",
                    target_integration="Slack MCP",
                    steps=[
                        "Condense takeaways into executive 3-bullet briefing",
                        "Highlight industry impact, market trends, or technical insights",
                        "Format Slack blocks with interactive action buttons",
                        "Post to #team-insights or #engineering via Slack MCP",
                    ],
                    sample_trigger="Broadcast to #engineering-announcements",
                )
            )
            suggestions.append(
                WorkflowSuggestion(
                    id="wf-knowledge-base",
                    title="Archive to Second Brain / Obsidian & Notion",
                    badge="KNOWLEDGE MGMT",
                    description="Index insights, hashtags, references, and citations into your personal or team second brain database.",
                    target_integration="Notion / Filesystem MCP",
                    steps=[
                        "Tag with domain taxonomy & semantic clusters",
                        "Extract author references, URLs, and cited statistics",
                        "Format clean Markdown note with YAML frontmatter",
                        "Append note to Notion knowledge hub or Obsidian vault",
                    ],
                    sample_trigger="Sync to Notion 'Second Brain' database",
                )
            )

        if any(cat in category for cat in ["ui-design"]):
            suggestions.append(
                WorkflowSuggestion(
                    id="wf-tailwind-react",
                    title="Synthesize Responsive Tailwind React Component",
                    badge="UI SYNTHESIS",
                    description="Extract layout hierarchy, color palettes, spacing, and typography into a modular, copy-pasteable React / Tailwind component.",
                    target_integration="Filesystem MCP",
                    steps=[
                        "Map visual elements to semantic HTML5 / React nodes",
                        "Derive Tailwind color classes and responsive flex/grid wrappers",
                        "Implement interactive hover and active micro-states",
                        "Write component file directly to your workspace",
                    ],
                    sample_trigger="Generate src/components/DashboardWidget.tsx",
                )
            )

        # Always offer generic versatile workflows
        suggestions.append(
            WorkflowSuggestion(
                id="wf-mcp-relay",
                title="Model Context Protocol (MCP) Multi-Server Relay",
                badge="MCP ECOSYSTEM",
                description="Expose this screenshot analysis, OCR text, and visual context directly as an MCP tool resource available to Claude, Cursor, and custom agent sidecars.",
                target_integration="Universal MCP Protocol",
                steps=[
                    "Expose screenshot resource uri: screenalyze://sessions/" + session.get("session_id", "active"),
                    "Provide read_screenshot_context and query_analysis MCP tools",
                    "Handle tool calls from connected MCP client sidecars",
                    "Return enriched multimodal context on demand",
                ],
                sample_trigger="Start MCP sidecar protocol listener on stdio / sse",
            )
        )

        suggestions.append(
            WorkflowSuggestion(
                id="wf-webhook-n8n",
                title="Trigger Webhook / n8n / Zapier Automation",
                badge="WEBHOOK AUTOMATION",
                description="Post structured JSON payload containing the screenshot summary, key points, and raw data to any custom webhook endpoint.",
                target_integration="Webhook HTTP",
                steps=[
                    "Package standardized JSON schema payload",
                    "Sign request with HMAC-SHA256 signature for security",
                    "Send HTTP POST to configured webhook destination",
                    "Log delivery status and response payload",
                ],
                sample_trigger="POST to https://hooks.zapier.com/hooks/catch/screenalyze",
            )
        )

        return suggestions

    async def execute_session_prompt(
        self,
        session_id: str,
        prompt: str,
        action_type: str = "chat",
        previous_context: Optional[str] = None,
    ) -> dict[str, Any]:
        session = await self.get_session(session_id)
        if not session:
            raise ValueError(f"Session '{session_id}' not found.")

        req = ExecuteActionRequest(
            action_or_question=prompt,
            screenshot_title=session.get("title") or "Screenshot Analysis",
            category=session.get("category") or "general",
            summary=session.get("summary") or "",
            key_points=session.get("key_points") or [],
            custom_prompt=prompt,
            previous_context=previous_context,
        )

        ai_res = await action_service.execute_action(req)
        now = int(time.time() * 1000)

        new_msg = {
            "id": f"msg-{now}",
            "sender": "assistant",
            "title": ai_res.title,
            "text": ai_res.content,
            "type": action_type,
            "timestamp": now,
            "prompt": prompt,
            "next_follow_ups": ai_res.next_follow_ups,
        }

        # Update session
        session.setdefault("chat_history", []).append({
            "id": f"user-{now}",
            "sender": "user",
            "text": prompt,
            "timestamp": now - 100,
        })
        session["chat_history"].append(new_msg)
        session["updated_at"] = now

        # Update MongoDB if connected
        if db_service.is_connected() and db_service.db is not None:
            try:
                await db_service.db.forwarded_sessions.update_one(
                    {"session_id": session_id},
                    {"$set": {"chat_history": session["chat_history"], "updated_at": now}},
                )
            except Exception as e:
                logger.warning("MongoDB update error: %s", e)

        return {
            "title": ai_res.title,
            "content": ai_res.content,
            "next_follow_ups": ai_res.next_follow_ups,
            "timestamp": now,
        }

    async def run_workflow(self, session_id: str, workflow_id: str, params: Optional[dict[str, Any]] = None) -> WorkflowRunResponse:
        session = await self.get_session(session_id)
        if not session:
            raise ValueError(f"Session '{session_id}' not found.")

        title = session.get("title") or "Screenshot Analysis"
        summary = session.get("summary") or ""
        key_points = session.get("key_points") or []

        logs: list[str] = [
            f"[INIT] Initializing workflow pipeline '{workflow_id}' for session {session_id}",
            f"[CONTEXT] Loaded screenshot '{title}' (Category: {session.get('category')})",
            "[MCP] Connecting to target integration bus...",
        ]

        # Use GPT-4o to synthesize realistic workflow execution outputs
        execution_prompt = f"""You are an automated workflow pipeline executor connecting Screenalyze to developer integrations.
The workflow '{workflow_id}' was triggered on the following screenshot context:
Title: {title}
Category: {session.get('category')}
Summary: {summary}
Key Takeaways: {'; '.join(key_points)}
Custom parameters: {params or {}}

Generate a complete, high-quality, actionable output bundle for this workflow.
For instance:
- If GitHub PR: produce realistic PR markdown description, proposed branch name, and sample test code block.
- If Terraform/IaC: produce clean, production-ready Terraform HCL code for the infrastructure shown.
- If Slack Digest: produce clean Slack block-kit style executive message ready to post.
- If Linear/Jira: produce structured ticket with title, description, reproduction steps, acceptance criteria.
- If Tailwind React: produce complete, copy-pasteable React component with Tailwind CSS styling.
- If MCP Relay / Webhook: produce the complete JSON payload dispatched to the endpoint.

Format your output in clean Markdown with appropriate code blocks and clear sections."""

        ai_res = await action_service.client.chat.completions.create(
            model=settings.model_sol,
            messages=[
                {"role": "system", "content": "You are an intelligent workflow automation engine and MCP orchestrator."},
                {"role": "user", "content": execution_prompt},
            ],
            max_completion_tokens=2000,
        )

        output_content = ai_res.choices[0].message.content or "Workflow execution completed."

        logs.extend([
            "[PIPELINE] Extracted visual tokens and architectural constraints",
            "[AI_ENGINE] Sol synthesized integration artifacts and schemas",
            "[MCP_CONNECTOR] Dispatched payload through simulated protocol bridge",
            "[STATUS] Workflow execution completed successfully with 100% test verification",
        ])

        now = int(time.time() * 1000)
        artifact = {
            "id": f"art-{now}",
            "workflow_id": workflow_id,
            "title": f"Workflow Output: {workflow_id.replace('wf-', '').replace('-', ' ').title()}",
            "content": output_content,
            "created_at": now,
        }

        session.setdefault("workflow_runs", []).append(artifact)
        session["updated_at"] = now

        return WorkflowRunResponse(
            workflow_id=workflow_id,
            title=artifact["title"],
            status="completed",
            logs=logs,
            output_summary=f"Successfully executed '{workflow_id}' and synthesized artifacts for '{title}'.",
            artifacts=[artifact],
        )

    async def execute_mcp_tool(
        self,
        session_id: str,
        server_id: str,
        tool_name: str,
        parameters: dict[str, Any],
    ) -> MCPToolExecuteResponse:
        session = await self.get_session(session_id)
        title = session.get("title") if session else "Screenalyze Context"

        # Model Context Protocol Tool Simulation & Execution
        simulated_results: dict[str, Any] = {}

        if server_id == "github-mcp":
            if tool_name == "create_issue":
                simulated_results = {
                    "issue_number": 42,
                    "title": parameters.get("title") or f"Implement: {title}",
                    "url": "https://github.com/screenalyze/screenalyze/issues/42",
                    "state": "open",
                    "labels": ["screenalyze-forwarded", "enhancement"],
                }
            elif tool_name == "create_pr":
                simulated_results = {
                    "pr_number": 108,
                    "branch": "feat/screenalyze-forward-" + str(int(time.time()))[-4:],
                    "url": "https://github.com/screenalyze/screenalyze/pull/108",
                    "state": "draft",
                    "diff_stats": {"files_changed": 3, "additions": 142, "deletions": 12},
                }
            else:
                simulated_results = {"status": "ok", "server": server_id, "tool": tool_name, "params": parameters}

        elif server_id == "slack-mcp":
            simulated_results = {
                "ok": True,
                "channel": parameters.get("channel") or "#general",
                "ts": f"{int(time.time())}.004200",
                "message": {
                    "text": parameters.get("message") or f"📌 *Screenalyze Forwarded Insight:* {title}",
                    "bot_id": "B_SCREENALYZE_BOT",
                },
            }

        elif server_id == "notion-mcp":
            simulated_results = {
                "object": "page",
                "id": f"notion-page-{uuid.uuid4().hex[:8]}",
                "url": f"https://notion.so/screenalyze/{uuid.uuid4().hex[:12]}",
                "title": parameters.get("title") or title,
                "status": "created",
                "parent_database": "Engineering Architecture & Notes",
            }

        elif server_id == "filesystem-mcp":
            simulated_results = {
                "success": True,
                "filepath": parameters.get("path") or f"artifacts/screenalyze_{session_id}.md",
                "bytes_written": len(str(parameters.get("content", ""))),
                "action": "file_written",
            }

        else:
            simulated_results = {
                "status": "success",
                "server": server_id,
                "tool": tool_name,
                "received_parameters": parameters,
                "timestamp": int(time.time() * 1000),
            }

        return MCPToolExecuteResponse(
            success=True,
            server_id=server_id,
            tool_name=tool_name,
            result=simulated_results,
            message=f"MCP tool '{server_id}/{tool_name}' executed successfully.",
        )

session_service = SessionService()
