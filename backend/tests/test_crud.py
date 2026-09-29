import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_finance_validation_and_pagination(client: AsyncClient):
    """Test validation (reject negative amount, invalid date) and pagination"""
    reg_res = await client.post("/api/v1/auth/register", json={
        "email": "finance_val@example.com", "password": "Password123!"
    })
    headers = {"Authorization": f"Bearer {reg_res.json()['access_token']}"}

    # 1. Reject negative amount
    res_neg = await client.post("/api/v1/finance/entries", json={
        "date": "2026-09-01",
        "type": "expense",
        "category": "Food",
        "amount": -50.0
    }, headers=headers)
    assert res_neg.status_code == 422

    # 2. Reject zero amount
    res_zero = await client.post("/api/v1/finance/entries", json={
        "date": "2026-09-01",
        "type": "expense",
        "category": "Food",
        "amount": 0.0
    }, headers=headers)
    assert res_zero.status_code == 422

    # 3. Reject invalid type
    res_type = await client.post("/api/v1/finance/entries", json={
        "date": "2026-09-01",
        "type": "random_type",
        "category": "Food",
        "amount": 50.0
    }, headers=headers)
    assert res_type.status_code == 422

    # 4. Reject insane date (year 1900 or 2150)
    res_old_date = await client.post("/api/v1/finance/entries", json={
        "date": "1980-01-01",
        "type": "expense",
        "category": "Food",
        "amount": 50.0
    }, headers=headers)
    assert res_old_date.status_code == 422

    # 5. Insert 5 entries and test pagination & date filtering
    for i in range(1, 6):
        await client.post("/api/v1/finance/entries", json={
            "date": f"2026-09-0{i}",
            "type": "expense" if i % 2 == 0 else "income",
            "category": f"Cat_{i}",
            "amount": float(i * 100)
        }, headers=headers)

    # Test page_size=2
    res_p1 = await client.get("/api/v1/finance/entries?page=1&page_size=2", headers=headers)
    assert res_p1.status_code == 200
    p1_data = res_p1.json()
    assert p1_data["total"] == 5
    assert len(p1_data["items"]) == 2
    assert p1_data["total_pages"] == 3

    # Test date filtering
    res_filter = await client.get("/api/v1/finance/entries?start_date=2026-09-02&end_date=2026-09-04", headers=headers)
    assert res_filter.status_code == 200
    filtered_items = res_filter.json()["items"]
    assert len(filtered_items) == 3
    dates = [x["date"] for x in filtered_items]
    assert all("2026-09-02" <= d <= "2026-09-04" for d in dates)


@pytest.mark.asyncio
async def test_study_validation(client: AsyncClient):
    """Test validation: reject negative study hours or > 24 hours"""
    reg_res = await client.post("/api/v1/auth/register", json={
        "email": "study_val@example.com", "password": "Password123!"
    })
    headers = {"Authorization": f"Bearer {reg_res.json()['access_token']}"}

    # Reject negative hours
    res_neg_hours = await client.post("/api/v1/study/sessions", json={
        "date": "2026-09-01",
        "subject": "Physics",
        "hours": -2.0
    }, headers=headers)
    assert res_neg_hours.status_code == 422

    # Reject hours > 24
    res_overflow = await client.post("/api/v1/study/sessions", json={
        "date": "2026-09-01",
        "subject": "Physics",
        "hours": 26.0
    }, headers=headers)
    assert res_overflow.status_code == 422

    # Reject score > 100
    res_score = await client.post("/api/v1/study/sessions", json={
        "date": "2026-09-01",
        "subject": "Physics",
        "hours": 3.0,
        "score": 110.0
    }, headers=headers)
    assert res_score.status_code == 422

    # Valid creation
    res_ok = await client.post("/api/v1/study/sessions", json={
        "date": "2026-09-01",
        "subject": "Physics",
        "hours": 3.5,
        "score": 88.0
    }, headers=headers)
    assert res_ok.status_code == 201
    assert res_ok.json()["hours"] == 3.5


@pytest.mark.asyncio
async def test_habit_validation(client: AsyncClient):
    """Test validation: sleep hours in [0, 24], mood in [1, 5]"""
    reg_res = await client.post("/api/v1/auth/register", json={
        "email": "habit_val@example.com", "password": "Password123!"
    })
    headers = {"Authorization": f"Bearer {reg_res.json()['access_token']}"}

    # Reject invalid mood (< 1 or > 5)
    res_bad_mood = await client.post("/api/v1/habits/logs", json={
        "date": "2026-09-01",
        "habit": "Cardio",
        "mood": 10
    }, headers=headers)
    assert res_bad_mood.status_code == 422

    # Reject negative sleep
    res_neg_sleep = await client.post("/api/v1/habits/logs", json={
        "date": "2026-09-01",
        "habit": "Cardio",
        "sleep_hours": -1.0
    }, headers=headers)
    assert res_neg_sleep.status_code == 422

    # Valid log
    res_valid = await client.post("/api/v1/habits/logs", json={
        "date": "2026-09-01",
        "habit": "Cardio",
        "done": True,
        "sleep_hours": 7.5,
        "exercise_minutes": 45,
        "mood": 4
    }, headers=headers)
    assert res_valid.status_code == 201
    assert res_valid.json()["mood"] == 4
