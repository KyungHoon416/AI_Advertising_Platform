"""Scoring schemas (explainable breakdown)."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ScoreFactorRead(BaseModel):
    code: str
    label: str
    score: float
    max_score: int
    rationale: str
    data_refs: Optional[dict] = None
    is_inference: bool
    confidence: float


class ScoreRead(BaseModel):
    id: uuid.UUID
    advertiser_id: uuid.UUID
    scoring_version_id: uuid.UUID
    total_score: float
    grade: str
    confidence: float
    computed_at: Optional[datetime] = None
    factors: list[ScoreFactorRead]


class ScoringConfigFactor(BaseModel):
    target: str
    factor_code: str
    label: str
    max_score: int
    weight: float


class ScoringConfigRead(BaseModel):
    version: str
    status: str
    factors: list[ScoringConfigFactor]


class ScoringVersionRead(BaseModel):
    id: uuid.UUID
    version: str
    status: str
    note: Optional[str] = None
