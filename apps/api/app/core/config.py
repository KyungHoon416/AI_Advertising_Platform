"""Application configuration (env-driven, Secrets Manager compatible)."""
from __future__ import annotations

from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # App
    app_name: str = "Internal AI Advertising Platform"
    environment: str = "local"  # local | staging | production
    debug: bool = True

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/ai_ad_platform"
    # Sync URL used by Alembic migrations
    database_url_sync: str = "postgresql+psycopg://postgres:postgres@localhost:5432/ai_ad_platform"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Security
    jwt_secret: str = "change-me-in-secrets-manager"
    jwt_algorithm: str = "HS256"
    access_token_ttl_minutes: int = 15
    refresh_token_ttl_days: int = 7

    # External AI / Search (loaded from Secrets Manager in prod)
    anthropic_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    websearch_api_key: Optional[str] = None


@lru_cache
def get_settings() -> Settings:
    return Settings()
