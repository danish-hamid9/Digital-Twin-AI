import pytest
from httpx import AsyncClient
import datetime as dt

@pytest.mark.asyncio
async def test_dashboard_empty_overview(client: AsyncClient):
    # Register user
    reg = await client.post("/api/v1/auth/register", json={
        "email": "empty_dash@example.com",
        "password": "Password123!",
        "full_name": "Empty Dashboard",
        "currency": "USD"
    })
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch overview
    res = await client.get("/api/v1/dashboard/overview", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "date_range" in data
    assert data["date_range"]["preset"] == "30d"

    # Finance defaults
    assert data["finance"]["total_income"] == 0.0
    assert data["finance"]["total_expenses"] == 0.0
    assert data["finance"]["net_savings"] == 0.0
    assert data["finance"]["savings_rate"] == 0.0
    assert data["finance"]["currency"] == "USD"
    assert data["finance"]["cash_flow_trend"] == []
    assert data["finance"]["category_distribution"] == []

    # Study defaults
    assert data["study"]["total_study_hours"] == 0.0
    assert data["study"]["sessions_count"] == 0
    assert data["study"]["subject_breakdown"] == []

    # Habits defaults
    assert data["habits"]["logs_count"] == 0
    assert data["habits"]["current_streak"] == 0
    assert data["habits"]["habit_completion_rate"] == 0.0


@pytest.mark.asyncio
async def test_dashboard_with_domain_data(client: AsyncClient):
    # Register user
    reg = await client.post("/api/v1/auth/register", json={
        "email": "dash_user@example.com",
        "password": "Password123!",
        "full_name": "Dashboard Tester",
        "currency": "EUR"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    today = dt.date.today()
    d1 = (today - dt.timedelta(days=2)).isoformat()
    d2 = (today - dt.timedelta(days=1)).isoformat()
    d3 = today.isoformat()

    # Create Finance entries
    await client.post("/api/v1/finance/entries", json={
        "date": d1,
        "type": "income",
        "category": "Salary",
        "amount": 5000.0,
        "description": "Monthly pay"
    }, headers=headers)

    await client.post("/api/v1/finance/entries", json={
        "date": d2,
        "type": "expense",
        "category": "Rent",
        "amount": 1500.0,
        "description": "Apartment lease"
    }, headers=headers)

    await client.post("/api/v1/finance/entries", json={
        "date": d3,
        "type": "expense",
        "category": "Groceries",
        "amount": 500.0,
        "description": "Weekly food"
    }, headers=headers)

    # Create Study sessions
    await client.post("/api/v1/study/sessions", json={
        "date": d1,
        "subject": "Mathematics",
        "hours": 3.0,
        "score": 90.0,
        "notes": "Calculus revision"
    }, headers=headers)

    await client.post("/api/v1/study/sessions", json={
        "date": d2,
        "subject": "Computer Science",
        "hours": 4.5,
        "score": 95.0,
        "notes": "Algorithms problem set"
    }, headers=headers)

    # Create Habit logs
    await client.post("/api/v1/habits/logs", json={
        "date": d1,
        "habit": "Night Routine",
        "done": True,
        "sleep_hours": 7.5,
        "exercise_minutes": 45,
        "mood": 4
    }, headers=headers)

    await client.post("/api/v1/habits/logs", json={
        "date": d2,
        "habit": "Night Routine",
        "done": True,
        "sleep_hours": 8.0,
        "exercise_minutes": 30,
        "mood": 5
    }, headers=headers)

    await client.post("/api/v1/habits/logs", json={
        "date": d3,
        "habit": "Night Routine",
        "done": True,
        "sleep_hours": 6.5,
        "exercise_minutes": 0,
        "mood": 3
    }, headers=headers)

    # Test /api/v1/dashboard/overview
    res = await client.get("/api/v1/dashboard/overview?preset=30d", headers=headers)
    assert res.status_code == 200
    data = res.json()

    # Finance verification
    fin = data["finance"]
    assert fin["total_income"] == 5000.0
    assert fin["total_expenses"] == 2000.0
    assert fin["net_savings"] == 3000.0
    assert fin["savings_rate"] == 60.0
    assert fin["currency"] == "EUR"
    assert len(fin["category_distribution"]) == 2
    assert fin["category_distribution"][0]["category"] == "Rent"
    assert fin["category_distribution"][0]["amount"] == 1500.0
    assert fin["category_distribution"][0]["percentage"] == 75.0
    assert len(fin["cash_flow_trend"]) == 3

    # Study verification
    stu = data["study"]
    assert stu["total_study_hours"] == 7.5
    assert stu["sessions_count"] == 2
    assert stu["avg_score"] == 92.5
    assert len(stu["subject_breakdown"]) == 2
    assert stu["top_subject"] in ("Computer Science", "Mathematics")

    # Habits verification
    hab = data["habits"]
    assert hab["logs_count"] == 3
    assert hab["avg_sleep_hours"] > 7.0
    assert hab["habit_completion_rate"] == 100.0
    assert hab["current_streak"] >= 2
    assert len(hab["sleep_vs_mood"]) == 3


@pytest.mark.asyncio
async def test_dashboard_domain_endpoints(client: AsyncClient):
    reg = await client.post("/api/v1/auth/register", json={
        "email": "domain_dash@example.com",
        "password": "Password123!",
        "full_name": "Domain Dashboard",
        "currency": "USD"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Test isolated domain endpoints
    f_res = await client.get("/api/v1/dashboard/finance?preset=7d", headers=headers)
    assert f_res.status_code == 200
    assert "total_income" in f_res.json()

    s_res = await client.get("/api/v1/dashboard/study?preset=7d", headers=headers)
    assert s_res.status_code == 200
    assert "total_study_hours" in s_res.json()

    h_res = await client.get("/api/v1/dashboard/habits?preset=7d", headers=headers)
    assert h_res.status_code == 200
    assert "avg_sleep_hours" in h_res.json()
