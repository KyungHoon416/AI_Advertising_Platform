"""Unit tests for the pure advertiser scoring engine (no DB/LLM)."""
from __future__ import annotations

from app.domain.scoring.engine import grade_for, score_advertiser
from app.domain.scoring.models import FactorDefinition, FactorInput

DEFS = [
    FactorDefinition("MKT", "시장성", 15),
    FactorDefinition("TGT", "타겟", 20),
    FactorDefinition("BHV", "행동", 20),
    FactorDefinition("PERF", "성과", 15),
    FactorDefinition("ACT", "활동성", 10),
    FactorDefinition("BDG", "예산", 10),
    FactorDefinition("CMP", "경쟁", 10),
]


def test_grade_boundaries():
    assert grade_for(90) == "S"
    assert grade_for(89.99) == "A"
    assert grade_for(80) == "A"
    assert grade_for(70) == "B"
    assert grade_for(60) == "C"
    assert grade_for(59.9) == "D"
    assert grade_for(0) == "D"


def test_perfect_score_is_100_and_S():
    inputs = {d.code: FactorInput(d.code, 1.0) for d in DEFS}
    res = score_advertiser(DEFS, inputs)
    assert res.total == 100.0
    assert res.grade == "S"
    assert len(res.factors) == 7


def test_factor_scores_sum_to_total():
    inputs = {
        "MKT": FactorInput("MKT", 0.8), "TGT": FactorInput("TGT", 0.9),
        "BHV": FactorInput("BHV", 0.5), "PERF": FactorInput("PERF", 0.6),
        "ACT": FactorInput("ACT", 0.7), "BDG": FactorInput("BDG", 1.0),
        "CMP": FactorInput("CMP", 0.4),
    }
    res = score_advertiser(DEFS, inputs)
    assert round(sum(f.score for f in res.factors), 2) == res.total
    assert 0 <= res.total <= 100


def test_missing_input_scores_zero_and_flags_inference():
    inputs = {"MKT": FactorInput("MKT", 1.0)}  # others missing
    res = score_advertiser(DEFS, inputs)
    mkt = next(f for f in res.factors if f.code == "MKT")
    tgt = next(f for f in res.factors if f.code == "TGT")
    assert mkt.score == 15.0
    assert tgt.score == 0.0 and tgt.is_inference and tgt.confidence == 0.0


def test_value_is_clamped():
    inputs = {d.code: FactorInput(d.code, 5.0) for d in DEFS}  # >1 clamps to 1
    res = score_advertiser(DEFS, inputs)
    assert res.total == 100.0
