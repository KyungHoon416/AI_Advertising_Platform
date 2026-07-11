"""Pure advertiser scoring engine.

Config-driven: factor definitions and grade thresholds are passed in, never
hard-coded. Deterministic and side-effect free → fully unit-testable without a
database or LLM. The result carries a per-factor explainability breakdown.
"""
from __future__ import annotations

from app.domain.scoring.models import (
    DEFAULT_GRADE_THRESHOLDS,
    FactorDefinition,
    FactorInput,
    FactorResult,
    ScoreResult,
)


def grade_for(total: float, thresholds=DEFAULT_GRADE_THRESHOLDS) -> str:
    for minimum, grade in thresholds:
        if total >= minimum:
            return grade
    return thresholds[-1][1]


def _clamp01(v: float) -> float:
    return 0.0 if v < 0 else 1.0 if v > 1 else v


def score_advertiser(
    definitions: list[FactorDefinition],
    inputs: dict[str, FactorInput],
    thresholds=DEFAULT_GRADE_THRESHOLDS,
) -> ScoreResult:
    """Compute total score, grade and per-factor breakdown.

    Each factor score = clamp01(input.value) * max_score. Missing inputs score 0
    (and are flagged as inference with 0 confidence so the gap is explainable).
    """
    results: list[FactorResult] = []
    total = 0.0
    conf_weight_sum = 0.0
    conf_acc = 0.0

    for d in definitions:
        inp = inputs.get(d.code)
        if inp is None:
            inp = FactorInput(
                code=d.code, value=0.0,
                rationale="입력 신호 없음(데이터 부족) — 0점 처리",
                is_inference=True, confidence=0.0,
            )
        value = _clamp01(inp.value)
        raw = round(value * d.max_score, 2)
        results.append(FactorResult(
            code=d.code, label=d.label, score=raw, max_score=d.max_score,
            rationale=inp.rationale, data_refs=inp.data_refs,
            is_inference=inp.is_inference, confidence=inp.confidence,
        ))
        total += raw
        conf_acc += inp.confidence * d.max_score
        conf_weight_sum += d.max_score

    total = round(total, 2)
    overall_conf = round(conf_acc / conf_weight_sum, 2) if conf_weight_sum else 0.0
    return ScoreResult(
        total=total,
        grade=grade_for(total, thresholds),
        confidence=overall_conf,
        factors=results,
    )
