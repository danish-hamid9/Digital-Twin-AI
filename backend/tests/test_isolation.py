import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_cross_user_isolation_finance(client: AsyncClient):
    """Prove User A cannot read, edit, or delete User B's finance entries"""
    # 1. Register User A and User B
    res_a = await client.post("/api/v1/auth/register", json={
        "email": "user_a_finance@example.com", "password": "Password123!"
    })
    token_a = res_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    res_b = await client.post("/api/v1/auth/register", json={
        "email": "user_b_finance@example.com", "password": "Password123!"
    })
    token_b = res_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 2. User B creates a finance entry
    entry_b = await client.post("/api/v1/finance/entries", json={
        "date": "2026-09-01",
        "type": "expense",
        "category": "Confidential Investment",
        "amount": 5000.0,
        "description": "Secret B transaction"
    }, headers=headers_b)
    assert entry_b.status_code == 201
    entry_b_id = entry_b.json()["id"]

    # 3. User A attempts to READ User B's entry directly -> 404
    read_attempt = await client.get(f"/api/v1/finance/entries/{entry_b_id}", headers=headers_a)
    assert read_attempt.status_code == 404
    assert read_attempt.json()["detail"] == "Finance entry not found"

    # 4. User A attempts to UPDATE User B's entry -> 404
    update_attempt = await client.put(f"/api/v1/finance/entries/{entry_b_id}", json={
        "amount": 1.0,
        "category": "Hacked"
    }, headers=headers_a)
    assert update_attempt.status_code == 404

    # 5. User A attempts to DELETE User B's entry -> 404
    delete_attempt = await client.delete(f"/api/v1/finance/entries/{entry_b_id}", headers=headers_a)
    assert delete_attempt.status_code == 404

    # 6. User A lists entries -> User B's entry must not appear
    list_a = await client.get("/api/v1/finance/entries", headers=headers_a)
    assert list_a.status_code == 200
    ids_in_a = [item["id"] for item in list_a.json()["items"]]
    assert entry_b_id not in ids_in_a

    # 7. Verify entry is still intact for User B
    verify_b = await client.get(f"/api/v1/finance/entries/{entry_b_id}", headers=headers_b)
    assert verify_b.status_code == 200
    assert verify_b.json()["amount"] == 5000.0


@pytest.mark.asyncio
async def test_cross_user_isolation_study(client: AsyncClient):
    """Prove User A cannot read, edit, or delete User B's study sessions"""
    res_a = await client.post("/api/v1/auth/register", json={
        "email": "user_a_study@example.com", "password": "Password123!"
    })
    headers_a = {"Authorization": f"Bearer {res_a.json()['access_token']}"}

    res_b = await client.post("/api/v1/auth/register", json={
        "email": "user_b_study@example.com", "password": "Password123!"
    })
    headers_b = {"Authorization": f"Bearer {res_b.json()['access_token']}"}

    # User B creates study session
    sess_b = await client.post("/api/v1/study/sessions", json={
        "date": "2026-09-02",
        "subject": "Advanced Quantum Computing",
        "hours": 4.5,
        "score": 98.0
    }, headers=headers_b)
    assert sess_b.status_code == 201
    sess_b_id = sess_b.json()["id"]

    # User A tries read, edit, delete -> 404
    assert (await client.get(f"/api/v1/study/sessions/{sess_b_id}", headers=headers_a)).status_code == 404
    assert (await client.put(f"/api/v1/study/sessions/{sess_b_id}", json={"hours": 1.0}, headers=headers_a)).status_code == 404
    assert (await client.delete(f"/api/v1/study/sessions/{sess_b_id}", headers=headers_a)).status_code == 404

    # User A listing must be empty
    list_a = await client.get("/api/v1/study/sessions", headers=headers_a)
    assert len(list_a.json()["items"]) == 0


@pytest.mark.asyncio
async def test_cross_user_isolation_habits(client: AsyncClient):
    """Prove User A cannot read, edit, or delete User B's habit logs"""
    res_a = await client.post("/api/v1/auth/register", json={
        "email": "user_a_habits@example.com", "password": "Password123!"
    })
    headers_a = {"Authorization": f"Bearer {res_a.json()['access_token']}"}

    res_b = await client.post("/api/v1/auth/register", json={
        "email": "user_b_habits@example.com", "password": "Password123!"
    })
    headers_b = {"Authorization": f"Bearer {res_b.json()['access_token']}"}

    # User B creates habit log
    log_b = await client.post("/api/v1/habits/logs", json={
        "date": "2026-09-03",
        "habit": "Morning Meditation",
        "done": True,
        "sleep_hours": 8.0,
        "exercise_minutes": 45,
        "mood": 5
    }, headers=headers_b)
    assert log_b.status_code == 201
    log_b_id = log_b.json()["id"]

    # User A tries read, edit, delete -> 404
    assert (await client.get(f"/api/v1/habits/logs/{log_b_id}", headers=headers_a)).status_code == 404
    assert (await client.put(f"/api/v1/habits/logs/{log_b_id}", json={"done": False}, headers=headers_a)).status_code == 404
    assert (await client.delete(f"/api/v1/habits/logs/{log_b_id}", headers=headers_a)).status_code == 404

    # User A listing must not have it
    list_a = await client.get("/api/v1/habits/logs", headers=headers_a)
    assert len(list_a.json()["items"]) == 0
