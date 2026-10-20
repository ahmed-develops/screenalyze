import logging
import asyncio
from typing import Optional, Any
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from .config import settings

logger = logging.getLogger("screenalyze.db")

class DatabaseService:
    def __init__(self) -> None:
        self.client: Optional[AsyncIOMotorClient] = None
        self.db: Optional[AsyncIOMotorDatabase] = None
        self._connected: bool = False

    async def connect(self) -> None:
        uri = settings.mongodb_uri.strip() if settings.mongodb_uri else ""
        if not uri:
            logger.info("ℹ️ [MONGODB] MONGODB_URI is not configured in .env. Operating in memory-backed local persistence mode.")
            self._connected = False
            return

        try:
            logger.info("Connecting to MongoDB Atlas at %s...", uri.split("@")[-1] if "@" in uri else uri[:15] + "...")
            self.client = AsyncIOMotorClient(
                uri,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000,
            )
            # Verify connection with ping
            await self.client.admin.command("ping")
            self.db = self.client[settings.mongodb_db_name]
            self._connected = True
            logger.info("✅ [MONGODB] Successfully connected to MongoDB Atlas database: '%s'", settings.mongodb_db_name)

            await self._create_indexes()
        except Exception as e:
            logger.warning("⚠️ [MONGODB] Failed to connect to MongoDB Atlas (%s). Falling back to local in-memory storage.", e)
            self._connected = False
            self.client = None
            self.db = None

    async def _create_indexes(self) -> None:
        if not self._connected or self.db is None:
            return

        try:
            # Users: unique index on email
            await self.db.users.create_index("email", unique=True)
            # Sessions: unique index on token, TTL index on expires_at
            await self.db.sessions.create_index("token", unique=True)
            await self.db.sessions.create_index("expires_at", expireAfterSeconds=0)
            # OTPs: index on email, TTL index on expires_at
            await self.db.otps.create_index("email")
            await self.db.otps.create_index("expires_at", expireAfterSeconds=0)
            # Screenshots: indexed by user_email and custom id
            await self.db.screenshots.create_index([("user_email", 1), ("captured_at", -1)])
            await self.db.screenshots.create_index("id")
            # Settings: unique index on user_email
            await self.db.settings.create_index("user_email", unique=True)
            logger.info("✅ [MONGODB] Database indexes ensured for all collections.")
        except Exception as e:
            logger.warning("Could not create MongoDB indexes: %s", e)

    async def close(self) -> None:
        if self.client:
            self.client.close()
            self._connected = False
            logger.info("Closed MongoDB connection.")

    def is_connected(self) -> bool:
        return self._connected and self.db is not None

    @property
    def users(self) -> Any:
        return self.db.users if self.is_connected() else None

    @property
    def sessions(self) -> Any:
        return self.db.sessions if self.is_connected() else None

    @property
    def otps(self) -> Any:
        return self.db.otps if self.is_connected() else None

    @property
    def screenshots(self) -> Any:
        return self.db.screenshots if self.is_connected() else None

    @property
    def settings(self) -> Any:
        return self.db.settings if self.is_connected() else None

db_service = DatabaseService()
