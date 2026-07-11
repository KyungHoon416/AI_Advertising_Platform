"""Renewal & Upsell Agent — renewal likelihood + upsell product (persisted)."""
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain import roi as roi_calc
from app.domain.enums import RenewalLikelihood
from app.infrastructure.db.models import (
    AdProduct,
    Campaign,
    CampaignPerformance,
    RenewalRecommendation,
    UpsellRecommendation,
)


class RenewalError(Exception):
    pass


async def recommend(
    db: AsyncSession, campaign_id: uuid.UUID, target_revenue: float | None = None
) -> tuple[RenewalRecommendation, UpsellRecommendation | None]:
    campaign = (
        await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    ).scalar_one_or_none()
    if campaign is None:
        raise RenewalError("campaign not found")

    perf = (
        await db.execute(
            select(CampaignPerformance)
            .where(CampaignPerformance.campaign_id == campaign_id)
            .order_by(CampaignPerformance.created_at.desc())
        )
    ).scalars().first()
    if perf is None:
        raise RenewalError("no performance data for campaign")

    spend = float(campaign.contract_amount or 0)
    m = roi_calc.compute(
        int(perf.impressions or 0), int(perf.clicks or 0), int(perf.conversions or 0),
        spend, float(perf.revenue or 0),
    )
    tr = target_revenue or float(perf.revenue or 0)
    achievement = (float(perf.revenue or 0) / tr * 100) if tr else 100.0

    score = roi_calc.renewal_score(m.roi, m.cvr, achievement)
    likelihood = roi_calc.renewal_likelihood(score)
    rationale = (
        f"ROI {m.roi}% · CVR {m.cvr}% · 목표 달성률 {round(achievement, 1)}% 기준 "
        f"재계약 점수 {score}점({likelihood.upper()})."
    )
    rec = RenewalRecommendation(
        campaign_id=campaign.id, likelihood=RenewalLikelihood(likelihood),
        score=score, rationale=rationale,
    )
    db.add(rec)

    # Upsell: ladder from the campaign's current ad product.
    upsell = None
    products = list((await db.execute(select(AdProduct))).scalars().all())
    code_to_id = {(p.code.value if hasattr(p.code, "value") else p.code): p.id for p in products}
    id_to_code = {p.id: (p.code.value if hasattr(p.code, "value") else p.code) for p in products}
    if campaign.ad_product_id and score >= 40:
        current_code = id_to_code.get(campaign.ad_product_id)
        target_code = roi_calc.UPSELL_LADDER.get(current_code)
        target_id = code_to_id.get(target_code) if target_code else None
        if target_id:
            upsell = UpsellRecommendation(
                campaign_id=campaign.id, target_ad_product_id=target_id,
                reason=f"성과 우수({m.roi}% ROI) → {current_code} 대비 상위 지면 {target_code} 업셀 추천",
            )
            db.add(upsell)

    await db.commit()
    await db.refresh(rec)
    if upsell:
        await db.refresh(upsell)
    return rec, upsell
