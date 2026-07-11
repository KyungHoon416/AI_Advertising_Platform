"""Advertiser management (RBAC: advertiser:read / advertiser:manage)."""
from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import AdvertiserSource, AdvertiserStatus
from app.infrastructure.db.models import Advertiser
from app.infrastructure.db.repositories.pagination import paginate
from app.interface.deps import get_db, require_permission
from app.interface.query import apply_sort
from app.interface.schemas.advertiser import (
    AdvertiserCreate,
    AdvertiserRead,
    AdvertiserUpdate,
)
from app.interface.schemas.common import Page, PageParams

router = APIRouter(prefix="/api/v1/advertisers", tags=["advertisers"])

_SORTABLE = {"name": Advertiser.name, "created_at": Advertiser.created_at}


@router.get(
    "", response_model=Page[AdvertiserRead],
    dependencies=[Depends(require_permission("advertiser", "read"))],
)
async def list_advertisers(
    params: PageParams = Depends(),
    status_: Optional[AdvertiserStatus] = Query(None, alias="status"),
    source: Optional[AdvertiserSource] = Query(None),
    primary_category_id: Optional[uuid.UUID] = Query(None),
    region: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
) -> Page[AdvertiserRead]:
    stmt = select(Advertiser)
    if params.q:
        like = f"%{params.q}%"
        stmt = stmt.where(or_(Advertiser.name.ilike(like), Advertiser.brand.ilike(like)))
    if status_ is not None:
        stmt = stmt.where(Advertiser.status == status_)
    if source is not None:
        stmt = stmt.where(Advertiser.source == source)
    if primary_category_id is not None:
        stmt = stmt.where(Advertiser.primary_category_id == primary_category_id)
    if region is not None:
        stmt = stmt.where(Advertiser.region == region)
    stmt = apply_sort(stmt, params.sort, _SORTABLE, Advertiser.name)
    result = await paginate(db, stmt, params.page, params.size)
    return Page[AdvertiserRead](
        items=[AdvertiserRead.model_validate(x) for x in result.items],
        total=result.total, page=result.page, size=result.size,
    )


@router.get(
    "/{advertiser_id}", response_model=AdvertiserRead,
    dependencies=[Depends(require_permission("advertiser", "read"))],
)
async def get_advertiser(
    advertiser_id: uuid.UUID, db: AsyncSession = Depends(get_db)
) -> AdvertiserRead:
    obj = (
        await db.execute(select(Advertiser).where(Advertiser.id == advertiser_id))
    ).scalar_one_or_none()
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="advertiser not found")
    return AdvertiserRead.model_validate(obj)


@router.post(
    "", response_model=AdvertiserRead, status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("advertiser", "manage"))],
)
async def create_advertiser(
    body: AdvertiserCreate, db: AsyncSession = Depends(get_db)
) -> AdvertiserRead:
    obj = Advertiser(**body.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return AdvertiserRead.model_validate(obj)


@router.patch(
    "/{advertiser_id}", response_model=AdvertiserRead,
    dependencies=[Depends(require_permission("advertiser", "manage"))],
)
async def update_advertiser(
    advertiser_id: uuid.UUID, body: AdvertiserUpdate, db: AsyncSession = Depends(get_db)
) -> AdvertiserRead:
    obj = (
        await db.execute(select(Advertiser).where(Advertiser.id == advertiser_id))
    ).scalar_one_or_none()
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="advertiser not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return AdvertiserRead.model_validate(obj)
