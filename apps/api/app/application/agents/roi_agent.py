"""ROI Agent — deterministic ROI/ROAS + industry comparison + LLM narrative."""
from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.application.agents.common import run_structured_agent
from app.domain import roi as roi_calc
from app.domain.enums import AgentName
from app.infrastructure.llm.gateway import LLMGateway

_SYSTEM = (
    "당신은 광고 ROI 분석가입니다. 계산된 지표를 해석하고 개선 액션을 JSON으로 응답합니다."
)
_INDUSTRY_AVG_ROI = 244.0


def _fallback(m: roi_calc.RoiMetrics, bench: dict) -> dict:
    verdict = "우수" if bench["above"] else "개선 필요"
    return {
        "verdict": verdict,
        "actions": [
            "상세페이지 전환장치(즉시 할인 쿠폰)로 CVR 개선",
            "고관여 세그먼트(찜/장바구니 이탈)로 타겟 정밀화",
            "성과 우수 지면 예산 재배분 및 상위 상품 업셀 제안",
        ],
    }


async def analyze(
    db: AsyncSession,
    *,
    partner_name: str,
    impressions: int,
    clicks: int,
    conversions: int,
    spend: float,
    revenue: float,
    gateway: LLMGateway | None = None,
) -> dict:
    m = roi_calc.compute(impressions, clicks, conversions, spend, revenue)
    bench = roi_calc.vs_benchmark(m.roi, _INDUSTRY_AVG_ROI)

    prompt = (
        f"파트너 '{partner_name}' 성과: CTR {m.ctr}%, CVR {m.cvr}%, ROAS {m.roas}%, ROI {m.roi}% "
        f"(업종 평균 ROI {_INDUSTRY_AVG_ROI}%, 차이 {bench['diff_pp']}%p). "
        '해석과 개선 액션을 JSON으로: {"verdict","actions":[]}'
    )
    data, provider, is_fb = await run_structured_agent(
        db, agent=AgentName.ROI, prompt=prompt, system=_SYSTEM,
        fallback=_fallback(m, bench), gateway=gateway,
    )
    await db.commit()  # persist AgentExecution log
    return {
        "metrics": {"ctr": m.ctr, "cvr": m.cvr, "roas": m.roas, "roi": m.roi},
        "benchmark": bench,
        "verdict": data.get("verdict"),
        "actions": data.get("actions", []),
        "generated_by": provider,
        "is_fallback": is_fb,
    }
