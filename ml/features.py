"""
Feature Engineering Pipeline for Digital Twin AI
Transforms raw finance_entries, study_sessions, and habit_logs into
model-ready tabular features with rolling aggregations, category breakdowns,
consistency metrics, and source-awareness (kaggle / synthetic / user).
"""

from typing import List, Dict, Any, Optional, Union
from datetime import date, datetime, timedelta
import numpy as np
import pandas as pd

# Core expense categories recognized in the system
FINANCE_CATEGORIES = [
    "Housing/Rent",
    "Groceries",
    "Transportation",
    "Dining Out",
    "Entertainment",
    "Utilities",
    "Healthcare",
    "Education",
    "Miscellaneous",
]


def _ensure_dataframe(data: Union[List[Dict[str, Any]], pd.DataFrame]) -> pd.DataFrame:
    if isinstance(data, pd.DataFrame):
        return data.copy()
    if not data:
        return pd.DataFrame()
    return pd.DataFrame(data)


# ---------------------------------------------------------------------------
# 1. Finance Feature Engineering
# ---------------------------------------------------------------------------

def extract_finance_features(
    entries: Union[List[Dict[str, Any]], pd.DataFrame],
    source: str = "synthetic",
    horizon_months: int = 6,
) -> pd.DataFrame:
    """
    Transforms raw finance entries into daily and monthly features:
      - Rolling 7-day and 30-day average expenses & income
      - Spending by category percentage shares
      - Savings rate and rolling burn rate
      - Source tracking ('kaggle', 'synthetic', 'user')
    """
    df = _ensure_dataframe(entries)
    if df.empty:
        return pd.DataFrame()

    # Ensure required columns
    df["date"] = pd.to_datetime(df["date"]).dt.date
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce").fillna(0.0)
    df["type"] = df["type"].astype(str).str.lower()
    df["category"] = df["category"].astype(str)
    if "source" not in df.columns:
        df["source"] = source

    # Aggregate daily totals
    daily_records = []
    unique_dates = sorted(df["date"].unique())
    if not unique_dates:
        return pd.DataFrame()

    # Create continuous daily timeline
    start_d, end_d = unique_dates[0], unique_dates[-1]
    full_dates = [start_d + timedelta(days=i) for i in range((end_d - start_d).days + 1)]

    # Determine default entity source
    observed_sources = df["source"].dropna().unique()
    entity_source = str(observed_sources[0]) if len(observed_sources) > 0 else source

    for d in full_dates:
        day_entries = df[df["date"] == d]
        income = day_entries[day_entries["type"] == "income"]["amount"].sum()
        expenses = day_entries[day_entries["type"] == "expense"]["amount"].sum()

        daily_source = (
            str(day_entries["source"].iloc[0])
            if (not day_entries.empty and "source" in day_entries.columns)
            else entity_source
        )

        cat_breakdown = {f"cat_{cat}": 0.0 for cat in FINANCE_CATEGORIES}
        for _, row in day_entries[day_entries["type"] == "expense"].iterrows():
            c = row["category"]
            col_name = f"cat_{c}"
            if col_name in cat_breakdown:
                cat_breakdown[col_name] += float(row["amount"])
            else:
                cat_breakdown["cat_Miscellaneous"] += float(row["amount"])

        daily_records.append({
            "date": d,
            "daily_income": float(income),
            "daily_expenses": float(expenses),
            "net_daily": float(income - expenses),
            "source": daily_source,
            **cat_breakdown,
        })

    daily_df = pd.DataFrame(daily_records)
    daily_df = daily_df.sort_values("date").reset_index(drop=True)

    # Rolling windows
    daily_df["rolling_7d_expenses"] = daily_df["daily_expenses"].rolling(window=7, min_periods=1).mean()
    daily_df["rolling_30d_expenses"] = daily_df["daily_expenses"].rolling(window=30, min_periods=1).mean()
    daily_df["rolling_30d_income"] = daily_df["daily_income"].rolling(window=30, min_periods=1).mean()
    daily_df["rolling_30d_savings"] = daily_df["rolling_30d_income"] - daily_df["rolling_30d_expenses"]

    # Savings rate
    daily_df["savings_rate"] = np.where(
        daily_df["rolling_30d_income"] > 0,
        (daily_df["rolling_30d_savings"] / daily_df["rolling_30d_income"]).clip(-1.0, 1.0),
        0.0,
    )

    # Category percentage shares of 30-day expenses
    for cat in FINANCE_CATEGORIES:
        cat_col = f"cat_{cat}"
        rolling_cat = daily_df[cat_col].rolling(window=30, min_periods=1).sum()
        rolling_exp_sum = daily_df["daily_expenses"].rolling(window=30, min_periods=1).sum()
        daily_df[f"pct_{cat}"] = np.where(
            rolling_exp_sum > 0,
            (rolling_cat / rolling_exp_sum).clip(0.0, 1.0),
            0.0,
        )

    # Expense Volatility
    daily_df["expense_volatility_30d"] = (
        daily_df["daily_expenses"].rolling(window=30, min_periods=1).std().fillna(0.0)
    )

    # One-hot/source feature flags
    daily_df["is_kaggle"] = (daily_df["source"] == "kaggle").astype(int)
    daily_df["is_synthetic"] = (daily_df["source"] == "synthetic").astype(int)
    daily_df["is_user"] = (daily_df["source"] == "user").astype(int)

    return daily_df


# ---------------------------------------------------------------------------
# 2. Study Feature Engineering
# ---------------------------------------------------------------------------

def extract_study_features(
    study_sessions: Union[List[Dict[str, Any]], pd.DataFrame],
    habit_logs: Optional[Union[List[Dict[str, Any]], pd.DataFrame]] = None,
    source: str = "synthetic",
) -> pd.DataFrame:
    """
    Transforms study sessions and habits into model-ready features for score prediction:
      - Rolling 7d/30d study hours
      - Study consistency (variance of daily study, active study day frequency)
      - Cross-domain features from habits: rolling 7d sleep, exercise, mood
      - Target: assessment score (0-100)
    """
    s_df = _ensure_dataframe(study_sessions)
    if s_df.empty:
        return pd.DataFrame()

    s_df["date"] = pd.to_datetime(s_df["date"]).dt.date
    s_df["hours"] = pd.to_numeric(s_df["hours"], errors="coerce").fillna(0.0)
    s_df["score"] = pd.to_numeric(s_df.get("score", np.nan), errors="coerce")
    s_df["subject"] = s_df.get("subject", "General").astype(str)

    # Aggregate daily study
    daily_study = (
        s_df.groupby("date")
        .agg(
            total_study_hours=("hours", "sum"),
            avg_score=("score", "mean"),
            subjects_count=("subject", "nunique"),
            sessions_count=("hours", "count"),
        )
        .reset_index()
    )

    # Sort chronologically
    daily_study = daily_study.sort_values("date").reset_index(drop=True)

    # Reindex to continuous timeline for accurate rolling consistency
    start_d, end_d = daily_study["date"].iloc[0], daily_study["date"].iloc[-1]
    full_dates = [start_d + timedelta(days=i) for i in range((end_d - start_d).days + 1)]
    timeline_df = pd.DataFrame({"date": full_dates})
    merged = pd.merge(timeline_df, daily_study, on="date", how="left")
    merged["total_study_hours"] = merged["total_study_hours"].fillna(0.0)
    merged["subjects_count"] = merged["subjects_count"].fillna(0)
    merged["sessions_count"] = merged["sessions_count"].fillna(0)

    # Rolling study hours
    merged["rolling_7d_study_hours"] = merged["total_study_hours"].rolling(window=7, min_periods=1).sum()
    merged["rolling_30d_study_hours"] = merged["total_study_hours"].rolling(window=30, min_periods=1).sum()

    # Consistency: count of active study days in past 7d and 30d
    merged["active_study_day"] = (merged["total_study_hours"] > 0).astype(int)
    merged["study_frequency_7d"] = merged["active_study_day"].rolling(window=7, min_periods=1).mean()
    merged["study_frequency_30d"] = merged["active_study_day"].rolling(window=30, min_periods=1).mean()
    merged["study_variance_7d"] = (
        merged["total_study_hours"].rolling(window=7, min_periods=1).std().fillna(0.0)
    )

    # Subject diversity ratio
    merged["rolling_subject_diversity"] = (
        merged["subjects_count"].rolling(window=7, min_periods=1).mean()
    )

    # Cross-domain Habit data
    if habit_logs is not None:
        h_df = _ensure_dataframe(habit_logs)
        if not h_df.empty:
            h_df["date"] = pd.to_datetime(h_df["date"]).dt.date
            h_df["sleep_hours"] = pd.to_numeric(h_df.get("sleep_hours", 7.0), errors="coerce").fillna(7.0)
            h_df["exercise_minutes"] = pd.to_numeric(h_df.get("exercise_minutes", 0), errors="coerce").fillna(0)
            h_df["mood"] = pd.to_numeric(h_df.get("mood", 3), errors="coerce").fillna(3)

            daily_habits = (
                h_df.groupby("date")
                .agg(
                    sleep_hours=("sleep_hours", "mean"),
                    exercise_minutes=("exercise_minutes", "sum"),
                    mood=("mood", "mean"),
                )
                .reset_index()
            )
            merged = pd.merge(merged, daily_habits, on="date", how="left")

    # Default habit metrics if missing
    if "sleep_hours" not in merged.columns:
        merged["sleep_hours"] = 7.0
    if "exercise_minutes" not in merged.columns:
        merged["exercise_minutes"] = 20.0
    if "mood" not in merged.columns:
        merged["mood"] = 3.0

    merged["sleep_hours"] = merged["sleep_hours"].fillna(7.0)
    merged["exercise_minutes"] = merged["exercise_minutes"].fillna(20.0)
    merged["mood"] = merged["mood"].fillna(3.0)

    # Rolling habit features
    merged["rolling_7d_sleep"] = merged["sleep_hours"].rolling(window=7, min_periods=1).mean()
    merged["rolling_7d_exercise"] = merged["exercise_minutes"].rolling(window=7, min_periods=1).mean()
    merged["rolling_7d_mood"] = merged["mood"].rolling(window=7, min_periods=1).mean()

    # Source tags
    if "source" in s_df.columns:
        observed_sources = s_df["source"].dropna().unique()
        entity_src = str(observed_sources[0]) if len(observed_sources) > 0 else source
        source_map = s_df.groupby("date")["source"].first()
        merged["source"] = merged["date"].map(source_map).fillna(entity_src)
    else:
        merged["source"] = source

    merged["is_kaggle"] = (merged["source"] == "kaggle").astype(int)
    merged["is_synthetic"] = (merged["source"] == "synthetic").astype(int)
    merged["is_user"] = (merged["source"] == "user").astype(int)

    # Only rows with valid assessment score for supervised training / evaluation
    return merged


# ---------------------------------------------------------------------------
# 3. Habit & Burnout Feature Engineering
# ---------------------------------------------------------------------------

def extract_habit_burnout_features(
    habit_logs: Union[List[Dict[str, Any]], pd.DataFrame],
    study_sessions: Optional[Union[List[Dict[str, Any]], pd.DataFrame]] = None,
    target_sleep_hours: float = 7.5,
    source: str = "synthetic",
    entity_col: Optional[str] = None,
) -> pd.DataFrame:
    """
    Transforms habit logs and study workload into model-ready features for:
      - Streak continuation prediction
      - Burnout risk calibration
    Supports multi-entity/persona processing via entity_col.
    """
    h_df = _ensure_dataframe(habit_logs)
    if h_df.empty:
        return pd.DataFrame()

    if entity_col and entity_col in h_df.columns:
        results = []
        for entity_val, group in h_df.groupby(entity_col):
            entity_study = None
            if study_sessions is not None:
                s_df = _ensure_dataframe(study_sessions)
                if not s_df.empty and entity_col in s_df.columns:
                    entity_study = s_df[s_df[entity_col] == entity_val]
                else:
                    entity_study = study_sessions

            group_source = (
                str(group["source"].dropna().iloc[0])
                if ("source" in group.columns and not group["source"].dropna().empty)
                else source
            )

            entity_features = extract_habit_burnout_features(
                habit_logs=group,
                study_sessions=entity_study,
                target_sleep_hours=target_sleep_hours,
                source=group_source,
                entity_col=None,
            )
            if not entity_features.empty:
                entity_features[entity_col] = entity_val
                results.append(entity_features)
        if results:
            return pd.concat(results, ignore_index=True).sort_values("date").reset_index(drop=True)
        return pd.DataFrame()

    h_df["date"] = pd.to_datetime(h_df["date"]).dt.date
    h_df["sleep_hours"] = pd.to_numeric(h_df.get("sleep_hours", 7.0), errors="coerce").fillna(7.0)
    h_df["exercise_minutes"] = pd.to_numeric(h_df.get("exercise_minutes", 0), errors="coerce").fillna(0)
    h_df["mood"] = pd.to_numeric(h_df.get("mood", 3), errors="coerce").fillna(3)
    h_df["done"] = h_df.get("done", False).astype(bool)

    # Daily aggregation
    daily_h = (
        h_df.groupby("date")
        .agg(
            sleep_hours=("sleep_hours", "mean"),
            exercise_minutes=("exercise_minutes", "sum"),
            mood=("mood", "mean"),
            habit_done=("done", lambda x: bool(any(x))),
        )
        .reset_index()
    )

    daily_h = daily_h.sort_values("date").reset_index(drop=True)

    # Continuous timeline
    start_d, end_d = daily_h["date"].iloc[0], daily_h["date"].iloc[-1]
    full_dates = [start_d + timedelta(days=i) for i in range((end_d - start_d).days + 1)]
    timeline = pd.DataFrame({"date": full_dates})
    merged = pd.merge(timeline, daily_h, on="date", how="left")
    merged["sleep_hours"] = merged["sleep_hours"].fillna(7.0)
    merged["exercise_minutes"] = merged["exercise_minutes"].fillna(0.0)
    merged["mood"] = merged["mood"].fillna(3.0)
    merged["habit_done"] = merged["habit_done"].fillna(False)

    # Rolling Sleep & Debt
    merged["rolling_7d_sleep"] = merged["sleep_hours"].rolling(window=7, min_periods=1).mean()
    merged["sleep_debt_7d"] = np.maximum(0.0, target_sleep_hours - merged["rolling_7d_sleep"])

    # Rolling Exercise & Mood
    merged["rolling_7d_exercise"] = merged["exercise_minutes"].rolling(window=7, min_periods=1).mean()
    merged["rolling_7d_mood"] = merged["mood"].rolling(window=7, min_periods=1).mean()
    merged["rolling_14d_mood"] = merged["mood"].rolling(window=14, min_periods=1).mean()
    merged["mood_trend"] = merged["rolling_7d_mood"] - merged["rolling_14d_mood"]

    # Rolling Cognitive Workload (from Study Sessions)
    if study_sessions is not None:
        s_df = _ensure_dataframe(study_sessions)
        if not s_df.empty:
            s_df["date"] = pd.to_datetime(s_df["date"]).dt.date
            s_df["hours"] = pd.to_numeric(s_df.get("hours", 0.0), errors="coerce").fillna(0.0)
            daily_workload = s_df.groupby("date")["hours"].sum().reset_index()
            daily_workload.rename(columns={"hours": "daily_study_workload"}, inplace=True)
            merged = pd.merge(merged, daily_workload, on="date", how="left")

    if "daily_study_workload" not in merged.columns:
        merged["daily_study_workload"] = 2.0
    merged["daily_study_workload"] = merged["daily_study_workload"].fillna(0.0)
    merged["rolling_7d_workload"] = merged["daily_study_workload"].rolling(window=7, min_periods=1).mean()

    # Calculate Current Running Streak
    streaks = []
    curr = 0
    for done in merged["habit_done"]:
        if done:
            curr += 1
        else:
            curr = 0
        streaks.append(curr)
    merged["current_streak"] = streaks

    # Target 1: Next Day Streak Continued
    merged["streak_continued"] = merged["habit_done"].shift(-1).fillna(False).astype(int)

    # Target 2: High Burnout Risk
    # Heuristic definition calibrated across medical/student/workload literature:
    # High risk when sleep debt is severe (> 1.5h), mood <= 2.2, or high workload with low recovery
    merged["burnout_risk_target"] = (
        (merged["sleep_debt_7d"] >= 1.5) & (merged["rolling_7d_mood"] <= 2.5)
        | ((merged["rolling_7d_workload"] >= 5.0) & (merged["rolling_7d_sleep"] < 6.0))
        | ((merged["rolling_7d_mood"] <= 2.0) & (merged["rolling_7d_exercise"] < 10.0))
    ).astype(int)

    # Source tags: preserve row source if present in input, else fallback to parameter
    if "source" in h_df.columns:
        observed_sources = h_df["source"].dropna().unique()
        entity_source = str(observed_sources[0]) if len(observed_sources) > 0 else source
        source_map = h_df.groupby("date")["source"].first()
        merged["source"] = merged["date"].map(source_map).fillna(entity_source)
    else:
        merged["source"] = source

    merged["is_kaggle"] = (merged["source"] == "kaggle").astype(int)
    merged["is_synthetic"] = (merged["source"] == "synthetic").astype(int)
    merged["is_user"] = (merged["source"] == "user").astype(int)

    return merged
