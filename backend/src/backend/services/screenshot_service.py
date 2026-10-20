import json
import logging
from pathlib import Path
from typing import Optional
from ..database import db_service
from ..schemas.screenshot import SavedScreenshot

logger = logging.getLogger("screenalyze.screenshot_service")

DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data"
STORE_PATH = DATA_DIR / "store.json"

class ScreenshotService:
    def _read_store(self) -> dict:
        try:
            if STORE_PATH.exists():
                data = json.loads(STORE_PATH.read_text(encoding="utf-8"))
                if "user_screenshots" not in data:
                    data["user_screenshots"] = {}
                return data
        except Exception as e:
            logger.error("Failed reading screenshot store: %s", e)
        return {"user_screenshots": {}}

    def _write_store(self, data: dict) -> None:
        try:
            STORE_PATH.write_text(json.dumps(data, indent=2), encoding="utf-8")
        except Exception as e:
            logger.error("Failed writing screenshot store: %s", e)

    async def get_user_screenshots(self, email: Optional[str]) -> list[SavedScreenshot]:
        if not email:
            return []
        cleaned = email.strip().lower()

        # MongoDB Path
        if db_service.is_connected() and db_service.screenshots is not None:
            cursor = db_service.screenshots.find({"user_email": cleaned}).sort("captured_at", -1)
            results = []
            async for doc in cursor:
                doc.pop("_id", None)
                results.append(SavedScreenshot(**doc))
            return results

        # Fallback Local Storage
        data = self._read_store()
        user_screenshots = data.get("user_screenshots", {}).get(cleaned, [])
        return [SavedScreenshot(**item) for item in user_screenshots]

    async def save_screenshot(self, email: Optional[str], item: SavedScreenshot) -> SavedScreenshot:
        target_email = email.strip().lower() if email else "default@screenalyze.ai"
        item.user_email = target_email

        # MongoDB Path
        if db_service.is_connected() and db_service.screenshots is not None:
            payload = item.model_dump()
            await db_service.screenshots.update_one(
                {"id": item.id, "user_email": target_email},
                {"$set": payload},
                upsert=True,
            )
            return item

        # Fallback Local Storage
        data = self._read_store()
        all_user_screenshots = data.get("user_screenshots", {})
        user_list = all_user_screenshots.get(target_email, [])

        filtered = [s for s in user_list if s.get("id") != item.id]
        filtered.insert(0, item.model_dump())
        all_user_screenshots[target_email] = filtered
        data["user_screenshots"] = all_user_screenshots
        self._write_store(data)
        return item

    async def delete_screenshot(self, email: Optional[str], screenshot_id: str) -> bool:
        if not email:
            return False
        cleaned = email.strip().lower()

        # MongoDB Path
        if db_service.is_connected() and db_service.screenshots is not None:
            res = await db_service.screenshots.delete_one({"id": screenshot_id, "user_email": cleaned})
            return res.deleted_count > 0

        # Fallback Local Storage
        data = self._read_store()
        all_user_screenshots = data.get("user_screenshots", {})
        user_list = all_user_screenshots.get(cleaned, [])
        filtered = [s for s in user_list if s.get("id") != screenshot_id]
        if len(filtered) != len(user_list):
            all_user_screenshots[cleaned] = filtered
            data["user_screenshots"] = all_user_screenshots
            self._write_store(data)
            return True
        return False

screenshot_service = ScreenshotService()
