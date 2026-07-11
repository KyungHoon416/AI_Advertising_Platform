"""Advertiser schemas."""
from __future__ import annotations

import uuid
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.domain.enums import AdvertiserSource, AdvertiserStatus


class AdvertiserBase(BaseModel):
    name: str
    brand: Optional[str] = None
    primary_category_id: Optional[uuid.UUID] = None
    region: Optional[str] = None
    size: Optional[str] = None
    budget_band: Optional[str] = None
    profile: Optional[dict] = None


class AdvertiserCreate(AdvertiserBase):
    status: AdvertiserStatus = AdvertiserStatus.CANDIDATE
    source: AdvertiserSource = AdvertiserSource.MANUAL


class AdvertiserUpdate(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    primary_category_id: Optional[uuid.UUID] = None
    region: Optional[str] = None
    size: Optional[str] = None
    budget_band: Optional[str] = None
    status: Optional[AdvertiserStatus] = None
    profile: Optional[dict] = None


class AdvertiserRead(AdvertiserBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: AdvertiserStatus
    source: AdvertiserSource
