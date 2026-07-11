"""Prompt Library endpoints (list/detail/create + version)."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domain.enums import PromptStatus
from app.infrastructure.db.models import Prompt, PromptVersion
from app.interface.deps import get_db, require_permission
from app.interface.schemas.prompt import (
    PromptCreate,
    PromptDetail,
    PromptRead,
    PromptVersionRead,
)

router = APIRouter(prefix="/api/v1/prompts", tags=["prompts"])


def _ver_read(v: PromptVersion) -> PromptVersionRead:
    return PromptVersionRead(
        id=v.id, version=v.version, template=v.template, model=v.model,
        status=v.status.value if hasattr(v.status, "value") else str(v.status),
    )


def _latest(versions: list[PromptVersion]) -> PromptVersion | None:
    return max(versions, key=lambda v: v.version) if versions else None


@router.get("", response_model=list[PromptRead],
            dependencies=[Depends(require_permission("prompt", "read"))])
async def list_prompts(db: AsyncSession = Depends(get_db)) -> list[PromptRead]:
    rows = list((await db.execute(
        select(Prompt).options(selectinload(Prompt.versions)).order_by(Prompt.category)
    )).scalars().all())
    out = []
    for p in rows:
        latest = _latest(p.versions)
        out.append(PromptRead(
            id=p.id, category=p.category, name=p.name, description=p.description,
            latest=_ver_read(latest) if latest else None,
        ))
    return out


@router.get("/{prompt_id}", response_model=PromptDetail,
            dependencies=[Depends(require_permission("prompt", "read"))])
async def get_prompt(prompt_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> PromptDetail:
    p = (await db.execute(
        select(Prompt).options(selectinload(Prompt.versions)).where(Prompt.id == prompt_id)
    )).scalar_one_or_none()
    if p is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="prompt not found")
    latest = _latest(p.versions)
    return PromptDetail(
        id=p.id, category=p.category, name=p.name, description=p.description,
        latest=_ver_read(latest) if latest else None,
        versions=[_ver_read(v) for v in sorted(p.versions, key=lambda v: v.version)],
    )


@router.post("", response_model=PromptDetail, status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(require_permission("prompt", "manage"))])
async def create_prompt(body: PromptCreate, db: AsyncSession = Depends(get_db)) -> PromptDetail:
    p = Prompt(category=body.category, name=body.name, description=body.description)
    db.add(p)
    await db.flush()
    v = PromptVersion(prompt_id=p.id, version=1, template=body.template,
                      model=body.model, status=PromptStatus.DRAFT)
    db.add(v)
    await db.commit()
    await db.refresh(p)
    await db.refresh(v)
    return PromptDetail(
        id=p.id, category=p.category, name=p.name, description=p.description,
        latest=_ver_read(v), versions=[_ver_read(v)],
    )
