"""Shared helpers for structured-output agents.

Each agent asks the LLM for JSON matching a schema and always supplies a
deterministic structured `fallback`. When no API key / on error, the gateway
returns the fallback (as JSON text) so agents degrade gracefully and remain
fully testable offline. Every run is logged as an AgentExecution.
"""
from __future__ import annotations

import json
import time

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import AgentName, ExecutionStatus
from app.infrastructure.db.models import AgentExecution
from app.infrastructure.llm.gateway import LLMGateway, get_gateway


async def run_structured_agent(
    db: AsyncSession,
    *,
    agent: AgentName,
    prompt: str,
    system: str,
    fallback,
    gateway: LLMGateway | None = None,
) -> tuple[object, str, bool]:
    """Return (structured_data, provider, is_fallback). Logs AgentExecution."""
    gateway = gateway or get_gateway()
    fallback_json = json.dumps(fallback, ensure_ascii=False)

    started = time.perf_counter()
    res = await gateway.generate(prompt, system=system, fallback=fallback_json)
    latency_ms = int((time.perf_counter() - started) * 1000)

    try:
        data = json.loads(res.text)
    except (json.JSONDecodeError, TypeError):
        data = fallback

    db.add(AgentExecution(
        agent=agent,
        input_payload={"prompt_chars": len(prompt)},
        output={"provider": res.provider, "is_fallback": res.is_fallback},
        model=res.model, error=res.error,
        tokens_input=res.tokens_in, tokens_output=res.tokens_out,
        latency_ms=latency_ms, status=ExecutionStatus.SUCCESS,
    ))
    return data, res.provider, res.is_fallback
