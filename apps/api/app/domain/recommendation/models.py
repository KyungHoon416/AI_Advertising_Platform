"""Value objects for the ad-product recommendation engine (pure)."""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class ProductFactorDefinition:
    code: str          # GOAL/CAT/AUD/BDG/EXPO/TIME/HIST
    label: str
    max_score: int


@dataclass(frozen=True)
class ProductFeature:
    """Per-product normalized factor values (0..1) + optional rule boost."""

    product_code: str
    values: dict         # factor_code -> 0..1
    boost_points: float = 0.0
    reason: str = ""


@dataclass(frozen=True)
class EstimatedMetrics:
    impressions: int
    clicks: int
    ctr: float
    conversions: int
    cvr: float
    revenue: float
    roi: float


@dataclass(frozen=True)
class ProductScore:
    product_code: str
    fit_score: float
    reason: str
    est_metrics: EstimatedMetrics | None = None


@dataclass(frozen=True)
class Combo:
    name: str
    product_codes: list[str]
    roles: dict = field(default_factory=dict)  # product_code -> role


@dataclass(frozen=True)
class RecommendationResult:
    ranked: list[ProductScore]     # desc by fit_score
    combo: Combo
    confidence: float
