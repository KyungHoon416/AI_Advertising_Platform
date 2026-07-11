"""Audit log for all sensitive/mutating actions."""
from __future__ import annotations

from typing import Optional

import uuid

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.db.base import Base, JSONType, TimestampMixin, UUIDMixin


class AuditLog(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "audit_logs"

    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    action: Mapped[str] = mapped_column(String(120), nullable=False)  # e.g. scoring.recalculate
    target_type: Mapped[Optional[str]] = mapped_column(String(80))
    target_id: Mapped[Optional[str]] = mapped_column(String(80))
    before: Mapped[Optional[dict]] = mapped_column(JSONType)
    after: Mapped[Optional[dict]] = mapped_column(JSONType)
    ip: Mapped[Optional[str]] = mapped_column(String(64))
