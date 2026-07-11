"""Catalog: Category (tree), AdProduct, AdProductCategoryRule, Benchmark."""
from __future__ import annotations

from typing import Optional

import uuid

from sqlalchemy import Boolean, Enum as SAEnum, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.enums import AdProductCode, CategoryLevel
from app.infrastructure.db.base import Base, JSONType, TimestampMixin, UUIDMixin


class Category(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "categories"

    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"), index=True
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    level: Mapped[CategoryLevel] = mapped_column(SAEnum(CategoryLevel, native_enum=False))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # 핵심고객·연령·지역·계절성·경쟁강도·평균객단가 등 카테고리 분석 속성
    attributes: Mapped[Optional[dict]] = mapped_column(JSONType)

    parent: Mapped[Optional["Category"]] = relationship(
        remote_side="Category.id", backref="children"
    )


class AdProduct(UUIDMixin, TimestampMixin, Base):
    """놀이의발견 자체 광고상품 (메인/서브/카테고리/스플래쉬)."""

    __tablename__ = "ad_products"

    code: Mapped[AdProductCode] = mapped_column(
        SAEnum(AdProductCode, native_enum=False), unique=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    definition: Mapped[Optional[str]] = mapped_column(String(500))
    features: Mapped[Optional[dict]] = mapped_column(JSONType)      # 주요 특징[]
    fit_purposes: Mapped[Optional[dict]] = mapped_column(JSONType)  # 적합 광고 목적[]
    base_price_band: Mapped[Optional[str]] = mapped_column(String(60))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    rules: Mapped[list["AdProductCategoryRule"]] = relationship(
        back_populates="ad_product", cascade="all, delete-orphan"
    )


class AdProductCategoryRule(UUIDMixin, TimestampMixin, Base):
    """상품별 가점 규칙 (조건 매칭 시 특정 평가항목 boost)."""

    __tablename__ = "ad_product_category_rules"

    ad_product_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ad_products.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    condition: Mapped[dict] = mapped_column(JSONType, nullable=False)  # 매칭 조건
    boost_factor: Mapped[str] = mapped_column(String(20), nullable=False)  # 대상 평가항목 코드
    boost_points: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    ad_product: Mapped[AdProduct] = relationship(back_populates="rules")


class Benchmark(UUIDMixin, TimestampMixin, Base):
    """카테고리 × 광고상품 별 평균 성과 벤치마크 (예상 성과 산출 근거)."""

    __tablename__ = "benchmarks"

    category_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"), index=True
    )
    ad_product_code: Mapped[AdProductCode] = mapped_column(
        SAEnum(AdProductCode, native_enum=False)
    )
    avg_ctr: Mapped[Optional[float]] = mapped_column(Numeric(6, 3))
    avg_cvr: Mapped[Optional[float]] = mapped_column(Numeric(6, 3))
    avg_cpm: Mapped[Optional[float]] = mapped_column(Numeric(12, 2))
    avg_order_value: Mapped[Optional[float]] = mapped_column(Numeric(12, 2))
    industry_avg_roi: Mapped[Optional[float]] = mapped_column(Numeric(8, 2))
