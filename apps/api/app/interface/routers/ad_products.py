"""Ad product management (RBAC: ad_product:read / ad_product:manage)."""
from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import AdProductCode
from app.infrastructure.db.models import AdProduct
from app.infrastructure.db.repositories.pagination import paginate
from app.interface.deps import get_db, require_permission
from app.interface.query import apply_sort
from app.interface.schemas.ad_product import AdProductCreate, AdProductRead, AdProductUpdate
from app.interface.schemas.common import Page, PageParams

router = APIRouter(prefix="/api/v1/ad-products", tags=["ad-products"])

_SORTABLE = {"name": AdProduct.name, "created_at": AdProduct.created_at}


@router.get(
    "", response_model=Page[AdProductRead],
    dependencies=[Depends(require_permission("ad_product", "read"))],
)
async def list_ad_products(
    params: PageParams = Depends(),
    code: Optional[AdProductCode] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
) -> Page[AdProductRead]:
    stmt = select(AdProduct)
    if params.q:
        stmt = stmt.where(AdProduct.name.ilike(f"%{params.q}%"))
    if code is not None:
        stmt = stmt.where(AdProduct.code == code)
    if is_active is not None:
        stmt = stmt.where(AdProduct.is_active == is_active)
    stmt = apply_sort(stmt, params.sort, _SORTABLE, AdProduct.name)
    result = await paginate(db, stmt, params.page, params.size)
    return Page[AdProductRead](
        items=[AdProductRead.model_validate(x) for x in result.items],
        total=result.total, page=result.page, size=result.size,
    )


@router.post(
    "", response_model=AdProductRead, status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("ad_product", "manage"))],
)
async def create_ad_product(
    body: AdProductCreate, db: AsyncSession = Depends(get_db)
) -> AdProductRead:
    exists = (
        await db.execute(select(AdProduct).where(AdProduct.code == body.code))
    ).scalar_one_or_none()
    if exists is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="ad product code exists")
    obj = AdProduct(**body.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return AdProductRead.model_validate(obj)


@router.patch(
    "/{ad_product_id}", response_model=AdProductRead,
    dependencies=[Depends(require_permission("ad_product", "manage"))],
)
async def update_ad_product(
    ad_product_id: uuid.UUID, body: AdProductUpdate, db: AsyncSession = Depends(get_db)
) -> AdProductRead:
    obj = (
        await db.execute(select(AdProduct).where(AdProduct.id == ad_product_id))
    ).scalar_one_or_none()
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ad product not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return AdProductRead.model_validate(obj)
