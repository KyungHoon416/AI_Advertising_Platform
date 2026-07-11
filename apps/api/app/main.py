"""FastAPI application entrypoint.

Phase 2 exposes health/readiness only; domain routers arrive in Phase 3.
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy import text

from app.core.config import get_settings
from app.core.database import engine

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await engine.dispose()


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    openapi_url="/openapi.json",
)


@app.get("/health", tags=["system"])
async def health() -> dict:
    return {"status": "ok", "environment": settings.environment}


@app.get("/ready", tags=["system"])
async def ready() -> dict:
    """Readiness probe: verifies DB connectivity."""
    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))
    return {"status": "ready"}
