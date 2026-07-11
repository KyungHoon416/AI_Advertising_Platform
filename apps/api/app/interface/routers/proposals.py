"""Proposal generation endpoints."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.application import proposal_service
from app.application.proposal_service import ProposalError
from app.infrastructure.db.models import Proposal, ProposalVersion
from app.interface.deps import get_db, require_permission
from app.interface.schemas.proposal import ProposalGenerateRequest, ProposalRead

router = APIRouter(prefix="/api/v1/proposals", tags=["proposals"])


def _grade(s) -> str:
    return s.value if hasattr(s, "value") else str(s)


@router.post(
    "/generate", response_model=ProposalRead,
    dependencies=[Depends(require_permission("proposal", "manage"))],
)
async def generate_proposal(
    body: ProposalGenerateRequest, db: AsyncSession = Depends(get_db)
) -> ProposalRead:
    try:
        proposal, version, generated_by = await proposal_service.generate(
            db, body.advertiser_id, body.purpose, body.budget
        )
    except ProposalError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return ProposalRead(
        id=proposal.id, advertiser_id=proposal.advertiser_id, title=proposal.title,
        status=_grade(proposal.status), version=version.version,
        generated_by=generated_by, content=version.content,
    )


@router.get(
    "/{proposal_id}", response_model=ProposalRead,
    dependencies=[Depends(require_permission("proposal", "manage"))],
)
async def get_proposal(proposal_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> ProposalRead:
    proposal = (
        await db.execute(
            select(Proposal).options(selectinload(Proposal.versions))
            .where(Proposal.id == proposal_id)
        )
    ).scalar_one_or_none()
    if proposal is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="proposal not found")
    latest = max(proposal.versions, key=lambda v: v.version)
    return ProposalRead(
        id=proposal.id, advertiser_id=proposal.advertiser_id, title=proposal.title,
        status=_grade(proposal.status), version=latest.version,
        generated_by="stored", content=latest.content,
    )
