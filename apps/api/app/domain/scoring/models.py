"""Value objects for the advertiser scoring engine (pure, framework-free)."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


@dataclass(frozen=True)
class FactorDefinition:
    """One evaluation factor from ScoringConfig (e.g. MKT, max 15)."""

    code: str
    label: str
    max_score: int
    weight: float = 1.0


@dataclass(frozen=True)
class FactorInput:
    """Normalized signal for a factor: value in [0,1] + explainability."""

    code: str
    value: float  # 0..1
    rationale: str = ""
    data_refs: dict = field(default_factory=dict)
    is_inference: bool = False
    confidence: float = 100.0  # %


@dataclass(frozen=True)
class FactorResult:
    code: str
    label: str
    score: float
    max_score: int
    rationale: str
    data_refs: dict
    is_inference: bool
    confidence: float


@dataclass(frozen=True)
class ScoreResult:
    total: float
    grade: str
    confidence: float
    factors: list[FactorResult]


# (min_inclusive_total, grade) — highest first. Config-overridable.
DEFAULT_GRADE_THRESHOLDS: tuple[tuple[float, str], ...] = (
    (90.0, "S"),
    (80.0, "A"),
    (70.0, "B"),
    (60.0, "C"),
    (0.0, "D"),
)
