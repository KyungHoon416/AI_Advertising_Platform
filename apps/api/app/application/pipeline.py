"""Sales-pipeline orchestrator (agent-to-agent workflow).

Runs the documented node order: Market Research → Competitor Discovery →
Competitor Intelligence → Advertiser Discovery, threading category context
between nodes. This is the orchestration layer; LangGraph can later execute the
same node contracts without changing agent signatures (ADR-note).
"""
from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.application.agents import competitor_agent, discovery_agent, market_agent
from app.infrastructure.llm.gateway import LLMGateway


async def run_sales_pipeline(
    db: AsyncSession, category_id: uuid.UUID, gateway: LLMGateway | None = None
) -> dict:
    market = await market_agent.research(db, category_id, gateway)
    competitors = await competitor_agent.discover(db, category_id, gateway)
    analysis_ids: list[str] = []
    if competitors:
        analysis = await competitor_agent.analyze(db, competitors[0].id, gateway)
        analysis_ids.append(str(analysis.id))
    advertisers = await discovery_agent.discover_advertisers(db, category_id, gateway)

    return {
        "market_research_id": str(market.id),
        "competitor_ids": [str(c.id) for c in competitors],
        "analysis_ids": analysis_ids,
        "discovered_advertiser_ids": [str(a.id) for a in advertisers],
        "counts": {
            "competitors": len(competitors),
            "analyses": len(analysis_ids),
            "advertisers": len(advertisers),
        },
    }
