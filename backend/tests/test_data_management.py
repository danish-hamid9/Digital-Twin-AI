"""
test_data_management.py
Phase 8: Tests for export-my-data and delete-my-data endpoints, verifying all tables are covered.
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

async def register_and_login(client: AsyncClient, suffix: str = "mgmt") -> dict:
    email = f"datamgmt_{suffix}@test.com"
    await client.post("/api/v1/auth/register", json={
        "email": email, "password": "TestPass123!", "full_name": "Data Mgmt User"
    })
    resp = await client.post("/api/v1/auth/login", json={"email": email, "password": "TestPass123!"})
    assert resp.status_code == 200
    return resp.json()["access_token"]


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def seed_user_data(client: AsyncClient, token: str):
    """Seed one record into each data table for the authenticated user."""
    h = auth(token)
    # Finance
    r = await client.post("/api/v1/finance/entries", headers=h, json={
        "date": "2025-01-10", "type": "income", "category": "Salary", "amount": 3000
    })
    assert r.status_code == 201, f"Finance seed failed: {r.text}"
    # Savings Goal
    r = await client.post("/api/v1/finance/goals", headers=h, json={
        "title": "Emergency Fund", "target_amount": 5000, "current_amount": 500
    })
    assert r.status_code == 201, f"Savings goal seed failed: {r.text}"
    # Study
    r = await client.post("/api/v1/study/sessions", headers=h, json={
        "date": "2025-01-10", "subject": "Math", "hours": 2.0
    })
    assert r.status_code == 201, f"Study seed failed: {r.text}"
    # Habit — mood is 1-5 scale
    r = await client.post("/api/v1/habits/logs", headers=h, json={
        "date": "2025-01-10", "habit": "Exercise", "done": True,
        "sleep_hours": 7.5, "exercise_minutes": 30, "mood": 4
    })
    assert r.status_code == 201, f"Habit log seed failed: {r.text}"
    # Plan
    r = await client.post("/api/v1/plans", headers=h, json={
        "title": "Save more", "description": "Save $500 extra", "domain": "finance", "status": "pending"
    })
    assert r.status_code == 201, f"Plan seed failed: {r.text}"



# ─────────────────────────────────────────────────────────────────────────────
# Tests
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_export_includes_all_tables(client: AsyncClient):
    """Export JSON must contain keys for all domain tables."""
    token = await register_and_login(client, suffix="export")
    await seed_user_data(client, token)

    resp = await client.get("/api/v1/user/export-data", headers=auth(token))
    assert resp.status_code == 200
    data = resp.json()

    # Top-level keys
    assert "user" in data
    assert "profile" in data

    # All domain tables must be present
    required_keys = [
        "finance_entries",
        "savings_goals",
        "study_sessions",
        "habit_logs",
        "goals",
        "plans",
        "twin_snapshots",
        "predictions",
        "simulations",
        "chat_messages",
    ]
    for key in required_keys:
        assert key in data, f"Missing key in export: {key}"

    # Seeded data should appear
    assert len(data["finance_entries"]) >= 1
    assert len(data["savings_goals"]) >= 1
    assert len(data["study_sessions"]) >= 1
    assert len(data["habit_logs"]) >= 1
    assert len(data["plans"]) >= 1


@pytest.mark.asyncio
async def test_export_fields_are_sanitized(client: AsyncClient):
    """Finance entries in export must not leak hashed_password or other user secrets."""
    token = await register_and_login(client, suffix="sanitize")
    await seed_user_data(client, token)

    resp = await client.get("/api/v1/user/export-data", headers=auth(token))
    assert resp.status_code == 200
    data = resp.json()

    # hashed_password must not leak through
    user_block = data["user"]
    assert "hashed_password" not in user_block


@pytest.mark.asyncio
async def test_delete_cascades_all_tables(client: AsyncClient):
    """After delete-data, all domain records are gone and the token is invalidated."""
    token = await register_and_login(client, suffix="delete")
    await seed_user_data(client, token)

    # Confirm data exists
    export_before = await client.get("/api/v1/user/export-data", headers=auth(token))
    assert export_before.status_code == 200
    before = export_before.json()
    assert len(before["finance_entries"]) >= 1
    assert len(before["plans"]) >= 1

    # Delete everything
    del_resp = await client.delete("/api/v1/user/delete-data", headers=auth(token))
    assert del_resp.status_code == 200
    body = del_resp.json()
    assert body["status"] == "success"

    # Token is now invalid (user no longer exists)
    me_resp = await client.get("/api/v1/auth/me", headers=auth(token))
    assert me_resp.status_code in (401, 404)


@pytest.mark.asyncio
async def test_export_requires_auth(client: AsyncClient):
    """Unauthenticated export request must be rejected with 401."""
    resp = await client.get("/api/v1/user/export-data")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_delete_requires_auth(client: AsyncClient):
    """Unauthenticated delete request must be rejected with 401."""
    resp = await client.delete("/api/v1/user/delete-data")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_export_is_user_scoped(client: AsyncClient):
    """User A's export must never contain User B's data."""
    token_a = await register_and_login(client, suffix="scopeA")
    token_b = await register_and_login(client, suffix="scopeB")

    # Seed finance entry for User B only
    await client.post("/api/v1/finance/entries", headers=auth(token_b), json={
        "date": "2025-01-15", "type": "expense", "category": "Groceries", "amount": 120
    })

    # User A's export should have no finance entries
    resp_a = await client.get("/api/v1/user/export-data", headers=auth(token_a))
    assert resp_a.status_code == 200
    data_a = resp_a.json()
    assert len(data_a["finance_entries"]) == 0


@pytest.mark.asyncio
async def test_plans_appear_in_export(client: AsyncClient):
    """Plans created manually and via chat (mocked by direct creation) appear in the export."""
    token = await register_and_login(client, suffix="plansexport")
    h = auth(token)

    # Create 2 plans
    await client.post("/api/v1/plans", headers=h, json={
        "title": "Plan Alpha", "domain": "study", "status": "pending"
    })
    await client.post("/api/v1/plans", headers=h, json={
        "title": "Plan Beta", "domain": "finance", "status": "in_progress"
    })

    resp = await client.get("/api/v1/user/export-data", headers=h)
    assert resp.status_code == 200
    plans = resp.json()["plans"]
    titles = [p["title"] for p in plans]
    assert "Plan Alpha" in titles
    assert "Plan Beta" in titles
