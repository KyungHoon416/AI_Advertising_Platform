"""Integration tests for proposal generation (Proposal Agent + fallback)."""
from __future__ import annotations


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _waterpark_id(client, token) -> str:
    r = client.get("/api/v1/advertisers", headers=_auth(token), params={"q": "워터파크"})
    return r.json()["items"][0]["id"]


def test_generate_proposal_grounded_and_fallback(client, admin_token):
    aid = _waterpark_id(client, admin_token)
    r = client.post(
        "/api/v1/proposals/generate",
        headers=_auth(admin_token),
        json={"advertiser_id": aid, "purpose": "여름 성수기 예약 전환", "budget": 20000000},
    )
    assert r.status_code == 200, r.text
    body = r.json()

    # no API key in tests -> graceful fallback
    assert body["generated_by"] == "mock"
    assert "워터파크" in body["title"]

    keys = {s["key"] for s in body["content"]["sections"]}
    assert {"executive_summary", "advertiser_analysis", "recommendation",
            "expected_performance"} <= keys

    # grounded in computed results
    exec_sum = next(s for s in body["content"]["sections"] if s["key"] == "executive_summary")
    assert "등급" in exec_sum["body"]
    analysis = next(s for s in body["content"]["sections"] if s["key"] == "advertiser_analysis")
    assert analysis["grade"] in {"S", "A", "B", "C", "D"}
    perf = next(s for s in body["content"]["sections"] if s["key"] == "expected_performance")
    assert perf["label"] == "assumption"
    assert "roi" in perf["metrics"]
    assert body["content"]["meta"]["scoring_version_id"]


def test_get_proposal_by_id(client, admin_token):
    aid = _waterpark_id(client, admin_token)
    created = client.post(
        "/api/v1/proposals/generate", headers=_auth(admin_token),
        json={"advertiser_id": aid},
    ).json()
    g = client.get(f"/api/v1/proposals/{created['id']}", headers=_auth(admin_token))
    assert g.status_code == 200
    assert g.json()["content"]["sections"]


def test_operator_can_generate_proposal(client, operator_token):
    aid = _waterpark_id(client, operator_token)
    r = client.post(
        "/api/v1/proposals/generate", headers=_auth(operator_token),
        json={"advertiser_id": aid},
    )
    assert r.status_code == 200  # operator has proposal:manage


def test_unauthenticated_cannot_generate(client):
    r = client.post("/api/v1/proposals/generate", json={"advertiser_id": str(__import__("uuid").uuid4())})
    assert r.status_code == 401
