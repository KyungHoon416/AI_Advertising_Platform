"""Pure ROI / performance math (no DB/LLM)."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class RoiMetrics:
    ctr: float
    cvr: float
    roas: float
    roi: float


def compute(impressions: int, clicks: int, conversions: int, spend: float, revenue: float) -> RoiMetrics:
    ctr = round((clicks / impressions) * 100, 2) if impressions else 0.0
    cvr = round((conversions / clicks) * 100, 2) if clicks else 0.0
    roas = round((revenue / spend) * 100, 2) if spend else 0.0
    roi = round(((revenue - spend) / spend) * 100, 2) if spend else 0.0
    return RoiMetrics(ctr=ctr, cvr=cvr, roas=roas, roi=roi)


def vs_benchmark(roi: float, industry_avg_roi: float) -> dict:
    diff = round(roi - industry_avg_roi, 2)
    return {"industry_avg_roi": industry_avg_roi, "diff_pp": diff, "above": diff >= 0}


# --- Renewal scoring (deterministic, config-overridable thresholds) ---
def renewal_score(roi: float, cvr: float, achievement: float) -> float:
    """0..100 from ROI headroom, conversion rate and goal achievement."""
    roi_part = min(max(roi / 400.0, 0.0), 1.0) * 50      # ROI up to 400% -> 50pts
    cvr_part = min(max(cvr / 8.0, 0.0), 1.0) * 25         # CVR up to 8% -> 25pts
    ach_part = min(max(achievement / 100.0, 0.0), 1.0) * 25
    return round(roi_part + cvr_part + ach_part, 2)


def renewal_likelihood(score: float) -> str:
    if score >= 70:
        return "high"
    if score >= 40:
        return "medium"
    return "low"


# Upsell ladder (spec): category -> +sub, sub -> main, main -> splash.
UPSELL_LADDER = {
    "category_ad": "sub_banner",
    "sub_banner": "main_banner",
    "main_banner": "splash",
    "splash": "category_ad",
}
