"""De-identified aggregate data (safe for external AI). Raw PII stays internal."""
from __future__ import annotations

from typing import Optional

from sqlalchemy import Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.db.base import Base, JSONType, TimestampMixin, UUIDMixin


class CustomerSegment(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "customer_segments"

    name: Mapped[str] = mapped_column(String(120), nullable=False)
    definition: Mapped[dict] = mapped_column(JSONType, nullable=False)  # 성별/연령/지역/자녀 등 기준
    size: Mapped[Optional[int]] = mapped_column(Integer)
    metrics: Mapped[Optional[dict]] = mapped_column(JSONType)


class MemberAggregate(UUIDMixin, TimestampMixin, Base):
    """연령대×지역×회원등급 등 축별 회원 집계(비식별)."""

    __tablename__ = "member_aggregates"

    dimension: Mapped[dict] = mapped_column(JSONType, nullable=False)  # {age_band, region, grade...}
    member_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    metrics: Mapped[Optional[dict]] = mapped_column(JSONType)


class BehaviorAggregate(UUIDMixin, TimestampMixin, Base):
    """카테고리×축별 행동 집계(조회/찜/장바구니/검색량 등, 비식별)."""

    __tablename__ = "behavior_aggregates"

    category: Mapped[Optional[str]] = mapped_column(String(120))
    dimension: Mapped[dict] = mapped_column(JSONType, nullable=False)
    view_count: Mapped[Optional[int]] = mapped_column(Integer)
    wish_count: Mapped[Optional[int]] = mapped_column(Integer)
    cart_count: Mapped[Optional[int]] = mapped_column(Integer)
    search_count: Mapped[Optional[int]] = mapped_column(Integer)
    metrics: Mapped[Optional[dict]] = mapped_column(JSONType)


class PurchaseAggregate(UUIDMixin, TimestampMixin, Base):
    """카테고리×축별 구매/예약 집계(비식별)."""

    __tablename__ = "purchase_aggregates"

    category: Mapped[Optional[str]] = mapped_column(String(120))
    dimension: Mapped[dict] = mapped_column(JSONType, nullable=False)
    purchase_count: Mapped[Optional[int]] = mapped_column(Integer)
    reservation_count: Mapped[Optional[int]] = mapped_column(Integer)
    avg_order_value: Mapped[Optional[float]] = mapped_column(Numeric(12, 2))
    repurchase_rate: Mapped[Optional[float]] = mapped_column(Numeric(6, 3))
    cancel_rate: Mapped[Optional[float]] = mapped_column(Numeric(6, 3))
    metrics: Mapped[Optional[dict]] = mapped_column(JSONType)
