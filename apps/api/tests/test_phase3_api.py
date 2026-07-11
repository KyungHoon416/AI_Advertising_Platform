"""Phase 3 integration tests: auth, RBAC, and catalog/advertiser CRUD."""
from __future__ import annotations


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_login_returns_tokens(client):
    r = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@nolbal.com", "password": "ChangeMe!234"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["access_token"] and body["refresh_token"]


def test_login_bad_password(client):
    r = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@nolbal.com", "password": "wrong"},
    )
    assert r.status_code == 401


def test_me_returns_roles_and_permissions(client, admin_token):
    r = client.get("/api/v1/auth/me", headers=_auth(admin_token))
    assert r.status_code == 200
    me = r.json()
    assert "super_admin" in me["roles"]
    assert len(me["permissions"]) == 18


def test_unauthenticated_is_rejected(client):
    assert client.get("/api/v1/advertisers").status_code == 401  # no bearer


def test_categories_seeded(client, admin_token):
    r = client.get("/api/v1/categories", headers=_auth(admin_token), params={"size": 5})
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 34
    assert len(body["items"]) == 5


def test_categories_filter_by_level(client, admin_token):
    r = client.get(
        "/api/v1/categories", headers=_auth(admin_token), params={"level": "major", "size": 100}
    )
    assert r.status_code == 200
    assert r.json()["total"] == 15  # 15 major categories seeded


def test_ad_products_seeded(client, admin_token):
    r = client.get("/api/v1/ad-products", headers=_auth(admin_token))
    assert r.status_code == 200
    assert r.json()["total"] == 4


def test_advertisers_list_and_filter(client, admin_token):
    r = client.get("/api/v1/advertisers", headers=_auth(admin_token))
    assert r.status_code == 200
    assert r.json()["total"] == 5

    r2 = client.get(
        "/api/v1/advertisers", headers=_auth(admin_token), params={"source": "discovery"}
    )
    assert r2.status_code == 200
    assert r2.json()["total"] == 3  # 3 discovery-sourced sample advertisers


def test_advertiser_create_and_get(client, admin_token):
    r = client.post(
        "/api/v1/advertisers",
        headers=_auth(admin_token),
        json={"name": "테스트 광고주 Z", "brand": "Z", "region": "부산"},
    )
    assert r.status_code == 201, r.text
    new_id = r.json()["id"]
    g = client.get(f"/api/v1/advertisers/{new_id}", headers=_auth(admin_token))
    assert g.status_code == 200
    assert g.json()["name"] == "테스트 광고주 Z"


def test_rbac_operator_can_read_but_not_write(client, operator_token):
    # operator has advertiser:read
    assert client.get("/api/v1/advertisers", headers=_auth(operator_token)).status_code == 200
    # operator lacks advertiser:manage
    r = client.post(
        "/api/v1/advertisers", headers=_auth(operator_token), json={"name": "블록되어야 함"}
    )
    assert r.status_code == 403


def test_refresh_token_flow(client):
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@nolbal.com", "password": "ChangeMe!234"},
    ).json()
    r = client.post("/api/v1/auth/refresh", json={"refresh_token": login["refresh_token"]})
    assert r.status_code == 200
    assert r.json()["access_token"]
