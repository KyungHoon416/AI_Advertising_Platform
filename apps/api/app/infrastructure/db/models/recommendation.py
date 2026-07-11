"""Ad product recommendation (single + combination) with per-product scoring."""
from __future__ import annotations

from typing import Optional

import uuid

from sqlalchemy import ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.db.base import Base, JSONType, TimestampMixin, UUIDMixin


class AdProductRecommendation(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "ad_product_recommendations"

    advertiser_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("advertisers.id", ondelete="CASCADE"), index=True
    )
    purpose: Mapped[Optional[str]] = mapped_column(String(120))  # 광고 목적
    budget: Mapped[Optional[float]] = mapped_column(Numeric(18, 2))
    combo: Mapped[Optional[dict]] = mapped_column(JSONType)       # 추천 조합(+역할)
    target_audience: Mapped[Optional[dict]] = mapped_column(JSONType)
    creative_direction: Mapped[Optional[str]] = mapped_column(String(1000))
    risks: Mapped[Optional[dict]] = mapped_column(JSONType)
    confidence: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))

    items: Mapped[list["AdProductRecItem"]] = relationship(
        back_populates="recommendation", cascade="all, delete-orphan"
    )


class AdProductRecItem(UUIDMixin, TimestampMixin, Base):
    """상품별 적합도 점수·이유·역할·예상 성과."""

    __tablename__ = "ad_product_rec_items"

    recommendation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ad_product_recommendations.id", ondelete="CASCADE"), index=True
    )
    ad_product_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ad_products.id", ondelete="RESTRICT"), index=True
    )
    rank: Mapped[Optional[int]] = mapped_column(Integer)      # 1순위/2순위
    fit_score: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(String(1000))
    role: Mapped[Optional[str]] = mapped_column(String(255))  # 조합 내 역할
    est_metrics: Mapped[Optional[dict]] = mapped_column(JSONType)  # 예상 노출/CTR/CVR/매출/ROI

    recommendation: Mapped[AdProductRecommendation] = relationship(back_populates="items")
    ad_product = relationship("AdProduct")
