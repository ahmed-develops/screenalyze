import json
import logging
import hashlib
from pathlib import Path
from openai import AsyncOpenAI
from ..config import settings
from ..schemas.screenshot import (
    ClassifyResponse,
    AnalyzeResponse,
    ContextualAction,
    INAPPROPRIATE_CATEGORIES,
    is_appropriate_category,
)

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data"
CACHE_PATH = DATA_DIR / "screenshots_cache.json"

def _clean_base64(raw: str) -> str:
    """Removes data URI header if present."""
    if "base64," in raw:
        return raw.split("base64,")[1].strip()
    return raw.strip()

def _compute_image_hash(cleaned_b64: str) -> str:
    """Computes deterministic SHA-256 hex digest of image base64 bytes."""
    return hashlib.sha256(cleaned_b64.encode("utf-8")).hexdigest()

class VisionService:
    def __init__(self) -> None:
        self.api_key = settings.get_effective_openai_key()
        self._client: AsyncOpenAI | None = None
        self._cache = self._load_cache()

    def _load_cache(self) -> dict:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        if CACHE_PATH.exists():
            try:
                return json.loads(CACHE_PATH.read_text(encoding="utf-8"))
            except Exception as e:
                logger.error("Failed loading screenshots cache: %s", e)
        return {"classifications": {}, "analyses": {}}

    def _save_cache(self) -> None:
        try:
            CACHE_PATH.write_text(json.dumps(self._cache, indent=2), encoding="utf-8")
        except Exception as e:
            logger.error("Failed saving screenshots cache: %s", e)

    @property
    def client(self) -> AsyncOpenAI:
        if not self._client:
            key = settings.get_effective_openai_key()
            if not key:
                raise ValueError("OpenAI API Key is not set in backend environment (OPENAI_API_KEY).")
            self._client = AsyncOpenAI(api_key=key)
        return self._client

    async def classify_screenshot(self, image_base64: str) -> ClassifyResponse:
        """
        Gatekeeper & Categorization Engine:
        Evaluates whether a screenshot contains actionable/knowledge content
        (e.g. LinkedIn post, code, architecture slide, article, UI design)
        vs. personal/non-actionable photos (selfie, family, food, meme, blurry camera shot).
        Uses low-detail gpt-4o-mini (~85 tokens) for sub-second, cost-effective evaluation.
        """
        cleaned_b64 = _clean_base64(image_base64)
        img_hash = _compute_image_hash(cleaned_b64)

        # Check classification cache
        cached = self._cache.get("classifications", {}).get(img_hash)
        if cached:
            logger.info("Serving screenshot classification from cache for hash: %s", img_hash)
            cached_data = dict(cached)
            cached_data["image_hash"] = img_hash
            cached_data["cached"] = True
            return ClassifyResponse(**cached_data)
        
        prompt = """You are the Gatekeeper & Categorization Engine for Screenalyze.
Your goal is to decide whether this screenshot is WORTH ANALYZING for a knowledge worker, developer, or learner.

CRITERIA FOR is_worth_analyzing = true:
- Professional or insightful social posts (LinkedIn posts, Twitter/X threads, Reddit discussions).
- Code snippets, GitHub screens, IDE windows, terminal outputs.
- Technical tutorials, system design diagrams, architecture topologies, lecture slides.
- Articles, blog posts, documentation, e-books, news.
- UI/UX mockups, Figma wireframes, mobile app screens.
- Receipts, invoices, tables, spreadsheets, financial charts.
- Actionable chat messages with instructions, links, or tasks.

CRITERIA FOR is_worth_analyzing = false:
- Personal photos: selfies, portraits, family/friends, vacations, pets, nature, food/meals.
- Blurry photos, camera mis-clicks, black/pocket shots.
- Generic memes without technical/educational or reference value.
- Bare lock screen or home screen wallpapers without informative content.

Return a valid JSON object matching this schema (do NOT include markdown code fences or backticks):
{
  "is_worth_analyzing": boolean,
  "category": "linkedin-post" | "social-post" | "article" | "code" | "architecture" | "system-design" | "tutorial" | "document" | "ui-design" | "receipt" | "chat" | "personal-photo" | "meme" | "other",
  "confidence": number between 0.0 and 1.0,
  "reason": "1 concise sentence explaining why it is or isn't worth analyzing"
}"""

        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert image categorization gatekeeper. Respond only with JSON.",
                    },
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{cleaned_b64}",
                                    "detail": "low",
                                },
                            },
                        ],
                    },
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
                max_tokens=220,
            )

            raw_text = response.choices[0].message.content or "{}"
            parsed = json.loads(raw_text.strip())

            raw_category = str(parsed.get("category", "other")).strip().lower()
            is_worth = bool(parsed.get("is_worth_analyzing", True))
            if raw_category in INAPPROPRIATE_CATEGORIES or not is_appropriate_category(raw_category):
                is_worth = False

            result = ClassifyResponse(
                is_worth_analyzing=is_worth,
                category=raw_category,
                confidence=float(parsed.get("confidence", 0.9)),
                reason=str(parsed.get("reason", "Evaluated by categorization engine")),
                image_hash=img_hash,
                cached=False,
            )
            self._cache.setdefault("classifications", {})[img_hash] = result.model_dump()
            self._save_cache()
            return result
        except Exception as e:
            logger.exception("Error in classify_screenshot: %s", e)
            # Default to allowing so users are not blocked on unexpected API errors
            return ClassifyResponse(
                is_worth_analyzing=True,
                category="other",
                confidence=0.5,
                reason=f"Gatekeeper fallback: {str(e)}",
                image_hash=img_hash,
                cached=False,
            )

    async def analyze_screenshot(
        self,
        image_base64: str,
        custom_instruction: str | None = None,
        force_reanalyze: bool = False,
    ) -> AnalyzeResponse:
        """
        Multimodal visual analysis of screenshot using OpenAI GPT-4o.
        Generates structured summary, key points, contextual action buttons, and follow-up questions.
        Caches results persistently by SHA-256 hash to eliminate redundant analysis.
        """
        cleaned_b64 = _clean_base64(image_base64)
        img_hash = _compute_image_hash(cleaned_b64)

        if not force_reanalyze:
            cached = self._cache.get("analyses", {}).get(img_hash)
            if cached:
                logger.info("Serving screenshot analysis from persistent cache for hash: %s", img_hash)
                cached_data = dict(cached)
                cached_data["image_hash"] = img_hash
                cached_data["already_analyzed"] = True
                return AnalyzeResponse(**cached_data)

        custom_part = f"\nAdditional User Instruction: {custom_instruction}\n" if custom_instruction else ""

        prompt = f"""You are an expert AI vision assistant for Screenalyze. The user captured this screenshot on their mobile device (e.g. from LinkedIn, a tutorial, system design slide, coding IDE, documentation, chat, article, diagram, or receipt).
{custom_part}
Analyze the visual contents deeply and return a valid JSON object matching this schema (do NOT include markdown code fences or backticks):
{{
  "title": "Clear, specific, and informative title describing what is shown in this exact screenshot",
  "category": "linkedin-post" | "social-post" | "youtube-tutorial" | "system-design" | "code" | "article" | "architecture" | "chat" | "general",
  "summary": "2-4 sentence accurate summary of the actual visual content and concepts taught or displayed in this screenshot",
  "key_points": ["Key takeaway 1", "Key takeaway 2", "Key takeaway 3", "Key takeaway 4"],
  "contextual_actions": [
    {{
      "id": "action-1",
      "label": "Specific action/tutorial request tailored to what is shown (e.g. 'Create step-by-step tutorial implementing Kafka partition key hashing')",
      "badge": "Step-by-Step Tutorial",
      "type": "tutorial"
    }},
    {{
      "id": "action-2",
      "label": "Deep dive prompt tailored to the trade-offs or architecture (e.g. 'Explain the consensus mechanism and leader election shown in this slide')",
      "badge": "Concept Explanation",
      "type": "explanation"
    }},
    {{
      "id": "action-3",
      "label": "Technical breakdown or implementation prompt tailored to the visual",
      "badge": "System Breakdown",
      "type": "diagram"
    }}
  ],
  "follow_up_questions": [
    "Contextual follow-up question 1 directly relevant to this specific photo",
    "Contextual follow-up question 2 directly relevant to this specific photo",
    "Contextual follow-up question 3 directly relevant to this specific photo",
    "Contextual follow-up question 4 directly relevant to this specific photo"
  ]
}}

CRITICAL RULES:
- contextual_actions and follow_up_questions MUST NOT BE GENERIC. They must directly reference the specific terms, diagrams, code, or ideas in this screenshot.
- Provide 3 to 4 contextual_actions with informative, actionable labels.
- Provide 3 to 4 follow_up_questions that an inquisitive learner or engineer would ask."""

        response = await self.client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert AI vision assistant specializing in technical education, architecture analysis, and software engineering. Return only valid JSON without markdown wrapping.",
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{cleaned_b64}",
                                "detail": "high",
                            },
                        },
                    ],
                },
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
            max_tokens=1600,
        )

        raw_text = response.choices[0].message.content or "{}"
        parsed = json.loads(raw_text.strip())

        raw_actions = parsed.get("contextual_actions", [])
        actions: list[ContextualAction] = []
        if isinstance(raw_actions, list) and len(raw_actions) > 0:
            for idx, a in enumerate(raw_actions):
                actions.append(
                    ContextualAction(
                        id=a.get("id") or f"action-{idx + 1}",
                        label=a.get("label") or f"Explore {parsed.get('title', 'Screenshot')}",
                        badge=a.get("badge") or "Tutorial",
                        type=a.get("type", "tutorial"),
                    )
                )
        else:
            actions = [
                ContextualAction(
                    id="action-1",
                    label=f"Create a step-by-step tutorial for {parsed.get('title', 'this topic')}",
                    badge="Step-by-Step Tutorial",
                    type="tutorial",
                ),
                ContextualAction(
                    id="action-2",
                    label=f"Explain the key concepts of {parsed.get('title', 'this topic')}",
                    badge="Concept Explanation",
                    type="explanation",
                ),
            ]

        key_points = parsed.get("key_points")
        if not isinstance(key_points, list):
            key_points = parsed.get("keyPoints", [])

        follow_ups = parsed.get("follow_up_questions")
        if not isinstance(follow_ups, list):
            follow_ups = parsed.get("followUpQuestions", [])

        result = AnalyzeResponse(
            title=parsed.get("title", "Screenshot Breakdown"),
            category=parsed.get("category", "general"),
            summary=parsed.get("summary", "Summary of captured visual content."),
            key_points=key_points,
            contextual_actions=actions,
            follow_up_questions=follow_ups,
            is_worth_analyzing=True,
            image_hash=img_hash,
            already_analyzed=False,
        )
        self._cache.setdefault("analyses", {})[img_hash] = result.model_dump()
        self._save_cache()
        return result

vision_service = VisionService()
