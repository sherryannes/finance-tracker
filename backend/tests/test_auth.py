"""Tests for signup + login flow."""


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_signup_creates_user(client):
    resp = client.post(
        "/api/auth/signup",
        json={"email": "alice@example.com", "password": "secret123"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "alice@example.com"
    assert "id" in data
    assert "hashed_password" not in data  # never leak password hash


def test_signup_rejects_duplicate_email(client):
    payload = {"email": "bob@example.com", "password": "secret123"}
    client.post("/api/auth/signup", json=payload)
    resp = client.post("/api/auth/signup", json=payload)
    assert resp.status_code == 409


def test_login_returns_token(client):
    client.post(
        "/api/auth/signup",
        json={"email": "carol@example.com", "password": "secret123"},
    )
    resp = client.post(
        "/api/auth/login",
        data={"username": "carol@example.com", "password": "secret123"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert isinstance(body["access_token"], str)


def test_login_rejects_wrong_password(client):
    client.post(
        "/api/auth/signup",
        json={"email": "dan@example.com", "password": "correct1"},
    )
    resp = client.post(
        "/api/auth/login",
        data={"username": "dan@example.com", "password": "wrong"},
    )
    assert resp.status_code == 401
