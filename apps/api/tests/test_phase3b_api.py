"""Integration tests for scoring & recommendation endpoints."""
from __future__ import annotations


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _waterpark_id(client, token) -> str:
    r = client.get("/api/v1/advertisers", headers=_auth(token), params={"q": "워터파크"})
    assert r.status_code == 200
    items = r.json()["items"]
    assert items
    return items[0]["id"]


def test_scoring_config_has_14_factors(client, admin_token):
    r = client.get("/api/v1/scoring/config", headers=_auth(admin_token))
    assert r.status_code == 200
    body = r.json()
    assert body["version"] == "v1"
    assert len(body["factors"]) == 14
    adv = [f for f in body["factors"] if f["target"] == "advertiser"]
    prod = [f for f in body["factors"] if f["target"] == "ad_product"]
    assert sum(f["max_score"] for f in adv) == 100
    assert sum(f["max_score"] for f in prod) == 100


def test_compute_and_fetch_score(client, admin_token):
    aid = _waterpark_id(client, admin_token)
    r = client.post(f"/api/v1/scoring/advertisers/{aid}", headers=_auth(admin_token))
    assert r.status_code == 200, r.text
    body = r.json()
    assert len(body["factors"]) == 7
    assert 0 <= body["total_score"] <= 100
    assert body["grade"] in {"S", "A", "B", "C", "D"}
    assert round(sum(f["score"] for f in body["factors"]), 2) == body["total_score"]
    # explainability present
    assert all("rationale" in f and "is_inference" in f for f in body["factors"])

    g = client.get(f"/api/v1/scoring/advertisers/{aid}", headers=_auth(admin_token))
    assert g.status_code == 200
    assert g.json()["total_score"] == body["total_score"]


def test_high_affinity_advertiser_scores_reasonably(client, admin_token):
    aid = _waterpark_id(client, admin_token)
    r = client.post(f"/api/v1/scoring/advertisers/{aid}", headers=_auth(admin_token))
    # 워터파크(친화도 0.95, 집계·벤치마크 보유)는 최소 조건부(B) 이상이어야 함
    assert r.json()["total_score"] >= 70


def test_recommendation_returns_four_products_with_combo(client, admin_token):
    aid = _waterpark_id(client, admin_token)
    r = client.post(
        "/api/v1/recommendations/ad-products",
        headers=_auth(admin_token),
        json={"advertiser_id": aid, "purpose": "여름 성수기 예약 전환", "budget": 20000000},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert len(body["items"]) == 4
    assert body["combo"] and body["combo"]["product_codes"]
    ranks = sorted(i["rank"] for i in body["items"] if i["rank"] is not None)
    assert ranks == [1, 2]
    top = next(i for i in body["items"] if i["rank"] == 1)
    assert top["est_metrics"]["impressions"] > 0
    assert top["fit_score"] >= max(i["fit_score"] for i in body["items"])

    rid = body["id"]
    g = client.get(f"/api/v1/recommendations/{rid}", headers=_auth(admin_token))
    assert g.status_code == 200
    assert len(g.json()["items"]) == 4


def test_rbac_operator_can_run_but_not_read_config(client, operator_token):
    aid = _waterpark_id(client, operator_token)
    # operator has analysis:run
    assert client.post(
        f"/api/v1/scoring/advertisers/{aid}", headers=_auth(operator_token)
    ).status_code == 200
    # operator lacks scoring_config:read
    assert client.get("/api/v1/scoring/config", headers=_auth(operator_token)).status_code == 403
