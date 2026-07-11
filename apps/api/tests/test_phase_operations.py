"""Operational workflow tests: campaigns, performance analysis, ROI, renewal."""
from __future__ import annotations

from app.domain import roi as roi_calc


def _auth(t: str) -> dict:
    return {"Authorization": f"Bearer {t}"}


# --- pure ROI domain ---
def test_roi_compute_and_benchmark():
    m = roi_calc.compute(120000, 3600, 450, 15000000, 45000000)
    assert m.ctr == 3.0
    assert m.cvr == 12.5
    assert m.roas == 300.0
    assert m.roi == 200.0
    b = roi_calc.vs_benchmark(m.roi, 244.0)
    assert b["diff_pp"] == -44.0 and b["above"] is False


def test_renewal_score_and_likelihood():
    assert roi_calc.renewal_likelihood(roi_calc.renewal_score(400, 8, 100)) == "high"
    assert roi_calc.renewal_likelihood(5) == "low"
    assert roi_calc.UPSELL_LADDER["category_ad"] == "sub_banner"


# --- endpoints ---
def test_campaigns_seeded(client, admin_token):
    r = client.get("/api/v1/campaigns", headers=_auth(admin_token))
    assert r.status_code == 200
    campaigns = r.json()
    assert len(campaigns) >= 2
    assert all(c["performances"] for c in campaigns)


def test_performance_analysis(client, admin_token):
    campaigns = client.get("/api/v1/campaigns", headers=_auth(admin_token)).json()
    perf_id = campaigns[0]["performances"][0]["id"]
    r = client.post(f"/api/v1/performance/{perf_id}/analyze", headers=_auth(admin_token))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["ctr"] is not None and body["roi"] is not None
    assert body["analysis"] and "improvements" in body["analysis"]


def test_roi_analyze_endpoint(client, admin_token):
    r = client.post("/api/v1/roi/analyze", headers=_auth(admin_token), json={
        "partner_name": "워터파크", "impressions": 120000, "clicks": 3600,
        "conversions": 450, "spend": 15000000, "revenue": 45000000,
    })
    assert r.status_code == 200
    body = r.json()
    assert body["metrics"]["roi"] == 200.0
    assert "benchmark" in body and body["actions"]


def test_renewal_recommendation(client, admin_token):
    campaigns = client.get("/api/v1/campaigns", headers=_auth(admin_token)).json()
    # pick the ended, high-performing resort campaign for an upsell
    cid = campaigns[0]["id"]
    r = client.post(f"/api/v1/renewal/{cid}", headers=_auth(admin_token))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["likelihood"] in {"high", "medium", "low"}
    assert 0 <= body["score"] <= 100


def test_operator_can_run_operations(client, operator_token):
    campaigns = client.get("/api/v1/campaigns", headers=_auth(operator_token))
    assert campaigns.status_code == 200  # operator has campaign:read
    perf_id = campaigns.json()[0]["performances"][0]["id"]
    # operator has analysis:run and performance:manage
    assert client.post(
        f"/api/v1/performance/{perf_id}/analyze", headers=_auth(operator_token)
    ).status_code == 200
