"""Turns de-identified advertiser/aggregate/benchmark data into normalized
factor signals for the scoring & recommendation engines.

MVP uses deterministic, documented heuristics (no LLM). Every signal records a
rationale, the data it used, and whether it is a fact or an inference so the
Explainable-AI requirement is satisfied. LLM-derived signals can later replace
individual factors without touching the engines.
"""
from __future__ import annotations

from app.domain.recommendation.models import ProductFeature
from app.domain.scoring.models import FactorInput

# 놀이의발견(가족/키즈) 접점 친화도. 미정의 카테고리는 기본 0.6.
CATEGORY_AFFINITY: dict[str, float] = {
    "워터파크": 0.95, "테마파크": 0.95, "키즈카페": 0.95, "놀이시설": 0.9,
    "리조트": 0.85, "펜션": 0.8, "호텔": 0.7, "레저": 0.9, "여행": 0.75,
    "에듀테크": 0.85, "학원": 0.8, "교재": 0.75, "키즈용품": 0.85,
    "건강식품": 0.7, "간편식": 0.65, "아동패션": 0.8,
    "지역축제": 0.8, "지역관광": 0.78,
}

_BUDGET_VALUE = {"high": 1.0, "mid": 0.65, "low": 0.4}
_SIZE_VALUE = {"large": 0.8, "mid": 0.6, "small": 0.4}
_PRODUCT_PRICE_BAND = {
    "main_banner": "high", "splash": "high", "sub_banner": "mid", "category_ad": "mid",
}


def affinity(category_name: str | None) -> float:
    return CATEGORY_AFFINITY.get(category_name or "", 0.6)


def _norm(value: float, cap: float) -> float:
    if cap <= 0:
        return 0.0
    return min(value / cap, 1.0)


def classify_goal(purpose: str | None) -> str:
    p = (purpose or "").lower()
    if any(k in p for k in ("인지", "브랜드", "brand", "awareness", "론칭", "launch", "출시")):
        return "awareness"
    if any(k in p for k in ("전환", "예약", "구매", "conversion", "purchase")):
        return "conversion"
    if any(k in p for k in ("이벤트", "축제", "행사", "event", "프로모션")):
        return "event"
    return "general"


# ------------------------------------------------------------------ advertiser
def build_advertiser_inputs(
    *,
    category_name: str | None,
    budget_band: str | None,
    size: str | None,
    behavior_agg: dict | None,
    purchase_agg: dict | None,
    benchmark: dict | None,
) -> dict[str, FactorInput]:
    aff = affinity(category_name)
    has_bm = bool(benchmark)

    # MKT 시장성 — 카테고리 친화도 + 시장 데이터 존재 여부 (추론)
    mkt = round(aff * 0.8 + (0.2 if has_bm else 0.0), 3)

    # TGT 고객 타겟 적합도 — 카테고리-회원 접점 매핑 (사실 기반 매핑)
    tgt = aff

    # BHV 회원 행동 데이터 적합도 — 집계(조회/구매/재구매) 정규화 (사실)
    if behavior_agg or purchase_agg:
        v = _norm(float(behavior_agg.get("view_count", 0)) if behavior_agg else 0, 100000)
        pc = _norm(float(purchase_agg.get("purchase_count", 0)) if purchase_agg else 0, 8000)
        rep = float(purchase_agg.get("repurchase_rate", 0)) if purchase_agg else 0.0
        bhv = round(0.4 * v + 0.4 * pc + 0.2 * min(rep / 0.4, 1.0), 3)
        bhv_conf, bhv_inf = 90.0, False
        bhv_rationale = f"집계 지표(조회·구매·재구매율) 정규화: view={v:.2f}, purchase={pc:.2f}, repurchase={rep}"
    else:
        bhv, bhv_conf, bhv_inf = 0.3, 30.0, True
        bhv_rationale = "카테고리 집계 데이터 없음 — 보수적 기본값"

    # PERF 광고 성과 예상도 — 벤치마크 CTR/CVR 대비 (추론)
    if has_bm:
        ctr = float(benchmark.get("avg_ctr") or 0)
        cvr = float(benchmark.get("avg_cvr") or 0)
        perf = round(min(ctr / 3.0, 1.0) * 0.5 + min(cvr / 8.0, 1.0) * 0.5, 3)
        perf_conf = 70.0
        perf_rationale = f"카테고리 벤치마크 CTR={ctr}%, CVR={cvr}% 기준 추정"
    else:
        perf, perf_conf = 0.5, 40.0
        perf_rationale = "벤치마크 없음 — 카테고리 평균 가정"

    # ACT 광고주 활동성 — 규모 기반 (추론)
    act = _SIZE_VALUE.get(size or "", 0.6)

    # BDG 예산 적합도 — 예산 밴드 (사실)
    bdg = _BUDGET_VALUE.get(budget_band or "", 0.5)

    # CMP 경쟁 기회 — 접점/차별화 가능성 (추론)
    cmp = round(aff * 0.7 + 0.15, 3)

    ref = {"category": category_name}
    return {
        "MKT": FactorInput("MKT", mkt, f"카테고리 친화도 {aff} 기반 시장성 추정", ref, True, 60.0),
        "TGT": FactorInput("TGT", tgt, f"카테고리 '{category_name}' 회원 접점 적합도 {aff}", ref, False, 85.0),
        "BHV": FactorInput("BHV", bhv, bhv_rationale, ref, bhv_inf, bhv_conf),
        "PERF": FactorInput("PERF", perf, perf_rationale, ref, True, perf_conf),
        "ACT": FactorInput("ACT", act, f"광고주 규모 '{size}' 기반 활동성 추정", ref, True, 50.0),
        "BDG": FactorInput("BDG", bdg, f"예산 밴드 '{budget_band}' 적합도", ref, False, 80.0),
        "CMP": FactorInput("CMP", cmp, f"카테고리 접점 기반 경쟁 기회 추정", ref, True, 55.0),
    }


# --------------------------------------------------------------- ad products
_GOAL_VALUES = {
    "awareness": {"main_banner": 0.95, "splash": 0.9, "sub_banner": 0.6, "category_ad": 0.55},
    "conversion": {"main_banner": 0.55, "splash": 0.5, "sub_banner": 0.8, "category_ad": 0.95},
    "event": {"main_banner": 0.75, "splash": 0.95, "sub_banner": 0.6, "category_ad": 0.7},
    "general": {"main_banner": 0.65, "splash": 0.6, "sub_banner": 0.65, "category_ad": 0.7},
}
_EXPO_VALUES = {"main_banner": 0.95, "splash": 0.9, "sub_banner": 0.65, "category_ad": 0.6}


def _bdg_value(product_code: str, budget_band: str | None) -> float:
    band = _PRODUCT_PRICE_BAND[product_code]
    b = budget_band or "mid"
    if band == "high":
        return {"high": 1.0, "mid": 0.6, "low": 0.3}.get(b, 0.6)
    return {"high": 0.8, "mid": 0.9, "low": 0.7}.get(b, 0.75)


def _rule_boost(product_code: str, context: dict, rules: list[dict]) -> float:
    """Sum boost_points for rules whose condition is a subset-match of context."""
    total = 0.0
    for r in rules:
        if r["product_code"] != product_code:
            continue
        cond = r.get("condition") or {}
        if all(context.get(k) == v for k, v in cond.items()):
            total += float(r.get("boost_points", 0))
    return total


def build_product_features(
    *,
    category_name: str | None,
    budget_band: str | None,
    size: str | None,
    purpose: str | None,
    category_match: bool,
    benchmark_products: set[str],
    rules: list[dict],
) -> list[ProductFeature]:
    aff = affinity(category_name)
    goal = classify_goal(purpose)
    goal_vals = _GOAL_VALUES[goal]
    context = {
        "goal": {"awareness": "awareness", "conversion": "conversion",
                 "event": "event", "general": "general"}[goal],
        "reach": "national" if size == "large" else "regional",
        "size": size, "category_match": category_match,
        "budget": budget_band, "need": "continuous",
        "urgency": "high" if goal == "event" else "normal",
    }

    features: list[ProductFeature] = []
    for code in ("main_banner", "sub_banner", "category_ad", "splash"):
        values = {
            "GOAL": goal_vals[code],
            "CAT": (0.95 if category_match else 0.6) if code == "category_ad" else
                   {"sub_banner": 0.7, "main_banner": 0.65, "splash": 0.6}[code],
            "AUD": aff,
            "BDG": _bdg_value(code, budget_band),
            "EXPO": _EXPO_VALUES[code],
            "TIME": 0.9 if (code == "splash" and goal == "event") else
                    {"main_banner": 0.7, "sub_banner": 0.7, "category_ad": 0.65, "splash": 0.6}[code],
            "HIST": 0.8 if code in benchmark_products else 0.5,
        }
        boost = _rule_boost(code, context, rules)
        reason = _reason_for(code, goal, category_match, budget_band)
        features.append(ProductFeature(product_code=code, values=values,
                                       boost_points=boost, reason=reason))
    return features


def _reason_for(code: str, goal: str, match: bool, budget: str | None) -> str:
    base = {
        "main_banner": "대규모 노출·브랜드 인지도 확대에 최적",
        "sub_banner": "합리적 단가로 지속 노출·리마인드에 적합",
        "category_ad": "관심 고객 직접 타겟팅으로 예약/구매 전환에 유리",
        "splash": "단기 집중 노출로 이벤트·론칭 인지 효과 극대화",
    }[code]
    tags = []
    if code == "category_ad" and match:
        tags.append("업종-카테고리 일치")
    if goal == "awareness" and code in ("main_banner", "splash"):
        tags.append("인지도 목적 부합")
    if goal == "conversion" and code in ("category_ad", "sub_banner"):
        tags.append("전환 목적 부합")
    if budget in ("mid", "low") and code in ("sub_banner", "category_ad"):
        tags.append("예산 효율")
    return base + (f" ({', '.join(tags)})" if tags else "")
