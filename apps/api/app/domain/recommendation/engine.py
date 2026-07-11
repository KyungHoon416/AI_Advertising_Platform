"""Pure ad-product recommendation engine.

Scores the 4 Play-Discovery ad products (main/sub/category/splash) on 7 factors,
applies rule boosts, ranks them, picks a combination package, and estimates
performance from benchmark inputs. No DB/LLM dependency → unit-testable.
"""
from __future__ import annotations

from app.domain.recommendation.models import (
    Combo,
    EstimatedMetrics,
    ProductFactorDefinition,
    ProductFeature,
    ProductScore,
    RecommendationResult,
)

# Combination packages (doc 03). Chosen by campaign purpose + budget.
COMBOS = {
    "awareness": Combo(
        name="브랜드 인지도 패키지", product_codes=["main_banner", "splash"],
        roles={"splash": "캠페인 초기 집중 인지도 확보", "main_banner": "대규모 트래픽 확보"},
    ),
    "conversion": Combo(
        name="전환 중심 패키지", product_codes=["category_ad", "sub_banner"],
        roles={"category_ad": "관심 고객의 예약/구매 전환 유도", "sub_banner": "캠페인 기간 중 지속 리마인드"},
    ),
    "large": Combo(
        name="대형 캠페인 패키지",
        product_codes=["main_banner", "sub_banner", "category_ad", "splash"],
        roles={
            "splash": "초기 인지", "main_banner": "대규모 트래픽",
            "category_ad": "관심 고객 전환", "sub_banner": "지속 리마인드",
        },
    ),
    "efficiency": Combo(
        name="효율형 패키지", product_codes=["category_ad", "sub_banner"],
        roles={"category_ad": "타겟 고객 전환", "sub_banner": "효율적 지속 노출"},
    ),
}


def score_products(
    definitions: list[ProductFactorDefinition],
    features: list[ProductFeature],
) -> list[ProductScore]:
    max_total = sum(d.max_score for d in definitions) or 1
    scored: list[ProductScore] = []
    for f in features:
        raw = sum(_clamp01(f.values.get(d.code, 0.0)) * d.max_score for d in definitions)
        fit = min(round(raw + f.boost_points, 2), float(max_total))
        scored.append(ProductScore(product_code=f.product_code, fit_score=fit, reason=f.reason))
    scored.sort(key=lambda s: s.fit_score, reverse=True)
    return scored


def choose_combo(purpose: str | None, budget: float | None, size: str | None) -> Combo:
    p = (purpose or "").lower()
    if size == "large" or (budget or 0) >= 30_000_000:
        return COMBOS["large"]
    if any(k in p for k in ("awareness", "인지", "브랜드", "launch", "론칭", "출시")):
        return COMBOS["awareness"]
    if any(k in p for k in ("conversion", "전환", "예약", "구매")):
        return COMBOS["conversion"]
    if any(k in p for k in ("efficiency", "효율")) or (budget is not None and budget < 5_000_000):
        return COMBOS["efficiency"]
    return COMBOS["conversion"]


def estimate_metrics(
    budget: float, ctr: float, cvr: float, cpm: float, aov: float
) -> EstimatedMetrics:
    """CTR/CVR are percentages; cpm/aov in KRW. Guards against zero division."""
    impressions = int((budget / cpm) * 1000) if cpm else 0
    clicks = int(impressions * ctr / 100)
    conversions = int(clicks * cvr / 100)
    revenue = round(conversions * aov, 2)
    roi = round((revenue - budget) / budget * 100, 2) if budget else 0.0
    return EstimatedMetrics(
        impressions=impressions, clicks=clicks, ctr=round(ctr, 3),
        conversions=conversions, cvr=round(cvr, 3), revenue=revenue, roi=roi,
    )


def recommend(
    definitions: list[ProductFactorDefinition],
    features: list[ProductFeature],
    purpose: str | None,
    budget: float | None,
    size: str | None,
    confidence: float = 70.0,
) -> RecommendationResult:
    ranked = score_products(definitions, features)
    combo = choose_combo(purpose, budget, size)
    return RecommendationResult(ranked=ranked, combo=combo, confidence=confidence)


def _clamp01(v: float) -> float:
    return 0.0 if v < 0 else 1.0 if v > 1 else v
