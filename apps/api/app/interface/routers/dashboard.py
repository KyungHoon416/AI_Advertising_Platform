"""Dashboard KPI endpoint."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import AdvertiserSource, Grade
from app.infrastructure.db.models import (
    AdvertiserScore,
    Advertiser,
    Campaign,
    Competitor,
    Proposal,
)
from app.interface.deps import get_db, require_permission

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


async def _count(db: AsyncSession, stmt) -> int:
    return int((await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one())


@router.get("/kpis", dependencies=[Depends(require_permission("dashboard", "read"))])
async def kpis(db: AsyncSession = Depends(get_db)) -> dict:
    total_advertisers = await _count(db, select(Advertiser.id))
    discovered = await _count(
        db, select(Advertiser.id).where(Advertiser.source == AdvertiserSource.DISCOVERY)
    )
    high_score = await _count(
        db, select(AdvertiserScore.id).where(AdvertiserScore.grade.in_([Grade.S, Grade.A]))
    )
    scored = await _count(db, select(AdvertiserScore.advertiser_id.distinct()))
    proposals = await _count(db, select(Proposal.id))
    competitors = await _count(db, select(Competitor.id))
    campaigns = await _count(db, select(Campaign.id))
    return {
        "total_advertisers": total_advertisers,
        "discovered_advertisers": discovered,
        "high_score_advertisers": high_score,
        "scored_advertisers": scored,
        "proposals": proposals,
        "competitors": competitors,
        "campaigns": campaigns,
    }
