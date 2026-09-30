"""
Unit and Integration Tests for Phase 6 Recommendation Engine
Verifies:
  1. Emergency fund rule triggers when savings runway < 3 months and cites exact user numbers.
  2. Savings goal pace warning triggers when pace is behind.
  3. Sleep < 6.5h coinciding with falling exam scores triggers cognitive sleep debt alert.
  4. Habit streak drop-off warning triggers after 3+ missed days following a streak.
  5. Healthy user (all thresholds satisfied) receives zero false alarms / positive reinforcement.
  6. End-to-end API integration via GET /api/v1/recommendations.
"""

import pytest
from datetime import date, timedelta
from httpx import AsyncClient

from app.models.finance import FinanceEntry, SavingsGoal
from app.models.study import StudySession
from app.models.habit import HabitLog
from app.models.user import Profile
from app.services.recommendation_service import recommendation_service
from app.core.simulation_config import (
    EMERGENCY_FUND_MONTHS_THRESHOLD,
    SLEEP_THRESHOLD_HOURS,
    HABIT_STREAK_DROP_DAYS_THRESHOLD,
    RECOMMENDATION_DISCLAIMER_TEXT,
)


# ===========================================================================
# 1. Deterministic Rule Trigger Tests (Service Unit Tests)
# ===========================================================================

def test_emergency_fund_rule_triggers_and_cites_numbers():
    """Confirms emergency fund rule fires when runway < 3 months, citing exact user numbers."""
    today = date.today()
    # Income: $3,000, Expenses: $2,500 across 30 days -> Net savings $500. Monthly burn: $2,500.
    # Runway = 500 / 2500 = 0.2 months (< 3.0 threshold)
    entries = [
        FinanceEntry(date=today - timedelta(days=20), type="income", category="Salary", amount=3000.0),
        FinanceEntry(date=today - timedelta(days=15), type="expense", category="Rent", amount=1800.0),
        FinanceEntry(date=today - timedelta(days=10), type="expense", category="Groceries", amount=700.0),
    ]
    profile = Profile(currency="USD")

    res = recommendation_service.generate_recommendations(
        finance_entries=entries,
        savings_goals=[],
        study_sessions=[],
        habit_logs=[],
        profile=profile,
    )

    rec_ids = [r.id for r in res.recommendations]
    assert "rec_emergency_fund_low" in rec_ids

    rec = next(r for r in res.recommendations if r.id == "rec_emergency_fund_low")
    assert rec.domain == "finance"
    assert rec.priority == "high"  # runway < 1.5m -> high
    # Citations in explanation
    assert "0.2 months" in rec.explanation or "0.1 months" in rec.explanation or "months" in rec.explanation
    assert "$500" in rec.explanation or "500.00" in rec.explanation
    assert f"{EMERGENCY_FUND_MONTHS_THRESHOLD:.1f}-month" in rec.explanation
    assert rec.user_metric_name == "Savings Runway"
    assert res.disclaimer == RECOMMENDATION_DISCLAIMER_TEXT


def test_sleep_deficit_and_falling_scores_rule_triggers():
    """Confirms sleep < 6.5h coinciding with falling assessment scores triggers recommendation."""
    today = date.today()
    # 14 days of low sleep (5.2h avg, below 6.5h)
    habit_logs = [
        HabitLog(
            date=today - timedelta(days=i),
            habit="Night Routine",
            done=False,
            sleep_hours=5.2,
            exercise_minutes=15,
            mood=2,
        )
        for i in range(14)
    ]

    # Falling scores: earlier sessions 88%, recent sessions 72%
    study_sessions = [
        StudySession(date=today - timedelta(days=25), subject="Math", hours=3.0, score=90.0),
        StudySession(date=today - timedelta(days=20), subject="CS", hours=3.0, score=86.0),
        StudySession(date=today - timedelta(days=8), subject="Math", hours=3.0, score=74.0),
        StudySession(date=today - timedelta(days=3), subject="CS", hours=3.0, score=70.0),
    ]

    res = recommendation_service.generate_recommendations(
        finance_entries=[],
        savings_goals=[],
        study_sessions=study_sessions,
        habit_logs=habit_logs,
        profile=Profile(currency="USD"),
    )

    rec_ids = [r.id for r in res.recommendations]
    assert "rec_sleep_deficit_study_drop" in rec_ids

    rec = next(r for r in res.recommendations if r.id == "rec_sleep_deficit_study_drop")
    assert rec.domain == "study"
    assert rec.priority == "high"
    assert "5.2 hours" in rec.explanation
    assert "6.5h" in rec.explanation
    assert "decline in assessment scores" in rec.explanation


def test_habit_streak_drop_off_rule_triggers():
    """Confirms drop-off alert fires after a strong streak (>=5) is broken with 3+ missed days."""
    today = date.today()
    # Habit had 7 days of consecutive completion, followed by 3 days of missed entries
    habit_logs = []
    # 7 completed days
    for i in range(10, 3, -1):
        habit_logs.append(
            HabitLog(date=today - timedelta(days=i), habit="Morning Meditation", done=True, sleep_hours=7.5)
        )
    # 3 missed days (days 3, 2, 1)
    for i in range(3, 0, -1):
        habit_logs.append(
            HabitLog(date=today - timedelta(days=i), habit="Morning Meditation", done=False, sleep_hours=7.0)
        )

    res = recommendation_service.generate_recommendations(
        finance_entries=[],
        savings_goals=[],
        study_sessions=[],
        habit_logs=habit_logs,
        profile=Profile(currency="USD"),
    )

    rec_ids = [r.id for r in res.recommendations]
    assert "rec_habit_streak_drop_morning_meditation" in rec_ids

    rec = next(r for r in res.recommendations if r.id == "rec_habit_streak_drop_morning_meditation")
    assert rec.domain == "habits"
    assert "7-day streak" in rec.explanation
    assert "3 consecutive days" in rec.explanation


def test_savings_pace_behind_goal_rule_triggers():
    """Confirms pace shortfall alert triggers when monthly contribution is insufficient for goal target date."""
    today = date.today()
    target_date = today + timedelta(days=90)  # 3 months away
    # Goal: Needs $1500 in 3 months = $500/month. User's monthly target is only $200/month.
    goal = SavingsGoal(
        title="Emergency Laptop",
        target_amount=2000.0,
        current_amount=500.0,  # $1500 left
        target_date=target_date,
    )
    profile = Profile(currency="USD", monthly_target_savings=200.0)

    res = recommendation_service.generate_recommendations(
        finance_entries=[],
        savings_goals=[goal],
        study_sessions=[],
        habit_logs=[],
        profile=profile,
    )

    rec = next((r for r in res.recommendations if "rec_savings_goal_shortfall" in r.id), None)
    assert rec is not None
    assert "Emergency Laptop" in rec.title
    assert "$500" in rec.explanation or "500.00" in rec.explanation
    assert "$200" in rec.explanation or "200.00" in rec.explanation


def test_healthy_user_gets_zero_alarms_and_positive_reinforcement():
    """Confirms a healthy user exceeding all safety thresholds gets zero false alarms."""
    today = date.today()
    # Large liquid savings ($20,000 on $2,500 burn -> 8 months runway > 3.0)
    entries = [
        FinanceEntry(date=today - timedelta(days=25), type="income", category="Salary", amount=25000.0),
        FinanceEntry(date=today - timedelta(days=15), type="expense", category="Rent", amount=1500.0),
        FinanceEntry(date=today - timedelta(days=10), type="expense", category="Living", amount=1000.0),
    ]
    # Optimal sleep (8.0h > 6.5h) & high exam scores (92%)
    habit_logs = [
        HabitLog(date=today - timedelta(days=i), habit="Fitness", done=True, sleep_hours=8.0, exercise_minutes=45)
        for i in range(14)
    ]
    study_sessions = [
        StudySession(date=today - timedelta(days=12), subject="Math", hours=4.0, score=92.0),
        StudySession(date=today - timedelta(days=6), subject="CS", hours=4.0, score=95.0),
    ]

    res = recommendation_service.generate_recommendations(
        finance_entries=entries,
        savings_goals=[],
        study_sessions=study_sessions,
        habit_logs=habit_logs,
        profile=Profile(currency="USD"),
    )

    # Must contain ZERO high or medium priority risk warnings
    assert res.high_priority_count == 0
    assert not any(r.priority in ("high", "medium") for r in res.recommendations)

    # Should contain positive reinforcement recommendation
    assert len(res.recommendations) == 1
    assert res.recommendations[0].category == "positive_reinforcement"
    assert "Optimal" in res.recommendations[0].title or "Balance" in res.recommendations[0].title


# ===========================================================================
# 2. End-to-End API Test
# ===========================================================================

@pytest.mark.asyncio
async def test_get_recommendations_endpoint_e2e(client: AsyncClient):
    """Verifies GET /api/v1/recommendations delivers valid schema with educational disclaimer."""
    # Register test user
    res = await client.post(
        "/api/v1/auth/register",
        json={"email": "rec_user@example.com", "password": "Password123!", "full_name": "Rec Tester"},
    )
    assert res.status_code == 201
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Call recommendations endpoint
    rec_res = await client.get("/api/v1/recommendations", headers=headers)
    assert rec_res.status_code == 200
    data = rec_res.json()

    assert "recommendations" in data
    assert "total_count" in data
    assert "high_priority_count" in data
    assert "disclaimer" in data
    assert RECOMMENDATION_DISCLAIMER_TEXT in data["disclaimer"]
