"""Schemas for campaigns, performance, ROI, renewal/upsell."""
from __future__ import annotations

import uuid
from typing import Optional

from pydantic import BaseModel


class PerformanceRead(BaseModel):
    id: uuid.UUID
    campaign_id: uuid.UUID
    period: Optional[str] = None
    impressions: Optional[int] = None
    clicks: Optional[int] = None
    ctr: Optional[float] = None
    conversions: Optional[int] = None
    cvr: Optional[float] = None
    revenue: Optional[float] = None
    roas: Optional[float] = None
    roi: Optional[float] = None
    analysis: Optional[dict] = None


class CampaignRead(BaseModel):
    id: uuid.UUID
    advertiser_id: uuid.UUID
    ad_product_id: Optional[uuid.UUID] = None
    name: str
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    contract_amount: Optional[float] = None
    status: str
    performances: list[PerformanceRead] = []


class PerformanceCreate(BaseModel):
    period: Optional[str] = None
    impressions: int = 0
    clicks: int = 0
    conversions: int = 0
    revenue: float = 0


class RoiRequest(BaseModel):
    partner_name: str = "파트너"
    impressions: int
    clicks: int
    conversions: int
    spend: float
    revenue: float


class RenewalRead(BaseModel):
    id: uuid.UUID
    campaign_id: uuid.UUID
    likelihood: str
    score: float
    rationale: Optional[str] = None
    upsell_product_code: Optional[str] = None
    upsell_reason: Optional[str] = None
