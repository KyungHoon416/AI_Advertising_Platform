"""Proposal, Campaign, Performance, Renewal & Upsell."""
from __future__ import annotations

from typing import Optional

import uuid

from sqlalchemy import Enum as SAEnum, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.enums import CampaignStatus, ProposalStatus, RenewalLikelihood
from app.infrastructure.db.base import Base, JSONType, TimestampMixin, UUIDMixin


class Proposal(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "proposals"

    advertiser_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("advertisers.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[ProposalStatus] = mapped_column(
        SAEnum(ProposalStatus, native_enum=False), default=ProposalStatus.DRAFT, nullable=False
    )

    versions: Mapped[list["ProposalVersion"]] = relationship(
        back_populates="proposal", cascade="all, delete-orphan"
    )


class ProposalVersion(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "proposal_versions"

    proposal_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("proposals.id", ondelete="CASCADE"), index=True
    )
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    content: Mapped[dict] = mapped_column(JSONType, nullable=False)  # 섹션 구조 + 사실/가정 라벨
    export_urls: Mapped[Optional[dict]] = mapped_column(JSONType)       # pdf/pptx/docx/share

    proposal: Mapped[Proposal] = relationship(back_populates="versions")


class Campaign(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "campaigns"

    advertiser_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("advertisers.id", ondelete="CASCADE"), index=True
    )
    ad_product_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("ad_products.id", ondelete="SET NULL"), index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    period_start: Mapped[Optional[str]] = mapped_column(String(20))
    period_end: Mapped[Optional[str]] = mapped_column(String(20))
    contract_amount: Mapped[Optional[float]] = mapped_column(Numeric(18, 2))
    status: Mapped[CampaignStatus] = mapped_column(
        SAEnum(CampaignStatus, native_enum=False), default=CampaignStatus.PLANNED, nullable=False
    )
    creatives: Mapped[Optional[dict]] = mapped_column(JSONType)

    performances: Mapped[list["CampaignPerformance"]] = relationship(
        back_populates="campaign", cascade="all, delete-orphan"
    )


class CampaignPerformance(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "campaign_performances"

    campaign_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("campaigns.id", ondelete="CASCADE"), index=True
    )
    period: Mapped[Optional[str]] = mapped_column(String(20))
    impressions: Mapped[Optional[int]] = mapped_column(Integer)
    clicks: Mapped[Optional[int]] = mapped_column(Integer)
    ctr: Mapped[Optional[float]] = mapped_column(Numeric(6, 3))
    conversions: Mapped[Optional[int]] = mapped_column(Integer)
    cvr: Mapped[Optional[float]] = mapped_column(Numeric(6, 3))
    revenue: Mapped[Optional[float]] = mapped_column(Numeric(18, 2))
    roas: Mapped[Optional[float]] = mapped_column(Numeric(8, 2))
    roi: Mapped[Optional[float]] = mapped_column(Numeric(8, 2))
    analysis: Mapped[Optional[dict]] = mapped_column(JSONType)  # Performance Analysis Agent 결과

    campaign: Mapped[Campaign] = relationship(back_populates="performances")


class RenewalRecommendation(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "renewal_recommendations"

    campaign_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("campaigns.id", ondelete="CASCADE"), index=True
    )
    likelihood: Mapped[RenewalLikelihood] = mapped_column(
        SAEnum(RenewalLikelihood, native_enum=False), nullable=False
    )
    score: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)  # 0..100
    rationale: Mapped[Optional[str]] = mapped_column(String(1000))


class UpsellRecommendation(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "upsell_recommendations"

    campaign_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("campaigns.id", ondelete="CASCADE"), index=True
    )
    target_ad_product_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("ad_products.id", ondelete="SET NULL")
    )
    reason: Mapped[Optional[str]] = mapped_column(String(1000))
