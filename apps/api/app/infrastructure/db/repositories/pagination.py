"""Generic pagination helper for list endpoints."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession


@dataclass
class PageResult:
    items: list[Any]
    total: int
    page: int
    size: int


async def paginate(db: AsyncSession, stmt: Select, page: int, size: int) -> PageResult:
    total = (
        await db.execute(select(func.count()).select_from(stmt.order_by(None).subquery()))
    ).scalar_one()
    rows = (await db.execute(stmt.limit(size).offset((page - 1) * size))).scalars().all()
    return PageResult(items=list(rows), total=int(total), page=page, size=size)
