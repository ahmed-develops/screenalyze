import json
import logging
from pathlib import Path
from typing import Optional
from pymongo import ReturnDocument
from ..database import db_service
from ..schemas.user import UserProfile, UserProfileUpdate, AppSettings, AppSettingsUpdate

logger = logging.getLogger("screenalyze.user_service")

DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data"
STORE_PATH = DATA_DIR / "store.json"

class UserService:
    def __init__(self) -> None:
        self._ensure_storage()

    def _ensure_storage(self) -> None:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        if not STORE_PATH.exists():
            default_data = {
                "profile": UserProfile().model_dump(),
                "settings": AppSettings().model_dump(),
                "users": {},
                "user_settings": {},
            }
            STORE_PATH.write_text(json.dumps(default_data, indent=2), encoding="utf-8")

    def _read_store(self) -> dict:
        try:
            data = json.loads(STORE_PATH.read_text(encoding="utf-8"))
            if "users" not in data:
                data["users"] = {}
            if "user_settings" not in data:
                data["user_settings"] = {}
            return data
        except Exception as e:
            logger.error("Failed reading user store: %s", e)
            return {
                "profile": UserProfile().model_dump(),
                "settings": AppSettings().model_dump(),
                "users": {},
                "user_settings": {},
            }

    def _write_store(self, data: dict) -> None:
        try:
            STORE_PATH.write_text(json.dumps(data, indent=2), encoding="utf-8")
        except Exception as e:
            logger.error("Failed writing user store: %s", e)

    async def get_or_create_user(self, email: str) -> UserProfile:
        cleaned = email.strip().lower()

        # MongoDB Path
        if db_service.is_connected() and db_service.users is not None:
            doc = await db_service.users.find_one({"email": cleaned})
            if doc:
                doc.pop("_id", None)
                if doc.get("is_registered") is None:
                    doc["is_registered"] = False
                return UserProfile(**doc)

            display_name = cleaned.split("@")[0].replace(".", " ").title()
            new_profile = UserProfile(
                name=display_name,
                email=cleaned,
                role="Product Creator",
                company="Screenalyze Workspace",
                member_since="October 2026",
                total_captures=0,
                total_tutorials=0,
                accuracy_rate="100%",
                is_registered=False,
            )
            await db_service.users.insert_one(new_profile.model_dump())
            return new_profile

        # Fallback Local Storage Path
        data = self._read_store()
        users = data.get("users", {})

        if cleaned in users:
            return UserProfile(**users[cleaned])

        default_prof = data.get("profile", {})
        if default_prof.get("email", "").strip().lower() == cleaned:
            return UserProfile(**default_prof)

        display_name = cleaned.split("@")[0].replace(".", " ").title()
        new_profile = UserProfile(
            name=display_name,
            email=cleaned,
            role="Product Creator",
            company="Screenalyze Workspace",
            member_since="October 2026",
            total_captures=0,
            total_tutorials=0,
            accuracy_rate="100%",
            is_registered=False,
        )
        users[cleaned] = new_profile.model_dump()
        data["users"] = users
        data["profile"] = new_profile.model_dump()
        self._write_store(data)
        return new_profile

    async def get_user_by_email(self, email: str) -> Optional[UserProfile]:
        cleaned = email.strip().lower()

        if db_service.is_connected() and db_service.users is not None:
            doc = await db_service.users.find_one({"email": cleaned})
            if doc:
                doc.pop("_id", None)
                if doc.get("is_registered") is None:
                    doc["is_registered"] = False
                return UserProfile(**doc)
            return None

        data = self._read_store()
        users = data.get("users", {})
        if cleaned in users:
            u_data = users[cleaned]
            if u_data.get("is_registered") is None:
                u_data["is_registered"] = False
            return UserProfile(**u_data)
        default_prof = data.get("profile", {})
        if default_prof.get("email", "").strip().lower() == cleaned:
            return UserProfile(**default_prof)
        return None

    async def update_profile(self, update: UserProfileUpdate, email: Optional[str] = None) -> UserProfile:
        target_email = email.strip().lower() if email else None

        if not target_email:
            # Fallback to current default profile email
            current = await self.get_profile()
            target_email = current.email.strip().lower()

        update_dict = {k: v for k, v in update.model_dump(exclude_unset=True).items() if v is not None}


        # MongoDB Path
        if db_service.is_connected() and db_service.users is not None:
            await self.get_or_create_user(target_email)
            updated_doc = await db_service.users.find_one_and_update(
                {"email": target_email},
                {"$set": update_dict},
                return_document=ReturnDocument.AFTER,
            )
            if updated_doc:
                updated_doc.pop("_id", None)
                return UserProfile(**updated_doc)

        # Fallback Local Storage Path
        data = self._read_store()
        users = data.get("users", {})
        current_data = users.get(target_email) or data.get("profile", {})
        current_user = UserProfile(**current_data)
        merged = current_user.model_dump()
        merged.update(update_dict)
        new_profile = UserProfile(**merged)

        users[target_email] = new_profile.model_dump()
        data["users"] = users
        if not email:
            data["profile"] = new_profile.model_dump()
        self._write_store(data)
        return new_profile

    async def get_profile(self, email: Optional[str] = None) -> UserProfile:
        if email:
            return await self.get_or_create_user(email)
        # Default profile
        data = self._read_store()
        return UserProfile(**data.get("profile", {}))

    async def get_settings(self, email: Optional[str] = None) -> AppSettings:
        target_email = email.strip().lower() if email else None

        if target_email and db_service.is_connected() and db_service.settings is not None:
            doc = await db_service.settings.find_one({"user_email": target_email})
            if doc:
                doc.pop("_id", None)
                doc.pop("user_email", None)
                return AppSettings(**doc)
            default_settings = AppSettings()
            payload = default_settings.model_dump()
            payload["user_email"] = target_email
            await db_service.settings.insert_one(payload)
            return default_settings

        data = self._read_store()
        if target_email:
            user_settings = data.get("user_settings", {})
            if target_email in user_settings:
                return AppSettings(**user_settings[target_email])
            default_settings = AppSettings()
            user_settings[target_email] = default_settings.model_dump()
            data["user_settings"] = user_settings
            self._write_store(data)
            return default_settings
        return AppSettings(**data.get("settings", {}))

    async def update_settings(self, update: AppSettingsUpdate, email: Optional[str] = None) -> AppSettings:
        target_email = email.strip().lower() if email else None
        update_dict = {k: v for k, v in update.model_dump(exclude_unset=True).items() if v is not None}

        if target_email and db_service.is_connected() and db_service.settings is not None:
            # Ensure settings exist first
            await self.get_settings(target_email)
            updated_doc = await db_service.settings.find_one_and_update(
                {"user_email": target_email},
                {"$set": update_dict},
                return_document=ReturnDocument.AFTER,
            )
            if updated_doc:
                updated_doc.pop("_id", None)
                updated_doc.pop("user_email", None)
                return AppSettings(**updated_doc)

        data = self._read_store()
        current = await self.get_settings(target_email)
        merged = current.model_dump()
        merged.update(update_dict)
        new_settings = AppSettings(**merged)

        if target_email:
            user_settings = data.get("user_settings", {})
            user_settings[target_email] = new_settings.model_dump()
            data["user_settings"] = user_settings
        else:
            data["settings"] = new_settings.model_dump()

        self._write_store(data)
        return new_settings

user_service = UserService()
