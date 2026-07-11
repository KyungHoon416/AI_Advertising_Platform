"""Prompt Library schemas."""
from __future__ import annotations

import uuid
from typing import Optional

from pydantic import BaseModel


class PromptVersionRead(BaseModel):
    id: uuid.UUID
    version: int
    template: str
    model: Optional[str] = None
    status: str


class PromptRead(BaseModel):
    id: uuid.UUID
    category: str
    name: str
    description: Optional[str] = None
    latest: Optional[PromptVersionRead] = None


class PromptDetail(PromptRead):
    versions: list[PromptVersionRead]


class PromptCreate(BaseModel):
    category: str
    name: str
    description: Optional[str] = None
    template: str
    model: Optional[str] = None
