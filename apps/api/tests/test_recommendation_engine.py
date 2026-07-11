"""Unit tests for the pure ad-product recommendation engine."""
from __future__ import annotations

from app.domain.recommendation.engine import (
    choose_combo,
    estimate_metrics,
    score_products,
)
from app.domain.recommendation.models import ProductFactorDefinition, ProductFeature

DEFS = [
    ProductFactorDefinition("GOAL", "목적", 20),
    ProductFactorDefinition("CAT", "카테고리", 20),
    ProductFactorDefinition("AUD", "타겟", 20),
    ProductFactorDefinition("BDG", "예산", 15),
    ProductFactorDefinition("EXPO", "노출", 10),
    ProductFactorDefinition("TIME", "기간", 10),
    ProductFactorDefinition("HIST", "과거성과", 5),
]


def _feat(code, base, boost=0.0):
    return ProductFeature(code, {d.code: base for d in DEFS}, boost_points=boost)


def test_ranking_orders_by_fit_desc():
    feats = [_feat("main_banner", 0.5), _feat("category_ad", 0.9)]
    ranked = score_products(DEFS, feats)
    assert ranked[0].product_code == "category_ad"
    assert ranked[0].fit_score > ranked[1].fit_score


def test_boost_applied_and_capped_at_100():
    feats = [_feat("splash", 1.0, boost=50)]  # 100 + 50 boost -> capped 100
    ranked = score_products(DEFS, feats)
    assert ranked[0].fit_score == 100.0


def test_choose_combo_by_purpose_and_size():
    assert choose_combo("브랜드 인지도 확대", None, None).name == "브랜드 인지도 패키지"
    assert choose_combo("예약 전환", 3_000_000, None).name in ("전환 중심 패키지", "효율형 패키지")
    assert choose_combo(None, None, "large").name == "대형 캠페인 패키지"


def test_estimate_metrics_math_and_zero_guards():
    m = estimate_metrics(10_000_000, ctr=3.0, cvr=6.0, cpm=9000.0, aov=45000.0)
    assert m.impressions > 1_000_000
    assert m.clicks == int(m.impressions * 3.0 / 100)
    assert m.conversions == int(m.clicks * 6.0 / 100)
    assert m.roi > 0

    # zero guards
    assert estimate_metrics(0, 3, 6, 9000, 45000).roi == 0.0
    assert estimate_metrics(1_000_000, 3, 6, 0, 45000).impressions == 0
