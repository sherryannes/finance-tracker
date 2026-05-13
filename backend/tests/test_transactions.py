"""Tests for transaction flow + account balance side effects."""


def _create_account(client, headers, balance=0):
    return client.post(
        "/api/accounts",
        headers=headers,
        json={
            "name": "Checking",
            "type": "bank",
            "balance": balance,
            "currency": "USD",
        },
    ).json()


def test_unauthorized_without_token(client):
    resp = client.get("/api/accounts")
    assert resp.status_code == 401


def test_create_transaction_updates_account_balance(client, auth_headers):
    account = _create_account(client, auth_headers, balance=1000)

    # Expense of 50 -> balance becomes 950
    resp = client.post(
        "/api/transactions",
        headers=auth_headers,
        json={
            "account_id": account["id"],
            "type": "expense",
            "amount": 50,
            "occurred_on": "2026-05-01",
            "note": "lunch",
        },
    )
    assert resp.status_code == 201

    refreshed = client.get(f"/api/accounts/{account['id']}", headers=auth_headers).json()
    assert float(refreshed["balance"]) == 950.0


def test_delete_transaction_reverses_balance(client, auth_headers):
    account = _create_account(client, auth_headers, balance=500)
    txn = client.post(
        "/api/transactions",
        headers=auth_headers,
        json={
            "account_id": account["id"],
            "type": "income",
            "amount": 200,
            "occurred_on": "2026-05-01",
        },
    ).json()
    # Balance should now be 700
    assert float(client.get(f"/api/accounts/{account['id']}", headers=auth_headers).json()["balance"]) == 700.0

    client.delete(f"/api/transactions/{txn['id']}", headers=auth_headers)
    assert float(client.get(f"/api/accounts/{account['id']}", headers=auth_headers).json()["balance"]) == 500.0


def test_monthly_stats(client, auth_headers):
    account = _create_account(client, auth_headers, balance=0)
    for amount, type_ in [(100, "income"), (30, "expense"), (20, "expense")]:
        client.post(
            "/api/transactions",
            headers=auth_headers,
            json={
                "account_id": account["id"],
                "type": type_,
                "amount": amount,
                "occurred_on": "2026-05-15",
            },
        )

    resp = client.get("/api/transactions/stats/monthly?month=2026-05", headers=auth_headers)
    assert resp.status_code == 200
    stats = resp.json()
    assert float(stats["income"]) == 100
    assert float(stats["expense"]) == 50
    assert float(stats["net"]) == 50
