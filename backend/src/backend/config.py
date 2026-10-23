import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
PARENT_ROOT_DIR = ROOT_DIR.parent

class Settings(BaseSettings):
    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    host: str = Field(default="0.0.0.0", alias="HOST")
    port: int = Field(default=8000, alias="PORT")
    environment: str = Field(default="development", alias="ENVIRONMENT")
    cors_origins: list[str] = Field(default=["*"], alias="CORS_ORIGINS")

    # Nodemailer-style SMTP Email Settings
    smtp_host: str = Field(default="", alias="SMTP_HOST")
    smtp_port: int = Field(default=587, alias="SMTP_PORT")
    smtp_user: str = Field(default="", alias="SMTP_USER")
    smtp_password: str = Field(default="", alias="SMTP_PASSWORD")
    smtp_from_email: str = Field(default="no-reply@screenalyze.ai", alias="SMTP_FROM_EMAIL")
    smtp_from_name: str = Field(default="Screenalyze", alias="SMTP_FROM_NAME")
    smtp_use_tls: bool = Field(default=True, alias="SMTP_USE_TLS")
    smtp_use_ssl: bool = Field(default=False, alias="SMTP_USE_SSL")

    # MongoDB Atlas Configuration
    mongodb_uri: str = Field(default="", alias="MONGODB_URI")
    mongodb_db_name: str = Field(default="screenalyze", alias="MONGODB_DB_NAME")

    # AI Model Configuration (gpt-5.6-sol & gpt-5.6-luna)
    model_sol: str = Field(default="gpt-5.6-sol", alias="MODEL_SOL")
    model_luna: str = Field(default="gpt-5.6-luna", alias="MODEL_LUNA")

    model_config = SettingsConfigDict(
        env_file=(str(ROOT_DIR / ".env"), str(PARENT_ROOT_DIR / ".env")),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    def get_effective_openai_key(self) -> str:
        if self.openai_api_key:
            return self.openai_api_key
        # Check fallback from Expo environment variable
        expo_key = os.getenv("EXPO_PUBLIC_OPENAI_API_KEY") or os.getenv("OPENAI_API_KEY")
        return expo_key or ""

settings = Settings()
