"""Performance Analysis Agent — diagnose a campaign's performance (persisted)."""
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.agents.common import run_structured_agent
from app.domain.enums import AgentName
from app.domain import roi as roi_calc
from app.infrastructure.db.models import Campaign, CampaignPerformance
from app.infrastructure.llm.gateway import LLMGateway

_SYSTEM = (
    "당신은 광고 성과 분석가입니다. 주어진 캠페인 성과 지표를 진단하여 요약·달성률·고저 원인·"
    "개선안을 지정된 JSON으로만 응답합니다. 예상 수치는 가정으로 표기합니다."
)

_INDUSTRY = {"ctr": 2.0, "cvr": 5.0, "roas": 250.0}


def _fallback(m: roi_calc.RoiMetrics, revenue: float, target_revenue: float) -> dict:
    achievement = round((revenue / target_revenue) * 100, 1) if target_revenue else 100.0
    high, low = [], []
    (high if m.ctr >= _INDUSTRY["ctr"] else low).append(f"CTR {m.ctr}% (업계 {_INDUSTRY['ctr']}%)")
    (high if m.cvr >= _INDUSTRY["cvr"] else low).append(f"CVR {m.cvr}% (업계 {_INDUSTRY['cvr']}%)")
    (high if m.roas >= _INDUSTRY["roas"] else low).append(f"ROAS {m.roas}% (업계 {_INDUSTRY['roas']}%)")
    improvements = []
    if m.cvr < _INDUSTRY["cvr"]:
        improvements.append("상세페이지 전환장치(즉시 할인 쿠폰) 추가로 CVR 개선")
    if m.ctr < _INDUSTRY["ctr"]:
        improvements.append("소재 A/B 테스트 및 타겟 정밀도 재조정으로 CTR 개선")
    improvements.append("고관여 세그먼트(찜/장바구니 이탈)로 모수 집중")
    return {
        "summary": f"CTR {m.ctr}% · CVR {m.cvr}% · ROAS {m.roas}% · ROI {m.roi}%",
        "achievement": achievement,
        "high_reasons": high,
        "low_reasons": low,
        "improvements": improvements,
    }


async def analyze(
    db: AsyncSession, performance_id: uuid.UUID, target_revenue: float | None = None,
    gateway: LLMGateway | None = None,
) -> CampaignPerformance:
    perf = (
        await db.execute(select(CampaignPerformance).where(CampaignPerformance.id == performance_id))
    ).scalar_one_or_none()
    if perf is None:
        raise ValueError("performance not found")

    # Spend lives on the parent Campaign (contract_amount).
    campaign = (
        await db.execute(select(Campaign).where(Campaign.id == perf.campaign_id))
    ).scalar_one_or_none()
    spend = float(campaign.contract_amount or 0) if campaign else 0.0

    m = roi_calc.compute(
        int(perf.impressions or 0), int(perf.clicks or 0), int(perf.conversions or 0),
        spend, float(perf.revenue or 0),
    )
    tr = target_revenue or float(perf.revenue or 0)
    prompt = (
        f"성과 지표: CTR {m.ctr}%, CVR {m.cvr}%, ROAS {m.roas}%, ROI {m.roi}%, "
        f"매출 {int(perf.revenue or 0)}원. 진단을 JSON으로: "
        '{"summary","achievement","high_reasons":[],"low_reasons":[],"improvements":[]}'
    )
    data, _p, _fb = await run_structured_agent(
        db, agent=AgentName.PERFORMANCE_ANALYSIS, prompt=prompt, system=_SYSTEM,
        fallback=_fallback(m, float(perf.revenue or 0), tr), gateway=gateway,
    )
    perf.ctr = m.ctr
    perf.cvr = m.cvr
    perf.roas = m.roas
    perf.roi = m.roi
    perf.analysis = data
    await db.commit()
    await db.refresh(perf)
    return perf
