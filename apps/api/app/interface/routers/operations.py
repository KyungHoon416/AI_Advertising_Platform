"""Campaign / performance / ROI / renewal endpoints (operational workflow)."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.application.agents import performance_agent, renewal_agent, roi_agent
from app.application.agents.renewal_agent import RenewalError
from app.infrastructure.db.models import (
    AdProduct,
    Campaign,
    CampaignPerformance,
    RenewalRecommendation,
    UpsellRecommendation,
)
from app.interface.deps import get_db, require_permission
from app.interface.schemas.operations import (
    CampaignRead,
    PerformanceCreate,
    PerformanceRead,
    RenewalRead,
    RoiRequest,
)

router = APIRouter(prefix="/api/v1", tags=["operations"])


def _enum(v) -> str:
    return v.value if hasattr(v, "value") else str(v)


def _perf_read(p: CampaignPerformance) -> PerformanceRead:
    return PerformanceRead(
        id=p.id, campaign_id=p.campaign_id, period=p.period, impressions=p.impressions,
        clicks=p.clicks, ctr=float(p.ctr) if p.ctr is not None else None,
        conversions=p.conversions, cvr=float(p.cvr) if p.cvr is not None else None,
        revenue=float(p.revenue) if p.revenue is not None else None,
        roas=float(p.roas) if p.roas is not None else None,
        roi=float(p.roi) if p.roi is not None else None, analysis=p.analysis,
    )


def _campaign_read(c: Campaign) -> CampaignRead:
    return CampaignRead(
        id=c.id, advertiser_id=c.advertiser_id, ad_product_id=c.ad_product_id, name=c.name,
        period_start=c.period_start, period_end=c.period_end,
        contract_amount=float(c.contract_amount) if c.contract_amount is not None else None,
        status=_enum(c.status),
        performances=[_perf_read(p) for p in sorted(c.performances, key=lambda x: x.period or "")],
    )


@router.get("/campaigns", response_model=list[CampaignRead],
            dependencies=[Depends(require_permission("campaign", "read"))])
async def list_campaigns(db: AsyncSession = Depends(get_db)) -> list[CampaignRead]:
    rows = list((await db.execute(
        select(Campaign).options(selectinload(Campaign.performances))
    )).scalars().all())
    return [_campaign_read(c) for c in rows]


@router.post("/campaigns/{campaign_id}/performance", response_model=PerformanceRead,
             dependencies=[Depends(require_permission("performance", "manage"))])
async def add_performance(
    campaign_id: uuid.UUID, body: PerformanceCreate, db: AsyncSession = Depends(get_db)
) -> PerformanceRead:
    campaign = (await db.execute(select(Campaign).where(Campaign.id == campaign_id))).scalar_one_or_none()
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="campaign not found")
    perf = CampaignPerformance(
        campaign_id=campaign_id, period=body.period, impressions=body.impressions,
        clicks=body.clicks, conversions=body.conversions, revenue=body.revenue,
    )
    db.add(perf)
    await db.commit()
    await db.refresh(perf)
    return _perf_read(perf)


@router.post("/performance/{performance_id}/analyze", response_model=PerformanceRead,
             dependencies=[Depends(require_permission("analysis", "run"))])
async def analyze_performance(
    performance_id: uuid.UUID, db: AsyncSession = Depends(get_db)
) -> PerformanceRead:
    try:
        perf = await performance_agent.analyze(db, performance_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return _perf_read(perf)


@router.post("/roi/analyze", dependencies=[Depends(require_permission("analysis", "run"))])
async def analyze_roi(body: RoiRequest, db: AsyncSession = Depends(get_db)) -> dict:
    return await roi_agent.analyze(
        db, partner_name=body.partner_name, impressions=body.impressions, clicks=body.clicks,
        conversions=body.conversions, spend=body.spend, revenue=body.revenue,
    )


@router.post("/renewal/{campaign_id}", response_model=RenewalRead,
             dependencies=[Depends(require_permission("analysis", "run"))])
async def recommend_renewal(campaign_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> RenewalRead:
    try:
        rec, upsell = await renewal_agent.recommend(db, campaign_id)
    except RenewalError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    up_code = None
    if upsell and upsell.target_ad_product_id:
        prod = (await db.execute(
            select(AdProduct).where(AdProduct.id == upsell.target_ad_product_id)
        )).scalar_one_or_none()
        up_code = _enum(prod.code) if prod else None
    return RenewalRead(
        id=rec.id, campaign_id=rec.campaign_id, likelihood=_enum(rec.likelihood),
        score=float(rec.score), rationale=rec.rationale,
        upsell_product_code=up_code, upsell_reason=upsell.reason if upsell else None,
    )


@router.get("/renewal", response_model=list[RenewalRead],
            dependencies=[Depends(require_permission("campaign", "read"))])
async def list_renewals(
    campaign_id: uuid.UUID = Query(...), db: AsyncSession = Depends(get_db)
) -> list[RenewalRead]:
    rows = list((await db.execute(
        select(RenewalRecommendation).where(RenewalRecommendation.campaign_id == campaign_id)
        .order_by(RenewalRecommendation.created_at.desc())
    )).scalars().all())
    return [
        RenewalRead(id=r.id, campaign_id=r.campaign_id, likelihood=_enum(r.likelihood),
                    score=float(r.score), rationale=r.rationale)
        for r in rows
    ]
