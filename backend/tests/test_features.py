"""
Unit tests for Feature Engineering Pipeline (ml/features.py)
"""

import pytest
from datetime import date, timedelta
import pandas as pd
import numpy as np

from ml.features import (
    extract_finance_features,
    extract_study_features,
    extract_habit_burnout_features,
    FINANCE_CATEGORIES,
)


def test_finance_features_empty():
    res = extract_finance_features([])
    assert res.empty


def test_finance_features_rolling_and_categories():
    base = date(2026, 1, 1)
    entries = []
    for i in range(40):
        d = base + timedelta(days=i)
        # Income on 1st of month
        if i in (0, 30):
            entries.append({"date": d, "amount": 4000.0, "type": "income", "category": "Salary"})
        # Daily expenses
        entries.append({"date": d, "amount": 50.0, "type": "expense", "category": "Groceries"})
        if i % 3 == 0:
            entries.append({"date": d, "amount": 30.0, "type": "expense", "category": "Dining Out"})

    df = extract_finance_features(entries, source="user")
    assert not df.empty
    assert "rolling_7d_expenses" in df.columns
    assert "rolling_30d_expenses" in df.columns
    assert "pct_Groceries" in df.columns
    assert "pct_Dining Out" in df.columns
    assert "savings_rate" in df.columns
    assert "source" in df.columns
    assert df["source"].iloc[0] == "user"
    assert df["is_user"].iloc[0] == 1
    assert df["is_kaggle"].iloc[0] == 0

    # Ensure rolling values are positive
    assert (df["rolling_30d_expenses"] > 0).any()
    assert (df["pct_Groceries"] >= 0).all() and (df["pct_Groceries"] <= 1.0).all()


def test_study_features_empty():
    res = extract_study_features([])
    assert res.empty


def test_study_features_consistency_and_habits():
    base = date(2026, 2, 1)
    sessions = []
    habits = []
    for i in range(20):
        d = base + timedelta(days=i)
        if i % 2 == 0:
            sessions.append({"date": d, "hours": 3.0, "score": 85.0, "subject": "Math"})
        habits.append({"date": d, "sleep_hours": 7.5, "exercise_minutes": 30, "mood": 4})

    df = extract_study_features(sessions, habit_logs=habits, source="synthetic")
    assert not df.empty
    assert "rolling_7d_study_hours" in df.columns
    assert "study_frequency_7d" in df.columns
    assert "rolling_7d_sleep" in df.columns
    assert "rolling_7d_exercise" in df.columns
    assert df["source"].iloc[0] == "synthetic"
    assert df["is_synthetic"].iloc[0] == 1

    # Check consistency bound [0, 1]
    assert (df["study_frequency_7d"] >= 0.0).all() and (df["study_frequency_7d"] <= 1.0).all()


def test_habit_burnout_features_and_streak():
    base = date(2026, 3, 1)
    logs = []
    for i in range(25):
        d = base + timedelta(days=i)
        # Sleep debt in second half
        sleep = 8.0 if i < 15 else 5.0
        mood = 4 if i < 15 else 2
        logs.append({
            "date": d,
            "sleep_hours": sleep,
            "exercise_minutes": 25 if i < 15 else 5,
            "mood": mood,
            "done": True if i < 15 else False,
        })

    df = extract_habit_burnout_features(logs, source="user")
    assert not df.empty
    assert "rolling_7d_sleep" in df.columns
    assert "sleep_debt_7d" in df.columns
    assert "current_streak" in df.columns
    assert "streak_continued" in df.columns
    assert "burnout_risk_target" in df.columns

    # Sleep debt should increase in second half
    assert df["sleep_debt_7d"].iloc[-1] > df["sleep_debt_7d"].iloc[10]
    # Current streak should be reset when done is False
    assert df["current_streak"].iloc[-1] == 0
