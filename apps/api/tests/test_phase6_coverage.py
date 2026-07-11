"""Additional coverage: persistence/observability, masking, gateway selection."""
from __future__ import annotations

import asyncio

from app.core.config import Settings
from app.core.masking import mask_text
from app.infrastructure.llm.gateway import LLMGateway


def _auth(t: str) -> dict:
    return {"Authorization": f"Bearer {t}"}


def test_masking_card_number():
    masked, count = mask_text("카드 1234-5678-9012-3456 결제")
    assert "3456" not in masked
    assert count >= 1


def test_gateway_prefers_anthropic_when_both_keys():
    gw = LLMGateway(Settings(anthropic_api_key="a", gemini_api_key="g"))
    assert gw.provider_name == "anthropic"
    # SDK not installed in test env -> graceful fallback
    res = asyncio.run(gw.generate("p", fallback="FB"))
    assert res.is_fallback and res.text == "FB"


def _category_id(client, token, name="워터파크") -> str:
    r = client.get("/api/v1/categories", headers=_auth(token), params={"q": name})
    return r.json()["items"][0]["id"]


def test_pipeline_persists_and_logs_executions(client, admin_token):
    cid = _category_id(client, admin_token)
    r = client.post("/api/v1/pipeline/run", headers=_auth(admin_token), json={"category_id": cid})
    assert r.status_code == 200
    body = r.json()
    # market research persisted & retrievable
    mr = client.get("/api/v1/market-research", headers=_auth(admin_token), params={"category_id": cid})
    assert mr.status_code == 200 and len(mr.json()) >= 1
    # competitors persisted & retrievable
    comps = client.get("/api/v1/competitors", headers=_auth(admin_token), params={"category_id": cid})
    assert comps.status_code == 200 and len(comps.json()) >= body["counts"]["competitors"]


def test_scoring_is_reproducible_same_version(client, admin_token):
    aid = client.get(
        "/api/v1/advertisers", headers=_auth(admin_token), params={"q": "워터파크"}
    ).json()["items"][0]["id"]
    a = client.post(f"/api/v1/scoring/advertisers/{aid}", headers=_auth(admin_token)).json()
    b = client.post(f"/api/v1/scoring/advertisers/{aid}", headers=_auth(admin_token)).json()
    # deterministic engine + same active scoring version -> identical total & grade
    assert a["total_score"] == b["total_score"]
    assert a["grade"] == b["grade"]
    assert a["scoring_version_id"] == b["scoring_version_id"]
