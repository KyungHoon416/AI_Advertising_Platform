"""Phase 4: agent fallbacks, agent endpoints, and the sales pipeline."""
from __future__ import annotations

from app.application.agents.category_agent import _fallback as cat_fallback
from app.application.agents.market_agent import _fallback as mkt_fallback


def _auth(t: str) -> dict:
    return {"Authorization": f"Bearer {t}"}


def _waterpark_category_id(client, token) -> str:
    r = client.get("/api/v1/categories", headers=_auth(token), params={"q": "워터파크"})
    return r.json()["items"][0]["id"]


# ---- pure fallbacks ----
def test_category_fallback_keyword_match():
    out = cat_fallback("서울 워터파크 여름 워터슬라이드")
    assert out["minor"] == "워터파크"
    assert out["major"] == "여행"
    assert out["confidence"] >= 60


def test_market_fallback_scales_with_affinity():
    hi = mkt_fallback("워터파크")   # affinity 0.95
    lo = mkt_fallback("생활용품")   # default 0.6
    assert hi["confidence"] > lo["confidence"]
    assert hi["trends"] and hi["opportunities"]


# ---- endpoints ----
def test_classify_category_endpoint(client, admin_token):
    r = client.post("/api/v1/agents/classify-category", headers=_auth(admin_token),
                    json={"text": "가족 워터파크 여름 성수기 프로모션"})
    assert r.status_code == 200
    body = r.json()
    assert body["generated_by"] == "mock" and body["is_fallback"] is True
    assert body["result"]["minor"] == "워터파크"


def test_market_research_run_and_list(client, admin_token):
    cid = _waterpark_category_id(client, admin_token)
    r = client.post("/api/v1/market-research/run", headers=_auth(admin_token),
                    json={"category_id": cid})
    assert r.status_code == 200, r.text
    assert r.json()["growth_rate"] and float(r.json()["confidence"]) > 0

    g = client.get("/api/v1/market-research", headers=_auth(admin_token),
                   params={"category_id": cid})
    assert g.status_code == 200 and len(g.json()) >= 1


def test_competitor_discover_and_analyze(client, admin_token):
    cid = _waterpark_category_id(client, admin_token)
    d = client.post("/api/v1/competitors/discover", headers=_auth(admin_token),
                    json={"category_id": cid})
    assert d.status_code == 200
    comps = d.json()
    assert len(comps) == 3
    a = client.post(f"/api/v1/competitors/{comps[0]['id']}/analyze", headers=_auth(admin_token))
    assert a.status_code == 200
    assert a.json()["strengths"] and a.json()["differentiators"]


def test_advertiser_discovery_creates_candidates(client, admin_token):
    cid = _waterpark_category_id(client, admin_token)
    before = client.get("/api/v1/advertisers", headers=_auth(admin_token),
                        params={"source": "discovery", "size": 100}).json()["total"]
    r = client.post("/api/v1/discovery/advertisers", headers=_auth(admin_token),
                    json={"category_id": cid})
    assert r.status_code == 200
    assert len(r.json()) >= 3
    after = client.get("/api/v1/advertisers", headers=_auth(admin_token),
                       params={"source": "discovery", "size": 100}).json()["total"]
    assert after > before


def test_pipeline_run_chains_agents(client, admin_token):
    cid = _waterpark_category_id(client, admin_token)
    r = client.post("/api/v1/pipeline/run", headers=_auth(admin_token), json={"category_id": cid})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["counts"]["competitors"] > 0
    assert body["counts"]["advertisers"] > 0
    assert body["market_research_id"]
    assert len(body["analysis_ids"]) >= 1


def test_operator_can_run_analysis(client, operator_token):
    cid = _waterpark_category_id(client, operator_token)
    r = client.post("/api/v1/market-research/run", headers=_auth(operator_token),
                    json={"category_id": cid})
    assert r.status_code == 200  # operator has analysis:run
