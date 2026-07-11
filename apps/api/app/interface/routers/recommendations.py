"""Ad-product recommendation endpoints."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.application import recommendation_service
from app.application.recommendation_service import RecommendationError
from app.infrastructure.db.models import AdProduct, AdProductRecommendation
from app.interface.deps import get_db, require_permission
from app.interface.schemas.recommendation import (
    ComboRead,
    RecItemRead,
    RecommendationRead,
    RecommendationRequest,
)

router = APIRouter(prefix="/api/v1/recommendations", tags=["recommendations"])


async def _product_code_map(db: AsyncSession) -> dict[uuid.UUID, str]:
    products = list((await db.execute(select(AdProduct))).scalars().all())
    return {p.id: (p.code.value if hasattr(p.code, "value") else p.code) for p in products}


def _to_read(rec: AdProductRecommendation, code_map: dict) -> RecommendationRead:
    combo = None
    if rec.combo:
        combo = ComboRead(
            name=rec.combo.get("name", ""),
            product_codes=rec.combo.get("product_codes", []),
            roles=rec.combo.get("roles", {}),
        )
    items = sorted(rec.items, key=lambda i: (i.rank is None, i.rank or 0, -float(i.fit_score)))
    return RecommendationRead(
        id=rec.id, advertiser_id=rec.advertiser_id, purpose=rec.purpose,
        budget=float(rec.budget) if rec.budget is not None else None,
        combo=combo, confidence=float(rec.confidence) if rec.confidence is not None else None,
        items=[
            RecItemRead(
                ad_product_id=i.ad_product_id, product_code=code_map.get(i.ad_product_id),
                rank=i.rank, fit_score=float(i.fit_score), reason=i.reason, role=i.role,
                est_metrics=i.est_metrics,
            )
            for i in items
        ],
    )


@router.post(
    "/ad-products", response_model=RecommendationRead,
    dependencies=[Depends(require_permission("analysis", "run"))],
)
async def recommend_ad_products(
    body: RecommendationRequest, db: AsyncSession = Depends(get_db)
) -> RecommendationRead:
    try:
        rec, _ = await recommendation_service.compute_and_store(
            db, body.advertiser_id, body.purpose, body.budget
        )
    except RecommendationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    # reload with items
    rec = (
        await db.execute(
            select(AdProductRecommendation)
            .options(selectinload(AdProductRecommendation.items))
            .where(AdProductRecommendation.id == rec.id)
        )
    ).scalar_one()
    return _to_read(rec, await _product_code_map(db))


@router.get(
    "/{recommendation_id}", response_model=RecommendationRead,
    dependencies=[Depends(require_permission("advertiser", "read"))],
)
async def get_recommendation(
    recommendation_id: uuid.UUID, db: AsyncSession = Depends(get_db)
) -> RecommendationRead:
    rec = (
        await db.execute(
            select(AdProductRecommendation)
            .options(selectinload(AdProductRecommendation.items))
            .where(AdProductRecommendation.id == recommendation_id)
        )
    ).scalar_one_or_none()
    if rec is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="recommendation not found")
    return _to_read(rec, await _product_code_map(db))
