"""Market Research Agent — category → market analysis (persisted)."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.agents.common import run_structured_agent
from app.application.feature_builder import affinity
from app.domain.enums import AgentName
from app.infrastructure.db.models import Category, MarketResearch
from app.infrastructure.llm.gateway import LLMGateway

_SYSTEM = (
    "당신은 플랫폼 광고 시장 애널리스트입니다. 요청 카테고리의 시장을 분석하여 "
    "지정된 JSON 스키마로만 응답합니다. 추측은 낮은 신뢰도로 표기합니다."
)


def _fallback(category_name: str) -> dict:
    aff = affinity(category_name)
    growth = round(6.0 + aff * 4.0, 1)  # 6~10%
    return {
        "market_size": f"국내 {category_name} 시장은 가족·키즈 여가 소비 확대로 성장세",
        "growth_rate": f"연평균 약 {growth}%",
        "trends": ["모바일 예약 비중 확대", "초개인화 큐레이션 선호", "가족 단위 소비 증가"],
        "consumer_traits": ["3040 부모 중심", "주말·성수기 집중", "리뷰·추천 민감"],
        "opportunities": [
            f"놀이의발견의 정밀 3040 타겟과 {category_name} 적합도 높음",
            "광고-예약 원스톱 전환으로 성과 입증 용이",
        ],
        "risks": ["계절성에 따른 수요 변동", "대형 플랫폼과의 노출 경쟁"],
        "confidence": round(55 + aff * 20, 1),
    }


async def research(
    db: AsyncSession, category_id: uuid.UUID, gateway: LLMGateway | None = None
) -> MarketResearch:
    cat = (await db.execute(select(Category).where(Category.id == category_id))).scalar_one_or_none()
    if cat is None:
        raise ValueError("category not found")

    prompt = (
        f"카테고리 '{cat.name}'의 국내 광고 시장을 분석해 다음 JSON으로 응답:\n"
        '{"market_size","growth_rate","trends":[],"consumer_traits":[],'
        '"opportunities":[],"risks":[],"confidence"}'
    )
    data, _provider, _fb = await run_structured_agent(
        db, agent=AgentName.MARKET_RESEARCH, prompt=prompt, system=_SYSTEM,
        fallback=_fallback(cat.name), gateway=gateway,
    )
    row = MarketResearch(
        category_id=cat.id,
        market_size=str(data.get("market_size", ""))[:255],
        growth_rate=str(data.get("growth_rate", ""))[:120],
        trends={"items": data.get("trends", [])},
        consumer_traits={"items": data.get("consumer_traits", [])},
        opportunities={"items": data.get("opportunities", [])},
        risks={"items": data.get("risks", [])},
        confidence=float(data.get("confidence", 55) or 55),
        analyzed_at=datetime.now(timezone.utc),
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row
