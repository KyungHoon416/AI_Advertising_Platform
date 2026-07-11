"""Password hashing & JWT helpers.

Uses the `bcrypt` library directly (passlib is effectively unmaintained and
breaks with bcrypt>=4.1). Passwords are SHA-256 pre-hashed and base64-encoded
so the 72-byte bcrypt limit never truncates long/multibyte inputs.
"""
from __future__ import annotations

import base64
import hashlib
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import jwt

from app.core.config import get_settings

_settings = get_settings()


def _prehash(raw: str) -> bytes:
    return base64.b64encode(hashlib.sha256(raw.encode("utf-8")).digest())


def hash_password(raw: str) -> str:
    return bcrypt.hashpw(_prehash(raw), bcrypt.gensalt()).decode("ascii")


def verify_password(raw: str, hashed: str) -> bool:
    return bcrypt.checkpw(_prehash(raw), hashed.encode("ascii"))


def create_access_token(subject: str, extra: dict | None = None) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "iat": now,
        "exp": now + timedelta(minutes=_settings.access_token_ttl_minutes),
        "type": "access",
        **(extra or {}),
    }
    return jwt.encode(payload, _settings.jwt_secret, algorithm=_settings.jwt_algorithm)


def create_refresh_token(subject: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "iat": now,
        "exp": now + timedelta(days=_settings.refresh_token_ttl_days),
        "type": "refresh",
    }
    return jwt.encode(payload, _settings.jwt_secret, algorithm=_settings.jwt_algorithm)
