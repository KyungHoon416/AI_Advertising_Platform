"""Config-driven scoring: versions, factor definitions, results & breakdown."""
from __future__ import annotations

from typing import Optional

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Integer,
    Numeric,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.enums import CalcMethod, Grade, ScoringVersionStatus
from app.infrastructure.db.base import Base, JSONType, TimestampMixin, UUIDMixin


class ScoringVersion(UUIDMixin, TimestampMixin, Base):
    """가중치 세트의 버전. 점수는 항상 특정 버전으로 태깅되어 재현 가능."""

    __tablename__ = "scoring_versions"

    version: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)  # e.g. v1
    status: Mapped[ScoringVersionStatus] = mapped_column(
        SAEnum(ScoringVersionStatus, native_enum=False),
        default=ScoringVersionStatus.DRAFT,
        nullable=False,
    )
    effective_from: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    note: Mapped[Optional[str]] = mapped_column(String(255))

    factor_defs: Mapped[list["ScoreFactorDef"]] = relationship(
        back_populates="scoring_version", cascade="all, delete-orphan"
    )


class ScoreFactorDef(UUIDMixin, TimestampMixin, Base):
    """평가항목 정의(항목·최대점·가중치·계산식·적용범위)."""

    __tablename__ = "score_factor_defs"

    scoring_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("scoring_versions.id", ondelete="CASCADE"), index=True
    )
    target: Mapped[str] = mapped_column(String(30), nullable=False)  # advertiser | ad_product
    factor_code: Mapped[str] = mapped_column(String(30), nullable=False)  # MKT/TGT/...
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    max_score: Mapped[int] = mapped_column(Integer, nullable=False)
    weight: Mapped[float] = mapped_column(Numeric(6, 3), default=1, nullable=False)
    calc_method: Mapped[CalcMethod] = mapped_column(
        SAEnum(CalcMethod, native_enum=False), default=CalcMethod.LINEAR
    )
    category_scope: Mapped[Optional[str]] = mapped_column(String(120))  # null=전체
    indicators: Mapped[Optional[dict]] = mapped_column(JSONType)  # 세부지표 구성
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    scoring_version: Mapped[ScoringVersion] = relationship(back_populates="factor_defs")


class AdvertiserScore(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "advertiser_scores"

    advertiser_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("advertisers.id", ondelete="CASCADE"), index=True
    )
    scoring_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("scoring_versions.id", ondelete="RESTRICT"), index=True
    )
    total_score: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    grade: Mapped[Grade] = mapped_column(SAEnum(Grade, native_enum=False), nullable=False)
    confidence: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))  # 데이터 신뢰도 %
    computed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    advertiser = relationship("Advertiser", back_populates="scores")
    factors: Mapped[list["ScoreFactor"]] = relationship(
        back_populates="advertiser_score", cascade="all, delete-orphan"
    )


class ScoreFactor(UUIDMixin, TimestampMixin, Base):
    """항목별 획득 점수 + 설명가능성(근거·사용데이터·사실/추론)."""

    __tablename__ = "score_factors"

    advertiser_score_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("advertiser_scores.id", ondelete="CASCADE"), index=True
    )
    factor_code: Mapped[str] = mapped_column(String(30), nullable=False)
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    score: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    max_score: Mapped[int] = mapped_column(Integer, nullable=False)
    rationale: Mapped[Optional[str]] = mapped_column(String(1000))
    data_refs: Mapped[Optional[dict]] = mapped_column(JSONType)  # 사용한 내부/외부 데이터 참조
    is_inference: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    confidence: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))

    advertiser_score: Mapped[AdvertiserScore] = relationship(back_populates="factors")
