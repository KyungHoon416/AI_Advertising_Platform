"""Category management (read: any authenticated; write: admin/super_admin)."""
from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import CategoryLevel, RoleCode
from app.infrastructure.db.models import Category
from app.infrastructure.db.repositories.pagination import paginate
from app.interface.deps import get_current_user, get_db, require_roles
from app.interface.query import apply_sort
from app.interface.schemas.category import CategoryCreate, CategoryRead, CategoryUpdate
from app.interface.schemas.common import Page, PageParams

router = APIRouter(prefix="/api/v1/categories", tags=["categories"])

_SORTABLE = {"name": Category.name, "created_at": Category.created_at}


@router.get("", response_model=Page[CategoryRead], dependencies=[Depends(get_current_user)])
async def list_categories(
    params: PageParams = Depends(),
    level: Optional[CategoryLevel] = Query(None),
    parent_id: Optional[uuid.UUID] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
) -> Page[CategoryRead]:
    stmt = select(Category)
    if params.q:
        stmt = stmt.where(Category.name.ilike(f"%{params.q}%"))
    if level is not None:
        stmt = stmt.where(Category.level == level)
    if parent_id is not None:
        stmt = stmt.where(Category.parent_id == parent_id)
    if is_active is not None:
        stmt = stmt.where(Category.is_active == is_active)
    stmt = apply_sort(stmt, params.sort, _SORTABLE, Category.name)
    result = await paginate(db, stmt, params.page, params.size)
    return Page[CategoryRead](
        items=[CategoryRead.model_validate(x) for x in result.items],
        total=result.total, page=result.page, size=result.size,
    )


@router.post("", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
async def create_category(
    body: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(RoleCode.ADMIN.value)),
) -> CategoryRead:
    obj = Category(**body.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return CategoryRead.model_validate(obj)


@router.patch("/{category_id}", response_model=CategoryRead)
async def update_category(
    category_id: uuid.UUID,
    body: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(RoleCode.ADMIN.value)),
) -> CategoryRead:
    obj = (await db.execute(select(Category).where(Category.id == category_id))).scalar_one_or_none()
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="category not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    await db.commit()
    await db.refresh(obj)
    return CategoryRead.model_validate(obj)
