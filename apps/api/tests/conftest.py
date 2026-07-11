"""Test fixtures: temp SQLite DB, schema, seed data, and TestClient.

Env vars are set BEFORE importing app modules so the cached Settings and the
async engine bind to the throwaway SQLite database.
"""
from __future__ import annotations

import asyncio
import os
import pathlib

import pytest

_DB_PATH = pathlib.Path(__file__).parent / "_test.db"
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_DB_PATH}"
os.environ["DEBUG"] = "false"  # silence SQL echo in tests
os.environ["JWT_SECRET"] = "test-secret"
os.environ["SEED_ADMIN_EMAIL"] = "admin@nolbal.com"
os.environ["SEED_ADMIN_PASSWORD"] = "ChangeMe!234"


@pytest.fixture(scope="session")
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture(scope="session")
def client():
    from fastapi.testclient import TestClient

    from app.core.database import engine
    from app.infrastructure.db.models import Base
    from app.main import app
    from app.seed.seed import run as seed_run

    async def _setup() -> None:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
        await seed_run()

    asyncio.run(_setup())
    with TestClient(app) as c:
        yield c
    _DB_PATH.unlink(missing_ok=True)


@pytest.fixture(scope="session")
def operator_token(client) -> str:
    """Create an operator user directly, return its access token."""
    import asyncio as _asyncio

    from sqlalchemy import select

    from app.core.database import SessionLocal
    from app.core.security import create_access_token, hash_password
    from app.infrastructure.db.models import Role, User

    async def _mk() -> str:
        async with SessionLocal() as db:
            existing = (
                await db.execute(select(User).where(User.email == "operator@nolbal.com"))
            ).scalar_one_or_none()
            if existing is None:
                role = (await db.execute(select(Role).where(Role.code == "operator"))).scalar_one()
                user = User(
                    email="operator@nolbal.com",
                    password_hash=hash_password("Operator!234"),
                    name="Ops User",
                )
                user.roles.append(role)
                db.add(user)
                await db.commit()
                await db.refresh(user)
                return str(user.id)
            return str(existing.id)

    user_id = _asyncio.run(_mk())
    return create_access_token(user_id)


@pytest.fixture(scope="session")
def admin_token(client) -> str:
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@nolbal.com", "password": "ChangeMe!234"},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]
