"""Market research, competitor discovery/intelligence, AI analysis sources."""
from __future__ import annotations

from typing import Optional

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum as SAEnum, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.enums import CompetitorType
from app.infrastructure.db.base import Base, JSONType, TimestampMixin, UUIDMixin


class MarketResearch(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "market_research"

    category_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("categories.id", ondelete="CASCADE"), index=True
    )
    market_size: Mapped[Optional[str]] = mapped_column(String(255))
    growth_rate: Mapped[Optional[str]] = mapped_column(String(120))
    trends: Mapped[Optional[dict]] = mapped_column(JSONType)
    consumer_traits: Mapped[Optional[dict]] = mapped_column(JSONType)
    opportunities: Mapped[Optional[dict]] = mapped_column(JSONType)
    risks: Mapped[Optional[dict]] = mapped_column(JSONType)
    confidence: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))
    analyzed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class Competitor(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "competitors"

    category_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("categories.id", ondelete="CASCADE"), index=True
    )
    company: Mapped[str] = mapped_column(String(200), nullable=False)
    brand: Mapped[Optional[str]] = mapped_column(String(200))
    type: Mapped[CompetitorType] = mapped_column(
        SAEnum(CompetitorType, native_enum=False), nullable=False
    )

    analysis: Mapped[Optional["CompetitorAnalysis"]] = relationship(
        back_populates="competitor", uselist=False, cascade="all, delete-orphan"
    )


class CompetitorAnalysis(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "competitor_analyses"

    competitor_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("competitors.id", ondelete="CASCADE"), index=True, unique=True
    )
    products: Mapped[Optional[dict]] = mapped_column(JSONType)
    pricing: Mapped[Optional[dict]] = mapped_column(JSONType)
    promotion: Mapped[Optional[dict]] = mapped_column(JSONType)
    channels: Mapped[Optional[dict]] = mapped_column(JSONType)  # 검색/SNS/앱/배너/CRM/Push...
    strengths: Mapped[Optional[dict]] = mapped_column(JSONType)
    weaknesses: Mapped[Optional[dict]] = mapped_column(JSONType)
    differentiators: Mapped[Optional[dict]] = mapped_column(JSONType)
    competition_intensity: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))
    confidence: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))

    competitor: Mapped[Competitor] = relationship(back_populates="analysis")
    sources: Mapped[list["AIAnalysisSource"]] = relationship(
        back_populates="analysis", cascade="all, delete-orphan"
    )


class AIAnalysisSource(UUIDMixin, TimestampMixin, Base):
    """근거 추적: 출처·수집일·신뢰도·사실/추론 구분."""

    __tablename__ = "ai_analysis_sources"

    analysis_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("competitor_analyses.id", ondelete="CASCADE"), index=True
    )
    ref_type: Mapped[str] = mapped_column(String(60), nullable=False)  # competitor/market/...
    source_url: Mapped[Optional[str]] = mapped_column(String(1000))
    title: Mapped[Optional[str]] = mapped_column(String(500))
    collected_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    confidence: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))
    is_fact: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    analysis: Mapped[Optional[CompetitorAnalysis]] = relationship(back_populates="sources")
