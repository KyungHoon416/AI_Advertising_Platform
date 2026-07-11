"""Shared FastAPI dependencies: DB session, current user, RBAC guards."""
from __future__ import annotations

import uuid
from collections.abc import AsyncGenerator

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import SessionLocal
from app.core.security import TokenError, decode_token
from app.domain.enums import RoleCode
from app.infrastructure.db.models import Role, User

_bearer = HTTPBearer(auto_error=True)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session


async def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    try:
        payload = decode_token(creds.credentials, expected_type="access")
        user_id = uuid.UUID(payload["sub"])
    except (TokenError, KeyError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    stmt = (
        select(User)
        .options(selectinload(User.roles).selectinload(Role.permissions))
        .where(User.id == user_id)
    )
    user = (await db.execute(stmt)).scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="user not found or inactive")
    return user


def _user_permission_codes(user: User) -> set[str]:
    return {p.code for role in user.roles for p in role.permissions}


def _user_role_codes(user: User) -> set[str]:
    return {role.code for role in user.roles}


def require_roles(*role_codes: str):
    """Dependency factory enforcing membership in any of the given roles."""
    allowed = set(role_codes) | {RoleCode.SUPER_ADMIN.value}

    async def _guard(user: User = Depends(get_current_user)) -> User:
        if not (_user_role_codes(user) & allowed):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"requires one of roles: {', '.join(sorted(allowed))}",
            )
        return user

    return _guard


def require_permission(resource: str, action: str):
    """Dependency factory enforcing a specific permission (super_admin bypasses)."""
    required = f"{resource}:{action}"

    async def _guard(user: User = Depends(get_current_user)) -> User:
        if RoleCode.SUPER_ADMIN.value in _user_role_codes(user):
            return user
        if required not in _user_permission_codes(user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"missing permission: {required}",
            )
        return user

    return _guard
