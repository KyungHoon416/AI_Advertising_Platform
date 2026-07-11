"""Ad product schemas."""
from __future__ import annotations

import uuid
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.domain.enums import AdProductCode


class AdProductBase(BaseModel):
    code: AdProductCode
    name: str
    definition: Optional[str] = None
    features: Optional[list] = None
    fit_purposes: Optional[list] = None
    base_price_band: Optional[str] = None
    is_active: bool = True


class AdProductCreate(AdProductBase):
    pass


class AdProductUpdate(BaseModel):
    name: Optional[str] = None
    definition: Optional[str] = None
    features: Optional[list] = None
    fit_purposes: Optional[list] = None
    base_price_band: Optional[str] = None
    is_active: Optional[bool] = None


class AdProductRead(AdProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
