"""Application service: compute & persist advertiser scores (explainable)."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.application import feature_builder
from app.domain.scoring.engine import score_advertiser
from app.domain.scoring.models import FactorDefinition, ScoreResult
from app.infrastructure.db.models import (
    Advertiser,
    AdvertiserScore,
    BehaviorAggregate,
    Benchmark,
    Category,
    PurchaseAggregate,
    ScoreFactor,
    ScoreFactorDef,
    ScoringVersion,
)


class ScoringError(Exception):
    pass


async def _active_version(db: AsyncSession) -> ScoringVersion:
    stmt = (
        select(ScoringVersion)
        .where(ScoringVersion.status == "active")
        .order_by(ScoringVersion.created_at.desc())
    )
    version = (await db.execute(stmt)).scalars().first()
    if version is None:
        raise ScoringError("no active scoring version")
    return version


async def _advertiser_factor_defs(db: AsyncSession, version_id: uuid.UUID) -> list[ScoreFactorDef]:
    stmt = (
        select(ScoreFactorDef)
        .where(ScoreFactorDef.scoring_version_id == version_id)
        .where(ScoreFactorDef.target == "advertiser")
        .where(ScoreFactorDef.is_active.is_(True))
    )
    return list((await db.execute(stmt)).scalars().all())


async def compute_and_store(db: AsyncSession, advertiser_id: uuid.UUID) -> tuple[AdvertiserScore, ScoreResult]:
    advertiser = (
        await db.execute(select(Advertiser).where(Advertiser.id == advertiser_id))
    ).scalar_one_or_none()
    if advertiser is None:
        raise ScoringError("advertiser not found")

    category_name = None
    if advertiser.primary_category_id:
        cat = (
            await db.execute(select(Category).where(Category.id == advertiser.primary_category_id))
        ).scalar_one_or_none()
        category_name = cat.name if cat else None

    version = await _active_version(db)
    defs = await _advertiser_factor_defs(db, version.id)
    if not defs:
        raise ScoringError("scoring config has no advertiser factors")

    behavior = (
        await db.execute(select(BehaviorAggregate).where(BehaviorAggregate.category == category_name))
    ).scalars().first()
    purchase = (
        await db.execute(select(PurchaseAggregate).where(PurchaseAggregate.category == category_name))
    ).scalars().first()
    benchmark = None
    if advertiser.primary_category_id:
        benchmark = (
            await db.execute(
                select(Benchmark).where(Benchmark.category_id == advertiser.primary_category_id)
            )
        ).scalars().first()

    inputs = feature_builder.build_advertiser_inputs(
        category_name=category_name,
        budget_band=advertiser.budget_band,
        size=advertiser.size,
        behavior_agg=_agg_dict(behavior),
        purchase_agg=_agg_dict(purchase),
        benchmark=_bm_dict(benchmark),
    )
    definitions = [FactorDefinition(d.factor_code, d.label, d.max_score, float(d.weight)) for d in defs]
    result = score_advertiser(definitions, inputs)

    score = AdvertiserScore(
        advertiser_id=advertiser.id,
        scoring_version_id=version.id,
        total_score=result.total,
        grade=result.grade,
        confidence=result.confidence,
        computed_at=datetime.now(timezone.utc),
    )
    db.add(score)
    await db.flush()
    for fr in result.factors:
        db.add(ScoreFactor(
            advertiser_score_id=score.id, factor_code=fr.code, label=fr.label,
            score=fr.score, max_score=fr.max_score, rationale=fr.rationale,
            data_refs=fr.data_refs, is_inference=fr.is_inference, confidence=fr.confidence,
        ))
    await db.commit()
    await db.refresh(score)
    return score, result


def _agg_dict(row) -> dict | None:
    if row is None:
        return None
    return {
        "view_count": row.view_count or 0 if hasattr(row, "view_count") else 0,
        "purchase_count": getattr(row, "purchase_count", 0) or 0,
        "repurchase_rate": float(getattr(row, "repurchase_rate", 0) or 0),
    }


def _bm_dict(row: Benchmark | None) -> dict | None:
    if row is None:
        return None
    return {
        "avg_ctr": float(row.avg_ctr or 0),
        "avg_cvr": float(row.avg_cvr or 0),
        "avg_cpm": float(row.avg_cpm or 0),
        "avg_order_value": float(row.avg_order_value or 0),
    }
