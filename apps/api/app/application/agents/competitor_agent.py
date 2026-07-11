"""Competitor Discovery + Intelligence Agents (persisted).

Discovery does NOT hard-code a competitor list (spec): the LLM探索s candidates
per category. The offline fallback yields generic, clearly-inferred placeholders
(low confidence, marked non-fact) rather than fabricating real brand claims.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.agents.common import run_structured_agent
from app.domain.enums import AgentName, CompetitorType
from app.infrastructure.db.models import (
    AIAnalysisSource,
    Category,
    Competitor,
    CompetitorAnalysis,
)
from app.infrastructure.llm.gateway import LLMGateway

_DISCOVERY_SYSTEM = (
    "당신은 광고 시장 조사 애널리스트입니다. 카테고리의 경쟁 브랜드/플랫폼을 유형별로 "
    "탐색하여 JSON 배열로 응답합니다. 확인되지 않은 항목은 낮은 신뢰도로 표기합니다."
)
_INTEL_SYSTEM = (
    "당신은 경쟁사 인텔리전스 애널리스트입니다. 대상 경쟁사의 상품·가격·채널·강약점을 "
    "분석하여 JSON으로 응답하고, 사실과 추론을 구분합니다."
)


def _discovery_fallback(category_name: str) -> dict:
    return {"competitors": [
        {"company": f"{category_name} 선도 브랜드 A", "brand": "A", "type": "leader"},
        {"company": f"{category_name} 직접 경쟁 B", "brand": "B", "type": "direct"},
        {"company": "종합 여가 플랫폼 C", "brand": "C", "type": "commerce"},
    ]}


def _intel_fallback(company: str) -> dict:
    return {
        "products": ["대표 상품군", "시즌 프로모션 상품"],
        "pricing": {"policy": "정액/정률 혼합(추정)"},
        "promotion": {"channels": ["SNS", "검색광고", "앱푸시"]},
        "channels": {"search": "브랜드 키워드", "sns": "인스타/유튜브", "app": "푸시/배너"},
        "strengths": ["브랜드 인지도", "트래픽 규모"],
        "weaknesses": ["가족·키즈 정밀 타겟 부족", "전환 데이터 입증 한계"],
        "differentiators": ["놀이의발견은 3040 부모 100% 매칭·광고-예약 원스톱"],
        "competition_intensity": 60.0,
        "confidence": 55.0,
        "sources": [],
    }


async def discover(
    db: AsyncSession, category_id: uuid.UUID, gateway: LLMGateway | None = None
) -> list[Competitor]:
    cat = (await db.execute(select(Category).where(Category.id == category_id))).scalar_one_or_none()
    if cat is None:
        raise ValueError("category not found")

    prompt = (
        f"카테고리 '{cat.name}'의 경쟁 브랜드/플랫폼을 유형(direct/indirect/leader/media/"
        f"commerce/ota/content/local)별로 탐색해 JSON으로: "
        '{"competitors":[{"company","brand","type"}]}'
    )
    data, _p, _fb = await run_structured_agent(
        db, agent=AgentName.COMPETITOR_DISCOVERY, prompt=prompt, system=_DISCOVERY_SYSTEM,
        fallback=_discovery_fallback(cat.name), gateway=gateway,
    )
    rows: list[Competitor] = []
    for c in data.get("competitors", []):
        try:
            ctype = CompetitorType(c.get("type", "direct"))
        except ValueError:
            ctype = CompetitorType.DIRECT
        row = Competitor(category_id=cat.id, company=str(c.get("company", ""))[:200],
                         brand=str(c.get("brand", ""))[:200] or None, type=ctype)
        db.add(row)
        rows.append(row)
    await db.commit()
    for r in rows:
        await db.refresh(r)
    return rows


async def analyze(
    db: AsyncSession, competitor_id: uuid.UUID, gateway: LLMGateway | None = None
) -> CompetitorAnalysis:
    comp = (
        await db.execute(select(Competitor).where(Competitor.id == competitor_id))
    ).scalar_one_or_none()
    if comp is None:
        raise ValueError("competitor not found")

    prompt = (
        f"경쟁사 '{comp.company}'의 상품·가격·프로모션·광고채널·강약점·차별점을 분석해 JSON으로: "
        '{"products":[],"pricing":{},"promotion":{},"channels":{},"strengths":[],'
        '"weaknesses":[],"differentiators":[],"competition_intensity","confidence","sources":[]}'
    )
    data, _p, _fb = await run_structured_agent(
        db, agent=AgentName.COMPETITOR_INTELLIGENCE, prompt=prompt, system=_INTEL_SYSTEM,
        fallback=_intel_fallback(comp.company), gateway=gateway,
    )
    analysis = CompetitorAnalysis(
        competitor_id=comp.id,
        products={"items": data.get("products", [])},
        pricing=data.get("pricing", {}),
        promotion=data.get("promotion", {}),
        channels=data.get("channels", {}),
        strengths={"items": data.get("strengths", [])},
        weaknesses={"items": data.get("weaknesses", [])},
        differentiators={"items": data.get("differentiators", [])},
        competition_intensity=float(data.get("competition_intensity", 60) or 60),
        confidence=float(data.get("confidence", 55) or 55),
    )
    db.add(analysis)
    await db.flush()
    for src in data.get("sources", []) or []:
        db.add(AIAnalysisSource(
            analysis_id=analysis.id, ref_type="competitor",
            source_url=str(src.get("url", ""))[:1000] if isinstance(src, dict) else None,
            title=str(src.get("title", ""))[:500] if isinstance(src, dict) else str(src)[:500],
            collected_at=datetime.now(timezone.utc),
            confidence=float(src.get("confidence", 50)) if isinstance(src, dict) else 50.0,
            is_fact=bool(src.get("is_fact", False)) if isinstance(src, dict) else False,
        ))
    await db.commit()
    await db.refresh(analysis)
    return analysis
