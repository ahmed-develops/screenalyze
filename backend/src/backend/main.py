import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import db_service
from .routers import (
    screenshots_router,
    actions_router,
    users_router,
    auth_router,
    sessions_router,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("screenalyze.backend")

@asynccontextmanager
async def lifespan(app: FastAPI):
    effective_key = settings.get_effective_openai_key()
    masked_key = f"{effective_key[:8]}...{effective_key[-4:]}" if len(effective_key) > 12 else "NOT_CONFIGURED"
    logger.info("Starting Screenalyze Backend on %s:%s (Environment: %s)", settings.host, settings.port, settings.environment)
    logger.info("OpenAI API Key: %s", masked_key)
    # Initialize MongoDB Atlas connection
    await db_service.connect()
    yield
    # Close MongoDB Atlas connection
    await db_service.close()
    logger.info("Shutting down Screenalyze Backend")

app = FastAPI(
    title="Screenalyze AI Backend",
    version="1.0.0",
    description="Python FastAPI backend powering multimodal Sol vision, categorization gatekeeping, masterclass tutorials, and user management for Screenalyze.",
    lifespan=lifespan,
)

# Configure CORS for Expo / React Native clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register sub-routers
app.include_router(screenshots_router)
app.include_router(actions_router)
app.include_router(users_router)
app.include_router(auth_router)
app.include_router(sessions_router)


@app.get("/health", tags=["System"])
async def health_check():
    """System health check and readiness probe."""
    key = settings.get_effective_openai_key()
    return {
        "status": "healthy",
        "service": "screenalyze-backend",
        "version": "1.0.0",
        "openai_configured": bool(key),
        "email_configured": bool(settings.smtp_host),
        "smtp_host": settings.smtp_host or "None (Dev Console Mode)",
        "mongodb_connected": db_service.is_connected(),
        "mongodb_configured": bool(settings.mongodb_uri),
    }

@app.get("/", tags=["System"])
async def root():
    return {
        "message": "Screenalyze AI Backend is running.",
        "docs_url": "/docs",
        "health_url": "/health",
    }

def run():
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
    )

if __name__ == "__main__":
    run()
