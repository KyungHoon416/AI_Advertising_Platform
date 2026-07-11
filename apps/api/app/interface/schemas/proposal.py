"""Proposal schemas."""
from __future__ import annotations

import uuid
from typing import Optional

from pydantic import BaseModel


class ProposalGenerateRequest(BaseModel):
    advertiser_id: uuid.UUID
    purpose: Optional[str] = None
    budget: Optional[float] = None


class ProposalRead(BaseModel):
    id: uuid.UUID
    advertiser_id: uuid.UUID
    title: str
    status: str
    version: int
    generated_by: str
    content: dict
