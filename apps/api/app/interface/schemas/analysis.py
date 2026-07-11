"""Schemas for market/competitor/discovery/pipeline agents."""
from __future__ import annotations

import uuid
from typing import Optional

from pydantic import BaseModel


class CategoryIdRequest(BaseModel):
    category_id: uuid.UUID


class ClassifyRequest(BaseModel):
    text: str


class ClassifyResponse(BaseModel):
    result: dict
    generated_by: str
    is_fallback: bool


class MarketResearchRead(BaseModel):
    id: uuid.UUID
    category_id: uuid.UUID
    market_size: Optional[str] = None
    growth_rate: Optional[str] = None
    trends: Optional[dict] = None
    consumer_traits: Optional[dict] = None
    opportunities: Optional[dict] = None
    risks: Optional[dict] = None
    confidence: Optional[float] = None


class CompetitorRead(BaseModel):
    id: uuid.UUID
    category_id: uuid.UUID
    company: str
    brand: Optional[str] = None
    type: str


class CompetitorAnalysisRead(BaseModel):
    id: uuid.UUID
    competitor_id: uuid.UUID
    products: Optional[dict] = None
    pricing: Optional[dict] = None
    channels: Optional[dict] = None
    strengths: Optional[dict] = None
    weaknesses: Optional[dict] = None
    differentiators: Optional[dict] = None
    competition_intensity: Optional[float] = None
    confidence: Optional[float] = None


class PipelineResult(BaseModel):
    market_research_id: str
    competitor_ids: list[str]
    analysis_ids: list[str]
    discovered_advertiser_ids: list[str]
    counts: dict
