"""Application service: compute & persist ad-product recommendations."""
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.application import feature_builder
from app.domain.recommendation.engine import estimate_metrics, recommend
from app.domain.recommendation.models import ProductFactorDefinition, RecommendationResult
from app.infrastructure.db.models import (
    AdProduct,
    AdProductCategoryRule,
    AdProductRecItem,
    AdProductRecommendation,
    Advertiser,
    Benchmark,
    Category,
    ScoreFactorDef,
    ScoringVersion,
)

_DEFAULT_BUDGET = 10_000_000.0
_FALLBACK_BM = {"avg_ctr": 2.0, "avg_cvr": 5.0, "avg_cpm": 8000.0, "avg_order_value": 40000.0}


class RecommendationError(Exception):
    pass


async def compute_and_store(
    db: AsyncSession,
    advertiser_id: uuid.UUID,
    purpose: str | None = None,
    budget: float | None = None,
) -> tuple[AdProductRecommendation, RecommendationResult]:
    advertiser = (
        await db.execute(select(Advertiser).where(Advertiser.id == advertiser_id))
    ).scalar_one_or_none()
    if advertiser is None:
        raise RecommendationError("advertiser not found")

    category_name = None
    if advertiser.primary_category_id:
        cat = (
            await db.execute(select(Category).where(Category.id == advertiser.primary_category_id))
        ).scalar_one_or_none()
        category_name = cat.name if cat else None

    version = (
        await db.execute(
            select(ScoringVersion).where(ScoringVersion.status == "active")
            .order_by(ScoringVersion.created_at.desc())
        )
    ).scalars().first()
    if version is None:
        raise RecommendationError("no active scoring version")

    defs_rows = list((await db.execute(
        select(ScoreFactorDef)
        .where(ScoreFactorDef.scoring_version_id == version.id)
        .where(ScoreFactorDef.target == "ad_product")
        .where(ScoreFactorDef.is_active.is_(True))
    )).scalars().all())
    if not defs_rows:
        raise RecommendationError("scoring config has no ad_product factors")
    definitions = [ProductFactorDefinition(d.factor_code, d.label, d.max_score) for d in defs_rows]

    # products & rules
    products = list((await db.execute(select(AdProduct))).scalars().all())
    code_to_id = {p.code.value if hasattr(p.code, "value") else p.code: p.id for p in products}
    rule_rows = list((await db.execute(select(AdProductCategoryRule))).scalars().all())
    prod_id_to_code = {p.id: (p.code.value if hasattr(p.code, "value") else p.code) for p in products}
    rules = [
        {"product_code": prod_id_to_code.get(r.ad_product_id), "condition": r.condition,
         "boost_points": r.boost_points}
        for r in rule_rows
    ]

    # benchmarks per product for category
    bm_by_product: dict[str, dict] = {}
    if advertiser.primary_category_id:
        bms = list((await db.execute(
            select(Benchmark).where(Benchmark.category_id == advertiser.primary_category_id)
        )).scalars().all())
        for b in bms:
            code = b.ad_product_code.value if hasattr(b.ad_product_code, "value") else b.ad_product_code
            bm_by_product[code] = {
                "avg_ctr": float(b.avg_ctr or 0), "avg_cvr": float(b.avg_cvr or 0),
                "avg_cpm": float(b.avg_cpm or 0) or _FALLBACK_BM["avg_cpm"],
                "avg_order_value": float(b.avg_order_value or 0) or _FALLBACK_BM["avg_order_value"],
            }

    features = feature_builder.build_product_features(
        category_name=category_name,
        budget_band=advertiser.budget_band,
        size=advertiser.size,
        purpose=purpose,
        category_match=advertiser.primary_category_id is not None,
        benchmark_products=set(bm_by_product.keys()),
        rules=rules,
    )
    result = recommend(definitions, features, purpose, budget, advertiser.size)

    eff_budget = budget if budget else _DEFAULT_BUDGET
    rec = AdProductRecommendation(
        advertiser_id=advertiser.id, purpose=purpose, budget=eff_budget,
        combo={"name": result.combo.name, "product_codes": result.combo.product_codes,
               "roles": result.combo.roles},
        confidence=result.confidence,
    )
    db.add(rec)
    await db.flush()

    for idx, ps in enumerate(result.ranked):
        bm = bm_by_product.get(ps.product_code) or _FALLBACK_BM
        est = estimate_metrics(
            eff_budget, bm["avg_ctr"], bm["avg_cvr"], bm["avg_cpm"], bm["avg_order_value"]
        )
        db.add(AdProductRecItem(
            recommendation_id=rec.id,
            ad_product_id=code_to_id[ps.product_code],
            rank=(idx + 1) if idx < 2 else None,
            fit_score=ps.fit_score,
            reason=ps.reason,
            role=result.combo.roles.get(ps.product_code),
            est_metrics={
                "impressions": est.impressions, "clicks": est.clicks, "ctr": est.ctr,
                "conversions": est.conversions, "cvr": est.cvr, "revenue": est.revenue,
                "roi": est.roi,
            },
        ))
    await db.commit()
    await db.refresh(rec)
    return rec, result
