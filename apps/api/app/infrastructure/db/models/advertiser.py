"""Advertiser & Advertiser-Category association."""
from __future__ import annotations

from typing import Optional

import uuid

from sqlalchemy import Column, Enum as SAEnum, ForeignKey, String, Table
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.enums import AdvertiserSource, AdvertiserStatus
from app.infrastructure.db.base import Base, JSONType, TimestampMixin, UUIDMixin

advertiser_categories = Table(
    "advertiser_categories",
    Base.metadata,
    Column("advertiser_id", ForeignKey("advertisers.id", ondelete="CASCADE"), primary_key=True),
    Column("category_id", ForeignKey("categories.id", ondelete="CASCADE"), primary_key=True),
)


class Advertiser(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "advertisers"

    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    brand: Mapped[Optional[str]] = mapped_column(String(200))
    primary_category_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"), index=True
    )
    region: Mapped[Optional[str]] = mapped_column(String(120))
    size: Mapped[Optional[str]] = mapped_column(String(60))          # 대형/중견/중소
    budget_band: Mapped[Optional[str]] = mapped_column(String(60))   # 예산 밴드
    status: Mapped[AdvertiserStatus] = mapped_column(
        SAEnum(AdvertiserStatus, native_enum=False),
        default=AdvertiserStatus.CANDIDATE,
        nullable=False,
    )
    source: Mapped[AdvertiserSource] = mapped_column(
        SAEnum(AdvertiserSource, native_enum=False),
        default=AdvertiserSource.MANUAL,
        nullable=False,
    )
    profile: Mapped[Optional[dict]] = mapped_column(JSONType)  # 주요상품·고객·광고활동 등

    primary_category = relationship("Category", foreign_keys=[primary_category_id])
    categories = relationship("Category", secondary=advertiser_categories)
    scores: Mapped[list["AdvertiserScore"]] = relationship(  # noqa: F821
        back_populates="advertiser", cascade="all, delete-orphan"
    )
