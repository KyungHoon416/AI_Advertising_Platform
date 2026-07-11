"""Market research, competitor, advertiser-discovery, and pipeline endpoints."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.application import pipeline
from app.application.agents import category_agent, competitor_agent, discovery_agent, market_agent
from app.infrastructure.db.models import Competitor, MarketResearch
from app.interface.deps import get_db, require_permission
from app.interface.schemas.advertiser import AdvertiserRead
from app.interface.schemas.analysis import (
    CategoryIdRequest,
    ClassifyRequest,
    ClassifyResponse,
    CompetitorAnalysisRead,
    CompetitorRead,
    MarketResearchRead,
    PipelineResult,
)

router = APIRouter(prefix="/api/v1", tags=["ai-agents"])


def _enum(v) -> str:
    return v.value if hasattr(v, "value") else str(v)


# ---- Category Classification ----
@router.post("/agents/classify-category", response_model=ClassifyResponse,
             dependencies=[Depends(require_permission("analysis", "run"))])
async def classify_category(body: ClassifyRequest, db: AsyncSession = Depends(get_db)) -> ClassifyResponse:
    data, provider, is_fb = await category_agent.classify(db, body.text)
    return ClassifyResponse(result=data, generated_by=provider, is_fallback=is_fb)


# ---- Market Research ----
@router.post("/market-research/run", response_model=MarketResearchRead,
             dependencies=[Depends(require_permission("analysis", "run"))])
async def run_market_research(body: CategoryIdRequest, db: AsyncSession = Depends(get_db)) -> MarketResearchRead:
    try:
        row = await market_agent.research(db, body.category_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return MarketResearchRead.model_validate(row, from_attributes=True)


@router.get("/market-research", response_model=list[MarketResearchRead],
            dependencies=[Depends(require_permission("advertiser", "read"))])
async def list_market_research(
    category_id: uuid.UUID = Query(...), db: AsyncSession = Depends(get_db)
) -> list[MarketResearchRead]:
    rows = list((await db.execute(
        select(MarketResearch).where(MarketResearch.category_id == category_id)
        .order_by(MarketResearch.created_at.desc())
    )).scalars().all())
    return [MarketResearchRead.model_validate(r, from_attributes=True) for r in rows]


# ---- Competitors ----
@router.post("/competitors/discover", response_model=list[CompetitorRead],
             dependencies=[Depends(require_permission("analysis", "run"))])
async def discover_competitors(body: CategoryIdRequest, db: AsyncSession = Depends(get_db)) -> list[CompetitorRead]:
    try:
        rows = await competitor_agent.discover(db, body.category_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return [CompetitorRead(id=r.id, category_id=r.category_id, company=r.company,
                           brand=r.brand, type=_enum(r.type)) for r in rows]


@router.get("/competitors", response_model=list[CompetitorRead],
            dependencies=[Depends(require_permission("advertiser", "read"))])
async def list_competitors(
    category_id: uuid.UUID = Query(...), db: AsyncSession = Depends(get_db)
) -> list[CompetitorRead]:
    rows = list((await db.execute(
        select(Competitor).where(Competitor.category_id == category_id)
    )).scalars().all())
    return [CompetitorRead(id=r.id, category_id=r.category_id, company=r.company,
                           brand=r.brand, type=_enum(r.type)) for r in rows]


@router.post("/competitors/{competitor_id}/analyze", response_model=CompetitorAnalysisRead,
             dependencies=[Depends(require_permission("analysis", "run"))])
async def analyze_competitor(competitor_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> CompetitorAnalysisRead:
    try:
        a = await competitor_agent.analyze(db, competitor_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return CompetitorAnalysisRead.model_validate(a, from_attributes=True)


# ---- Advertiser Discovery ----
@router.post("/discovery/advertisers", response_model=list[AdvertiserRead],
             dependencies=[Depends(require_permission("analysis", "run"))])
async def discover_advertisers(body: CategoryIdRequest, db: AsyncSession = Depends(get_db)) -> list[AdvertiserRead]:
    try:
        rows = await discovery_agent.discover_advertisers(db, body.category_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return [AdvertiserRead.model_validate(r) for r in rows]


# ---- Pipeline ----
@router.post("/pipeline/run", response_model=PipelineResult,
             dependencies=[Depends(require_permission("analysis", "run"))])
async def run_pipeline(body: CategoryIdRequest, db: AsyncSession = Depends(get_db)) -> PipelineResult:
    result = await pipeline.run_sales_pipeline(db, body.category_id)
    return PipelineResult(**result)
