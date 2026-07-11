"""Ad-product recommendation schemas."""
from __future__ import annotations

import uuid
from typing import Optional

from pydantic import BaseModel


class RecommendationRequest(BaseModel):
    advertiser_id: uuid.UUID
    purpose: Optional[str] = None
    budget: Optional[float] = None


class RecItemRead(BaseModel):
    ad_product_id: uuid.UUID
    product_code: Optional[str] = None
    rank: Optional[int] = None
    fit_score: float
    reason: Optional[str] = None
    role: Optional[str] = None
    est_metrics: Optional[dict] = None


class ComboRead(BaseModel):
    name: str
    product_codes: list[str]
    roles: dict


class RecommendationRead(BaseModel):
    id: uuid.UUID
    advertiser_id: uuid.UUID
    purpose: Optional[str] = None
    budget: Optional[float] = None
    combo: Optional[ComboRead] = None
    confidence: Optional[float] = None
    items: list[RecItemRead]
