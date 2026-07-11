"""Prompt Library & Agent execution logs."""
from __future__ import annotations

from typing import Optional

import uuid

from sqlalchemy import Enum as SAEnum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.enums import AgentName, ExecutionStatus, PromptStatus
from app.infrastructure.db.base import Base, JSONType, TimestampMixin, UUIDMixin


class Prompt(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "prompts"

    category: Mapped[str] = mapped_column(String(60), nullable=False)  # 시장조사/경쟁사탐색/...
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(500))

    versions: Mapped[list["PromptVersion"]] = relationship(
        back_populates="prompt", cascade="all, delete-orphan"
    )


class PromptVersion(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "prompt_versions"

    prompt_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("prompts.id", ondelete="CASCADE"), index=True
    )
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    template: Mapped[str] = mapped_column(String(), nullable=False)
    input_variables: Mapped[Optional[dict]] = mapped_column(JSONType)
    output_schema: Mapped[Optional[dict]] = mapped_column(JSONType)  # Structured Output schema
    model: Mapped[Optional[str]] = mapped_column(String(80))
    status: Mapped[PromptStatus] = mapped_column(
        SAEnum(PromptStatus, native_enum=False), default=PromptStatus.DRAFT, nullable=False
    )

    prompt: Mapped[Prompt] = relationship(back_populates="versions")


class AgentExecution(UUIDMixin, TimestampMixin, Base):
    """모든 Agent 실행 로그(관측성·재현성)."""

    __tablename__ = "agent_executions"

    agent: Mapped[AgentName] = mapped_column(SAEnum(AgentName, native_enum=False), nullable=False)
    prompt_version_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("prompt_versions.id", ondelete="SET NULL")
    )
    input_hash: Mapped[Optional[str]] = mapped_column(String(64))
    input_payload: Mapped[Optional[dict]] = mapped_column(JSONType)  # 비식별 입력만
    output: Mapped[Optional[dict]] = mapped_column(JSONType)
    model: Mapped[Optional[str]] = mapped_column(String(80))
    tokens_input: Mapped[Optional[int]] = mapped_column(Integer)
    tokens_output: Mapped[Optional[int]] = mapped_column(Integer)
    latency_ms: Mapped[Optional[int]] = mapped_column(Integer)
    status: Mapped[ExecutionStatus] = mapped_column(
        SAEnum(ExecutionStatus, native_enum=False), default=ExecutionStatus.RUNNING, nullable=False
    )
    error: Mapped[Optional[str]] = mapped_column(String(2000))
