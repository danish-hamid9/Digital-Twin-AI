"""
End-to-End Tests for ML Prediction Endpoints (Phase 4)
Tests predictions for:
  1. Zero-history user (verifies fallback to global model and metadata).
  2. Data-rich user (verifies smooth blending, valid confidence intervals, scenarios).
  3. All three domains (finance, study, habits) and overview endpoint.
"""

import pytest
from datetime import date, timedelta
from httpx import AsyncClient

from app.models.finance import FinanceEntry
from app.models.study import StudySession
from app.models.habit import HabitLog
from app.models.user import User
from sqlalchemy import select


async def get_auth_token(client: AsyncClient, email: str = "pred_user@example.com") -> str:
    res = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "Password123!", "full_name": "Prediction Tester"},
    )
    assert res.status_code == 201
    return res.json()["access_token"]


@pytest.mark.asyncio
async def test_predictions_zero_history_user(client: AsyncClient):
    """Verifies that a user with 0 entries receives valid global model predictions with confidence bands."""
    token = await get_auth_token(client, email="zero_history@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Finance Prediction
    f_res = await client.get("/api/v1/predictions/finance?horizon_months=4", headers=headers)
    assert f_res.status_code == 200
    f_data = f_res.json()
    assert f_data["domain"] == "finance"
    assert f_data["data_source"] == "global"
    assert f_data["personal_weight"] == 0.0
    assert f_data["user_data_points"] == 0
    assert len(f_data["forecasts"]) == 4

    for f in f_data["forecasts"]:
        exp = f["projected_expenses"]
        assert exp["lower"] <= exp["expected"] <= exp["upper"]
        cum = f["cumulative_savings"]
        assert cum["lower"] <= cum["expected"] <= cum["upper"]

    # 2. Study Prediction
    s_res = await client.get("/api/v1/predictions/study", headers=headers)
    assert s_res.status_code == 200
    s_data = s_res.json()
    assert s_data["domain"] == "study"
    assert s_data["data_source"] == "global"
    assert s_data["personal_weight"] == 0.0
    score_ci = s_data["current_predicted_score"]
    assert 0.0 <= score_ci["lower"] <= score_ci["expected"] <= score_ci["upper"] <= 100.0
    assert len(s_data["feature_importance"]) > 0
    assert len(s_data["study_hours_scenarios"]) == 5

    # 3. Habit Prediction
    h_res = await client.get("/api/v1/predictions/habits", headers=headers)
    assert h_res.status_code == 200
    h_data = h_res.json()
    assert h_data["domain"] == "habits"
    assert h_data["data_source"] == "global"
    assert h_data["personal_weight"] == 0.0
    assert 0.0 <= h_data["streak_continuation_probability"] <= 1.0
    assert 0.0 <= h_data["burnout_risk_score"] <= 1.0
    assert h_data["burnout_risk_level"] in ["low", "moderate", "high"]
    assert len(h_data["risk_factors"]) >= 4
    assert len(h_data["recommendations"]) >= 1


@pytest.mark.asyncio
async def test_predictions_data_rich_user(client: AsyncClient):
    """Verifies that a user with historical records receives blended/personal predictions."""
    token = await get_auth_token(client, email="rich_user@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    today = date.today()

    # Seed 35 finance transactions
    for i in range(35):
        d_str = (today - timedelta(days=35 - i)).isoformat()
        if i % 15 == 0:
            await client.post(
                "/api/v1/finance/entries",
                headers=headers,
                json={"date": d_str, "type": "income", "category": "Salary", "amount": 3500.0},
            )
        await client.post(
            "/api/v1/finance/entries",
            headers=headers,
            json={"date": d_str, "type": "expense", "category": "Groceries", "amount": 60.0},
        )

    # Seed 20 study sessions
    for i in range(20):
        d_str = (today - timedelta(days=20 - i)).isoformat()
        await client.post(
            "/api/v1/study/sessions",
            headers=headers,
            json={"date": d_str, "subject": "Machine Learning", "hours": 3.5, "score": 90.0},
        )

    # Seed 25 habit logs
    for i in range(25):
        d_str = (today - timedelta(days=25 - i)).isoformat()
        await client.post(
            "/api/v1/habits/logs",
            headers=headers,
            json={"date": d_str, "habit": "Gym", "done": True, "sleep_hours": 7.5, "exercise_minutes": 40, "mood": 4},
        )

    # 1. Finance Prediction
    f_res = await client.get("/api/v1/predictions/finance?horizon_months=3", headers=headers)
    assert f_res.status_code == 200
    f_data = f_res.json()
    assert f_data["data_source"] == "personal"  # >= 30 points
    assert f_data["personal_weight"] == 1.0
    assert f_data["user_data_points"] >= 35

    # 2. Study Prediction
    s_res = await client.get("/api/v1/predictions/study", headers=headers)
    assert s_res.status_code == 200
    s_data = s_res.json()
    assert s_data["data_source"] == "blended"  # 20 points
    assert 0.6 <= s_data["personal_weight"] <= 0.7
    assert s_data["user_data_points"] == 20

    # 3. Habits Prediction
    h_res = await client.get("/api/v1/predictions/habits", headers=headers)
    assert h_res.status_code == 200
    h_data = h_res.json()
    assert h_data["data_source"] == "blended"  # 25 points
    assert 0.8 <= h_data["personal_weight"] <= 0.9

    # 4. Overview Prediction Endpoint
    ov_res = await client.get("/api/v1/predictions/overview", headers=headers)
    assert ov_res.status_code == 200
    ov_data = ov_res.json()
    assert "finance" in ov_data
    assert "study" in ov_data
    assert "habits" in ov_data
    assert ov_data["finance"]["domain"] == "finance"
    assert ov_data["study"]["domain"] == "study"
    assert ov_data["habits"]["domain"] == "habits"
