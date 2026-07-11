"""Backend tests for dashboard KPIs and Prompt Library (Phase 5 support)."""
from __future__ import annotations


def _auth(t: str) -> dict:
    return {"Authorization": f"Bearer {t}"}


def test_dashboard_kpis(client, admin_token):
    r = client.get("/api/v1/dashboard/kpis", headers=_auth(admin_token))
    assert r.status_code == 200
    body = r.json()
    # session-scoped DB is shared across tests, so assert lower bounds (seed = 5/3)
    assert body["total_advertisers"] >= 5
    assert body["discovered_advertisers"] >= 3
    assert set(body).issuperset(
        {"high_score_advertisers", "scored_advertisers", "proposals", "competitors", "campaigns"}
    )


def test_prompts_seeded_and_listed(client, admin_token):
    r = client.get("/api/v1/prompts", headers=_auth(admin_token))
    assert r.status_code == 200
    prompts = r.json()
    assert len(prompts) == 6
    assert all(p["latest"] and p["latest"]["template"] for p in prompts)
    names = {p["name"] for p in prompts}
    assert "Proposal Agent" in names and "Market Research Agent" in names


def test_prompt_detail(client, admin_token):
    pid = client.get("/api/v1/prompts", headers=_auth(admin_token)).json()[0]["id"]
    r = client.get(f"/api/v1/prompts/{pid}", headers=_auth(admin_token))
    assert r.status_code == 200
    assert r.json()["versions"]


def test_operator_can_read_prompts_but_not_create(client, operator_token):
    assert client.get("/api/v1/prompts", headers=_auth(operator_token)).status_code == 200
    r = client.post(
        "/api/v1/prompts", headers=_auth(operator_token),
        json={"category": "테스트", "name": "X", "template": "t"},
    )
    assert r.status_code == 403  # operator lacks prompt:manage


def test_admin_can_create_prompt(client, admin_token):
    r = client.post(
        "/api/v1/prompts", headers=_auth(admin_token),
        json={"category": "테스트", "name": "New Prompt", "template": "안녕", "model": "gemini-2.5-flash"},
    )
    assert r.status_code == 201
    assert r.json()["latest"]["version"] == 1
    assert r.json()["latest"]["status"] == "draft"
