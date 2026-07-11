"""Category Classification Agent — advertiser/brand text → category taxonomy."""
from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.application.agents.common import run_structured_agent
from app.application.feature_builder import CATEGORY_AFFINITY
from app.domain.enums import AgentName
from app.infrastructure.llm.gateway import LLMGateway
from app.seed.data import CATEGORY_TREE

_SYSTEM = (
    "당신은 광고주 업종 분류 전문가입니다. 입력 텍스트를 분석해 대/중/소분류와 핵심 고객, "
    "주요 지역, 계절성, 광고 목적을 JSON으로 응답합니다."
)

# minor/middle name -> major name (for fallback keyword matching)
_MINOR_TO_MAJOR = {
    minor: major
    for major, middles in CATEGORY_TREE.items()
    for _middle, minors in middles for minor in minors
}
_MIDDLE_TO_MAJOR = {
    middle: major for major, middles in CATEGORY_TREE.items() for middle, _m in middles
}


def _fallback(text: str) -> dict:
    t = text or ""
    major = middle = minor = None
    for name in CATEGORY_AFFINITY:  # high-affinity keywords first
        if name in t:
            minor = name
            major = _MINOR_TO_MAJOR.get(name) or _MIDDLE_TO_MAJOR.get(name)
            break
    if major is None:
        for mid, mj in _MIDDLE_TO_MAJOR.items():
            if mid in t:
                middle, major = mid, mj
                break
    if major is None:
        for mj in CATEGORY_TREE:
            if mj in t:
                major = mj
                break
    return {
        "major": major or "여행",
        "middle": middle,
        "minor": minor,
        "core_customer": "3040 자녀 동반 부모",
        "region": "전국",
        "seasonality": "주말·성수기 집중",
        "ad_purpose": "예약·구매 전환",
        "confidence": 60.0 if major else 40.0,
    }


async def classify(
    db: AsyncSession, text: str, gateway: LLMGateway | None = None
) -> tuple[dict, str, bool]:
    prompt = (
        f"다음 광고주/브랜드 설명을 분류해 JSON으로 응답:\n'{text}'\n"
        '{"major","middle","minor","core_customer","region","seasonality","ad_purpose","confidence"}'
    )
    data, provider, is_fb = await run_structured_agent(
        db, agent=AgentName.CATEGORY_CLASSIFICATION, prompt=prompt, system=_SYSTEM,
        fallback=_fallback(text), gateway=gateway,
    )
    await db.commit()  # persist AgentExecution log
    return data, provider, is_fb
