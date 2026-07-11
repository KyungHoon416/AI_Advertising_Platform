"""Advertiser Discovery Agent — market/competitor context → candidate advertisers."""
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.agents.common import run_structured_agent
from app.domain.enums import AdvertiserSource, AdvertiserStatus, AgentName
from app.infrastructure.db.models import Advertiser, Category
from app.infrastructure.llm.gateway import LLMGateway

_SYSTEM = (
    "당신은 잠재 광고주 발굴 전문가입니다. 시장·경쟁 분석 결과를 바탕으로 놀이의발견에 "
    "광고할 가능성이 높은 광고주 후보를 JSON 배열로 제안합니다."
)


def _fallback(category_name: str) -> dict:
    return {"advertisers": [
        {"name": f"{category_name} 신규 브랜드 X", "brand": "X",
         "reason": f"{category_name} 성장 카테고리, 3040 부모 타겟 적합", "priority": 1},
        {"name": f"{category_name} 지역 사업자 Y", "brand": "Y",
         "reason": "지역 기반 예약 전환 수요 높음", "priority": 2},
        {"name": f"{category_name} 프랜차이즈 Z", "brand": "Z",
         "reason": "다점포 확장기 인지도 확보 필요", "priority": 3},
    ]}


async def discover_advertisers(
    db: AsyncSession, category_id: uuid.UUID, gateway: LLMGateway | None = None
) -> list[Advertiser]:
    cat = (await db.execute(select(Category).where(Category.id == category_id))).scalar_one_or_none()
    if cat is None:
        raise ValueError("category not found")

    prompt = (
        f"카테고리 '{cat.name}'에서 놀이의발견에 광고할 가능성이 높은 잠재 광고주 후보를 JSON으로: "
        '{"advertisers":[{"name","brand","reason","priority"}]}'
    )
    data, _p, _fb = await run_structured_agent(
        db, agent=AgentName.ADVERTISER_DISCOVERY, prompt=prompt, system=_SYSTEM,
        fallback=_fallback(cat.name), gateway=gateway,
    )
    rows: list[Advertiser] = []
    for a in data.get("advertisers", []):
        name = str(a.get("name", "")).strip()
        if not name:
            continue
        exists = (
            await db.execute(select(Advertiser).where(Advertiser.name == name))
        ).scalar_one_or_none()
        if exists:
            rows.append(exists)
            continue
        row = Advertiser(
            name=name[:200], brand=str(a.get("brand", ""))[:200] or None,
            primary_category_id=cat.id, source=AdvertiserSource.DISCOVERY,
            status=AdvertiserStatus.CANDIDATE,
            profile={"discovery_reason": a.get("reason"), "priority": a.get("priority")},
        )
        db.add(row)
        rows.append(row)
    await db.commit()
    for r in rows:
        await db.refresh(r)
    return rows
