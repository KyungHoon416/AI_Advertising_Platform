"""Unit tests for the feature builder (heuristic signal extraction)."""
from __future__ import annotations

from app.application.feature_builder import (
    affinity,
    build_advertiser_inputs,
    build_product_features,
    classify_goal,
)

ADV_CODES = {"MKT", "TGT", "BHV", "PERF", "ACT", "BDG", "CMP"}


def test_affinity_known_and_default():
    assert affinity("워터파크") == 0.95
    assert affinity("생활용품") == 0.6  # default
    assert affinity(None) == 0.6


def test_classify_goal():
    assert classify_goal("브랜드 인지도 확대") == "awareness"
    assert classify_goal("예약 전환 캠페인") == "conversion"
    assert classify_goal("여름 축제 이벤트") == "event"
    assert classify_goal("그냥 광고") == "general"


def test_advertiser_inputs_shape_and_ranges():
    inputs = build_advertiser_inputs(
        category_name="워터파크", budget_band="high", size="large",
        behavior_agg={"view_count": 82000, "purchase_count": 5200, "repurchase_rate": 0.22},
        purchase_agg={"purchase_count": 5200, "repurchase_rate": 0.22},
        benchmark={"avg_ctr": 3.2, "avg_cvr": 6.0},
    )
    assert set(inputs) == ADV_CODES
    for f in inputs.values():
        assert 0.0 <= f.value <= 1.0
    # TGT is a factual mapping, BDG factual; MKT/PERF/ACT/CMP are inferences
    assert inputs["TGT"].is_inference is False
    assert inputs["BDG"].is_inference is False and inputs["BDG"].value == 1.0
    assert inputs["BHV"].is_inference is False and inputs["BHV"].confidence == 90.0
    assert inputs["MKT"].is_inference is True
    assert inputs["PERF"].confidence == 70.0


def test_advertiser_inputs_without_aggregates_flags_low_confidence():
    inputs = build_advertiser_inputs(
        category_name="생활용품", budget_band=None, size=None,
        behavior_agg=None, purchase_agg=None, benchmark=None,
    )
    assert inputs["BHV"].is_inference is True
    assert inputs["BHV"].confidence == 30.0
    assert inputs["BDG"].value == 0.5  # unknown band -> neutral


def test_product_features_category_match_and_count():
    feats = build_product_features(
        category_name="워터파크", budget_band="high", size="large",
        purpose="예약 전환", category_match=True,
        benchmark_products={"category_ad"}, rules=[],
    )
    assert len(feats) == 4
    by_code = {f.product_code: f for f in feats}
    # category_ad gets high CAT when the advertiser category matches
    assert by_code["category_ad"].values["CAT"] >= 0.9
    # HIST higher for products with a benchmark
    assert by_code["category_ad"].values["HIST"] == 0.8
    assert by_code["main_banner"].values["HIST"] == 0.5


def test_product_rule_boost_applied_for_event_splash():
    rules = [
        {"product_code": "splash", "condition": {"goal": "event", "urgency": "high"},
         "boost_points": 6},
    ]
    feats = build_product_features(
        category_name="지역축제", budget_band="high", size="large",
        purpose="여름 축제 이벤트 프로모션", category_match=True,
        benchmark_products=set(), rules=rules,
    )
    splash = next(f for f in feats if f.product_code == "splash")
    assert splash.boost_points == 6


def test_awareness_goal_favours_main_and_splash():
    feats = build_product_features(
        category_name="리조트", budget_band="high", size="large",
        purpose="신규 브랜드 인지도", category_match=True,
        benchmark_products=set(), rules=[],
    )
    by_code = {f.product_code: f for f in feats}
    assert by_code["main_banner"].values["GOAL"] > by_code["category_ad"].values["GOAL"]
