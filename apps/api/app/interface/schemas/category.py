"""Category schemas."""
from __future__ import annotations

import uuid
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.domain.enums import CategoryLevel


class CategoryBase(BaseModel):
    name: str
    level: CategoryLevel
    parent_id: Optional[uuid.UUID] = None
    is_active: bool = True
    attributes: Optional[dict] = None


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    level: Optional[CategoryLevel] = None
    parent_id: Optional[uuid.UUID] = None
    is_active: Optional[bool] = None
    attributes: Optional[dict] = None


class CategoryRead(CategoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
