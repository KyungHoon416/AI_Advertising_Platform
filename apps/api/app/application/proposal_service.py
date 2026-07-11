"""Proposal generation service (Proposal Agent).

Grounds the proposal in computed scoring & recommendation results, calls the LLM
gateway for narrative prose (graceful fallback when no key), logs an
AgentExecution, and persists Proposal + ProposalVersion. All estimated numbers
are labelled fact vs assumption per spec.
"""
from __future__ import annotations

import hashlib
import json
import time
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.application import recommendation_service, scoring_service
from app.domain.enums import AgentName, ExecutionStatus, ProposalStatus
from app.infrastructure.db.models import (
    Advertiser,
    AdvertiserScore,
    AgentExecution,
    Category,
    Proposal,
    ProposalVersion,
)
from app.infrastructure.llm.gateway import LLMGateway, get_gateway

_SYSTEM = (
    "당신은 웅진컴퍼스 플랫폼사업기획팀의 광고 제안 전문가입니다. "
    "제공된 비식별 분석 데이터에 근거하여 광고주 맞춤형 제안서 내러티브를 작성합니다. "
    "추측은 피하고, 예상 수치는 반드시 '가정(시뮬레이션)'으로 명시합니다."
)


class ProposalError(Exception):
    pass


async def _latest_score(db: AsyncSession, advertiser_id: uuid.UUID) -> AdvertiserScore | None:
    stmt = (
        select(AdvertiserScore)
        .options(selectinload(AdvertiserScore.factors))
        .where(AdvertiserScore.advertiser_id == advertiser_id)
        .order_by(AdvertiserScore.computed_at.desc())
    )
    return (await db.execute(stmt)).scalars().first()


async def generate(
    db: AsyncSession,
    advertiser_id: uuid.UUID,
    purpose: str | None = None,
    budget: float | None = None,
    gateway: LLMGateway | None = None,
) -> tuple[Proposal, ProposalVersion, str]:
    gateway = gateway or get_gateway()
    advertiser = (
        await db.execute(select(Advertiser).where(Advertiser.id == advertiser_id))
    ).scalar_one_or_none()
    if advertiser is None:
        raise ProposalError("advertiser not found")

    category_name = None
    if advertiser.primary_category_id:
        cat = (
            await db.execute(select(Category).where(Category.id == advertiser.primary_category_id))
        ).scalar_one_or_none()
        category_name = cat.name if cat else None

    # Ensure grounded inputs exist.
    score = await _latest_score(db, advertiser_id)
    if score is None:
        score, _ = await scoring_service.compute_and_store(db, advertiser_id)
        score = await _latest_score(db, advertiser_id)
    rec, rec_result = await recommendation_service.compute_and_store(
        db, advertiser_id, purpose, budget
    )
    # reload rec items
    rec = (
        await db.execute(
            select(type(rec)).options(selectinload(type(rec).items)).where(type(rec).id == rec.id)
        )
    ).scalar_one()

    top_items = sorted(
        [i for i in rec.items if i.rank is not None], key=lambda i: i.rank or 99
    )
    top = top_items[0] if top_items else (rec.items[0] if rec.items else None)
    est = (top.est_metrics if top else {}) or {}

    context = {
        "advertiser": advertiser.name,
        "brand": advertiser.brand,
        "category": category_name,
        "region": advertiser.region,
        "score": {"total": float(score.total_score), "grade": _grade(score.grade),
                  "confidence": float(score.confidence or 0)},
        "top_product": _code(top) if top else None,
        "combo": rec.combo,
        "expected": est,
    }
    fallback = _fallback_summary(context)
    prompt = _build_prompt(context)

    started = time.perf_counter()
    llm = await gateway.generate(prompt, system=_SYSTEM, fallback=fallback)
    latency_ms = int((time.perf_counter() - started) * 1000)
    summary = llm.text or fallback

    content = _build_content(advertiser, category_name, score, rec, rec_result, summary, est)

    # persist proposal + version
    proposal = Proposal(
        advertiser_id=advertiser.id,
        title=f"{advertiser.name} 맞춤형 광고 제안서",
        status=ProposalStatus.DRAFT,
    )
    db.add(proposal)
    await db.flush()
    version = ProposalVersion(proposal_id=proposal.id, version=1, content=content)
    db.add(version)

    # observability: AgentExecution log (non-PII input only)
    db.add(AgentExecution(
        agent=AgentName.PROPOSAL,
        input_hash=hashlib.sha256(json.dumps(context, default=str, ensure_ascii=False).encode()).hexdigest(),
        input_payload=context,
        output={"provider": llm.provider, "is_fallback": llm.is_fallback,
                "chars": len(summary)},
        model=llm.model, error=llm.error,
        tokens_input=llm.tokens_in, tokens_output=llm.tokens_out,
        latency_ms=latency_ms,
        status=ExecutionStatus.SUCCESS,
    ))
    await db.commit()
    await db.refresh(proposal)
    await db.refresh(version)
    return proposal, version, llm.provider


# --------------------------------------------------------------------- helpers
def _grade(g) -> str:
    return g.value if hasattr(g, "value") else str(g)


def _code(item) -> str | None:
    # ad_product relationship may not be loaded; fall back to id string
    return str(item.ad_product_id)


def _build_prompt(ctx: dict) -> str:
    return (
        "다음 비식별 분석 결과를 바탕으로 광고 제안서의 Executive Summary를 3~5문장으로 작성하세요.\n"
        f"- 광고주: {ctx['advertiser']} (카테고리: {ctx['category']}, 지역: {ctx['region']})\n"
        f"- 적합도: {ctx['score']['total']}점 {ctx['score']['grade']}등급 (신뢰도 {ctx['score']['confidence']}%)\n"
        f"- 추천 조합: {ctx['combo'].get('name') if ctx.get('combo') else '-'}\n"
        f"- 예상 성과(가정): ROI {ctx['expected'].get('roi')}%, 전환 {ctx['expected'].get('conversions')}건\n"
    )


def _fallback_summary(ctx: dict) -> str:
    s = ctx["score"]
    combo = (ctx.get("combo") or {}).get("name", "맞춤 패키지")
    roi = ctx["expected"].get("roi")
    return (
        f"{ctx['advertiser']}은(는) 놀이의발견 회원 데이터 기준 적합도 {s['total']}점 "
        f"({s['grade']}등급, 신뢰도 {s['confidence']}%)으로 분석되었습니다. "
        f"카테고리 '{ctx['category']}' 접점이 높아 '{combo}' 구성을 통해 "
        f"예상 ROI {roi}%(시뮬레이션 기준)의 성과가 기대됩니다. "
        "본 제안은 내부 집계·벤치마크 데이터에 근거하며, 예상 수치는 가정입니다."
    )


def _build_content(advertiser, category_name, score, rec, rec_result, summary, est) -> dict:
    top_factors = sorted(
        [{"code": f.factor_code, "label": f.label, "score": float(f.score),
          "max": f.max_score, "is_inference": f.is_inference, "rationale": f.rationale}
         for f in score.factors],
        key=lambda x: x["score"], reverse=True,
    )
    products = [
        {"rank": ps.product_code and idx + 1 if idx < 2 else None,
         "product_code": ps.product_code, "fit_score": ps.fit_score, "reason": ps.reason}
        for idx, ps in enumerate(rec_result.ranked)
    ]
    return {
        "title": f"{advertiser.name} 맞춤형 광고 제안서",
        "sections": [
            {"key": "executive_summary", "title": "Executive Summary", "body": summary},
            {"key": "advertiser_analysis", "title": "광고주·타겟 분석",
             "grade": _grade(score.grade), "total_score": float(score.total_score),
             "factors": top_factors},
            {"key": "recommendation", "title": "추천 광고상품",
             "combo": {"name": rec_result.combo.name, "roles": rec_result.combo.roles},
             "products": products},
            {"key": "expected_performance", "title": "예상 성과", "label": "assumption",
             "metrics": est,
             "note": "예상 수치는 카테고리 벤치마크 기반 시뮬레이션이며 실제 성과와 다를 수 있습니다."},
            {"key": "pricing_schedule", "title": "집행 구성·일정",
             "budget": float(rec.budget) if rec.budget is not None else None,
             "note": "집행 기간·단가는 협의 후 확정."},
            {"key": "next_steps", "title": "다음 단계",
             "items": ["제안 검토", "집행 조건 협의", "소재 기획", "캠페인 셋업"]},
        ],
        "meta": {
            "scoring_version_id": str(score.scoring_version_id),
            "confidence": float(score.confidence or 0),
        },
    }
