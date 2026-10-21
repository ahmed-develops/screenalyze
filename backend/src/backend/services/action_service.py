import json
import re
import logging
from openai import AsyncOpenAI
from ..config import settings
from ..schemas.action import ExecuteActionRequest, ExecuteActionResponse

logger = logging.getLogger(__name__)

class ActionService:
    def __init__(self) -> None:
        self._client: AsyncOpenAI | None = None

    @property
    def client(self) -> AsyncOpenAI:
        if not self._client:
            key = settings.get_effective_openai_key()
            if not key:
                raise ValueError("OpenAI API Key is missing in backend environment.")
            self._client = AsyncOpenAI(api_key=key)
        return self._client

    async def execute_action(self, req: ExecuteActionRequest) -> ExecuteActionResponse:
        """
        Executes follow-up actions (tutorials, deep explanations, code generation, or Q&A)
        based on screenshot context and prompt.
        """
        prompt = (req.custom_prompt or "").strip()
        title = ""

        if not prompt:
            action = req.action_or_question
            if action == "create_tutorial":
                prompt = f'Write a comprehensive, hands-on, step-by-step tutorial teaching how to build or implement what is shown in this screenshot: "{req.screenshot_title}". Include learning objectives, prerequisites, implementation steps with realistic code snippets, edge cases, and production checklist.'
                title = f"Step-by-Step Tutorial: {req.screenshot_title}"
            elif action == "explain_tutorial":
                prompt = f'Provide an in-depth, conceptual explanation of what is happening in this screenshot: "{req.screenshot_title}". Explain the architectural rationale (the "Why"), break down components, and compare against alternative designs and trade-offs.'
                title = f"Deep-Dive Explanation: {req.screenshot_title}"
            elif action == "extract_diagram":
                prompt = f'Extract and detail the system topology shown in: "{req.screenshot_title}". Render clear ASCII diagrams showing clients, gateways, services, queues, and databases, with communication protocols and data storage choices.'
                title = f"Architecture Breakdown: {req.screenshot_title}"
            else:
                prompt = action
                title = action
        else:
            title = prompt[:50] + "..." if len(prompt) > 50 else prompt

        full_prompt = f"""The user captured a screenshot with the following context:
Screenshot Title: {req.screenshot_title}
Category: {req.category}
Summary: {req.summary}
Key Takeaways: {'; '.join(req.key_points)}

{f'Previous Context:\n{req.previous_context}\n' if req.previous_context else ''}
User Request / Question:
"{prompt}"

INSTRUCTIONS:
1. Provide a comprehensive, high-quality, clear, and actionable response directly addressing the user's request.
2. If this is a tutorial request, include learning objectives, architecture stack, implementation steps with realistic code snippets, and production considerations.
3. If this is a question, explain concepts thoroughly with intuitive analogies, architectural trade-offs, and examples.
4. Format the entire response in clean GitHub Markdown (use headers, bold text, bullet points, and code blocks).
5. AT THE VERY END OF YOUR RESPONSE, append a JSON block with exactly 3 next logical, concise follow-up questions (keep them punchy, under 8 words each, so they fit neatly in mobile suggestion pills):
```json
{{
  "nextFollowUps": [
    "Next concise follow-up question 1",
    "Next concise follow-up question 2",
    "Next concise follow-up question 3"
  ]
}}
```"""

        response = await self.client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "You are a principal engineer, architect, and educator creating production-ready guides and technical breakdowns. Format your output in clean Markdown.",
                },
                {"role": "user", "content": full_prompt},
            ],
            temperature=0.35,
            max_tokens=2800,
        )

        raw_content = response.choices[0].message.content or ""
        cleaned_content = raw_content
        next_follow_ups: list[str] = []

        json_match = re.search(r"```json\s*(\{[\s\S]*?\"nextFollowUps\"[\s\S]*?\})\s*```", raw_content)
        if json_match:
            try:
                parsed = json.loads(json_match.group(1))
                if isinstance(parsed.get("nextFollowUps"), list):
                    next_follow_ups = [str(q) for q in parsed["nextFollowUps"]]
                cleaned_content = raw_content.replace(json_match.group(0), "").strip()
            except Exception as e:
                logger.warning("Failed parsing nextFollowUps json: %s", e)

        if not next_follow_ups:
            next_follow_ups = [
                "How do we benchmark and test this in production?",
                "What are the most common failure modes?",
                "How does this compare to alternative approaches?",
            ]

        return ExecuteActionResponse(
            title=title,
            content=cleaned_content,
            next_follow_ups=next_follow_ups,
        )

action_service = ActionService()
