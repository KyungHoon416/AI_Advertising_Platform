"""Scoring endpoints: compute, fetch latest, config & versions."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.application import scoring_service
from app.application.scoring_service import ScoringError
from app.infrastructure.db.models import AdvertiserScore, ScoreFactorDef, ScoringVersion
from app.interface.deps import get_db, require_permission
from app.interface.schemas.scoring import (
    ScoreFactorRead,
    ScoreRead,
    ScoringConfigFactor,
    ScoringConfigRead,
    ScoringVersionRead,
)

router = APIRouter(prefix="/api/v1/scoring", tags=["scoring"])


def _grade_str(g) -> str:
    return g.value if hasattr(g, "value") else str(g)


@router.post(
    "/advertisers/{advertiser_id}", response_model=ScoreRead,
    dependencies=[Depends(require_permission("analysis", "run"))],
)
async def compute_score(advertiser_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> ScoreRead:
    try:
        score, result = await scoring_service.compute_and_store(db, advertiser_id)
    except ScoringError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return ScoreRead(
        id=score.id, advertiser_id=score.advertiser_id,
        scoring_version_id=score.scoring_version_id,
        total_score=float(score.total_score), grade=_grade_str(score.grade),
        confidence=float(score.confidence or 0), computed_at=score.computed_at,
        factors=[
            ScoreFactorRead(
                code=f.code, label=f.label, score=f.score, max_score=f.max_score,
                rationale=f.rationale, data_refs=f.data_refs,
                is_inference=f.is_inference, confidence=f.confidence,
            )
            for f in result.factors
        ],
    )


@router.get(
    "/advertisers/{advertiser_id}", response_model=ScoreRead,
    dependencies=[Depends(require_permission("advertiser", "read"))],
)
async def latest_score(advertiser_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> ScoreRead:
    stmt = (
        select(AdvertiserScore)
        .options(selectinload(AdvertiserScore.factors))
        .where(AdvertiserScore.advertiser_id == advertiser_id)
        .order_by(AdvertiserScore.computed_at.desc())
    )
    score = (await db.execute(stmt)).scalars().first()
    if score is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="no score computed yet")
    return ScoreRead(
        id=score.id, advertiser_id=score.advertiser_id,
        scoring_version_id=score.scoring_version_id,
        total_score=float(score.total_score), grade=_grade_str(score.grade),
        confidence=float(score.confidence or 0), computed_at=score.computed_at,
        factors=[
            ScoreFactorRead(
                code=f.factor_code, label=f.label, score=float(f.score), max_score=f.max_score,
                rationale=f.rationale or "", data_refs=f.data_refs,
                is_inference=f.is_inference, confidence=float(f.confidence or 0),
            )
            for f in score.factors
        ],
    )


@router.get(
    "/config", response_model=ScoringConfigRead,
    dependencies=[Depends(require_permission("scoring_config", "read"))],
)
async def scoring_config(db: AsyncSession = Depends(get_db)) -> ScoringConfigRead:
    version = (
        await db.execute(
            select(ScoringVersion).where(ScoringVersion.status == "active")
            .order_by(ScoringVersion.created_at.desc())
        )
    ).scalars().first()
    if version is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="no active version")
    defs = list((await db.execute(
        select(ScoreFactorDef).where(ScoreFactorDef.scoring_version_id == version.id)
    )).scalars().all())
    return ScoringConfigRead(
        version=version.version, status=_grade_str(version.status),
        factors=[
            ScoringConfigFactor(
                target=d.target, factor_code=d.factor_code, label=d.label,
                max_score=d.max_score, weight=float(d.weight),
            )
            for d in defs
        ],
    )


@router.get(
    "/versions", response_model=list[ScoringVersionRead],
    dependencies=[Depends(require_permission("scoring_config", "read"))],
)
async def scoring_versions(db: AsyncSession = Depends(get_db)) -> list[ScoringVersionRead]:
    rows = list((await db.execute(select(ScoringVersion))).scalars().all())
    return [
        ScoringVersionRead(id=v.id, version=v.version, status=_grade_str(v.status), note=v.note)
        for v in rows
    ]
