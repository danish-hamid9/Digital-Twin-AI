"""
Prediction Service for Digital Twin AI
Loads joblib models, executes feature extraction, implements smooth
cold-start blending (personal_weight = min(1.0, user_points / 30.0)),
and computes confidence intervals for finance, study, and habit domains.
"""

import os
import json
import logging
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

import numpy as np
import pandas as pd
import joblib

from app.models.user import User, Profile
from app.models.finance import FinanceEntry
from app.models.study import StudySession
from app.models.habit import HabitLog
from app.schemas.prediction import (
    ConfidenceInterval,
    FinanceMonthlyForecast,
    FinancePredictionResponse,
    StudyScenario,
    StudyPredictionResponse,
    HabitRiskFactor,
    HabitPredictionResponse,
    OverviewPredictionResponse,
)

logger = logging.getLogger("app.services.predictor")

# Resolve models directory across container and local environments
POSSIBLE_MODEL_DIRS = [
    Path("/app/ml/models"),
    Path(__file__).resolve().parent.parent.parent.parent / "ml" / "models",
    Path("ml/models"),
]

MODELS_DIR = None
for p in POSSIBLE_MODEL_DIRS:
    if p.exists() and (p / "models_metadata.json").exists():
        MODELS_DIR = p
        break

if MODELS_DIR is None:
    # Default to first path
    MODELS_DIR = POSSIBLE_MODEL_DIRS[0]


class MLPredictorService:
    def __init__(self):
        self._models: Dict[str, Any] = {}
        self._metadata: Dict[str, Any] = {}
        self._load_models()

    def _load_models(self):
        """Loads and caches all three versioned ML artifacts."""
        metadata_file = MODELS_DIR / "models_metadata.json"
        if metadata_file.exists():
            try:
                with open(metadata_file, "r") as f:
                    self._metadata = json.load(f)
            except Exception as e:
                logger.error(f"Error loading {metadata_file}: {e}")

        # Load artifacts
        for domain, filename in [
            ("finance", "finance_v1.joblib"),
            ("study", "study_v1.joblib"),
            ("habits", "habits_v1.joblib"),
        ]:
            model_path = MODELS_DIR / filename
            if model_path.exists():
                try:
                    self._models[domain] = joblib.load(model_path)
                    logger.info(f"Loaded ML model: {filename}")
                except Exception as e:
                    logger.error(f"Failed to load {model_path}: {e}")
            else:
                logger.warning(f"Model artifact not found: {model_path}")

    # -------------------------------------------------------------
    # 1. Finance Prediction
    # -------------------------------------------------------------
    def predict_finance(
        self,
        entries: List[FinanceEntry],
        profile: Optional[Profile],
        horizon_months: int = 3,
    ) -> FinancePredictionResponse:
        horizon_months = max(1, min(6, horizon_months))
        model_artifact = self._models.get("finance")
        model_meta = self._metadata.get("models", {}).get("finance", {})

        n_points = len(entries)
        personal_weight = min(1.0, n_points / 30.0) if n_points > 0 else 0.0

        if n_points == 0:
            data_source = "global"
            explanation = (
                "Cold-start fallback: Forecast generated using the global benchmark model "
                "trained on Kaggle budget patterns, as no personal transactions have been recorded yet."
            )
        elif personal_weight < 1.0:
            data_source = "blended"
            explanation = (
                f"Blended forecast combining your personal transaction history ({int(personal_weight * 100)}%) "
                f"with the global financial benchmark model ({int((1 - personal_weight) * 100)}%)."
            )
        else:
            data_source = "personal"
            explanation = (
                "Personalized forecast based fully on your continuous transaction history."
            )

        # Baseline stats
        if n_points > 0:
            incomes = [float(e.amount) for e in entries if e.type == "income"]
            expenses = [float(e.amount) for e in entries if e.type == "expense"]

            # Estimate monthly figures
            dates = [e.date for e in entries]
            min_d, max_d = min(dates), max(dates)
            days_span = max(1, (max_d - min_d).days + 1)
            months_span = max(1.0, days_span / 30.0)

            monthly_income = (sum(incomes) / months_span) if incomes else (profile.monthly_target_savings * 2.5 if profile else 4000.0)
            monthly_expenses = (sum(expenses) / months_span) if expenses else (monthly_income * 0.7)
        else:
            monthly_income = 4500.0
            monthly_expenses = 2800.0

        # Global Ridge model prediction
        global_predicted_expenses = monthly_expenses
        residual_std = 350.0  # default reasonable error bound

        if model_artifact and "model" in model_artifact:
            try:
                model = model_artifact["model"]
                scaler = model_artifact["scaler"]
                residual_std = float(model_artifact.get("residual_std", 350.0))

                feat_names = model_artifact.get("feature_names", [
                    "income", "expenses", "net_savings",
                    "pct_housing", "pct_groceries", "pct_transport",
                    "pct_dining", "pct_entertainment", "pct_utilities",
                ])
                x_df = pd.DataFrame([[
                    monthly_income,
                    monthly_expenses,
                    monthly_income - monthly_expenses,
                    0.30, 0.20, 0.10, 0.10, 0.08, 0.07,
                ]], columns=feat_names)
                x_scaled = scaler.transform(x_df)
                global_predicted_expenses = float(model.predict(x_scaled)[0])
            except Exception as e:
                logger.error(f"Error evaluating finance model: {e}")

        forecasts: List[FinanceMonthlyForecast] = []
        cumulative_savings_expected = 0.0
        cumulative_savings_lower = 0.0
        cumulative_savings_upper = 0.0

        today = date.today()

        for m in range(1, horizon_months + 1):
            target_date = (today.replace(day=1) + timedelta(days=m * 31)).replace(day=1)
            date_str = target_date.strftime("%Y-%m")

            # Personal trend vs Global trend
            personal_exp_m = monthly_expenses * (1.0 + 0.01 * m)
            global_exp_m = global_predicted_expenses * (1.0 + 0.015 * np.sin(m * np.pi / 6))
            blended_exp = (1.0 - personal_weight) * global_exp_m + personal_weight * personal_exp_m

            # Horizon uncertainty expands with time (e.g. sqrt(1 + m / 6))
            horizon_scale = np.sqrt(1.0 + (m / 6.0))
            margin = 1.645 * (residual_std * 0.4 + blended_exp * 0.05) * horizon_scale

            exp_lower = max(200.0, round(blended_exp - margin, 2))
            exp_expected = round(blended_exp, 2)
            exp_upper = round(blended_exp + margin, 2)

            # Projected savings
            sav_expected = round(monthly_income - exp_expected, 2)
            sav_lower = round(monthly_income - exp_upper, 2)
            sav_upper = round(monthly_income - exp_lower, 2)

            # Cumulative savings
            cumulative_savings_expected += sav_expected
            cumulative_savings_lower += sav_lower
            cumulative_savings_upper += sav_upper

            forecasts.append(
                FinanceMonthlyForecast(
                    month_index=m,
                    projected_date=date_str,
                    projected_expenses=ConfidenceInterval(
                        lower=exp_lower,
                        expected=exp_expected,
                        upper=exp_upper,
                    ),
                    projected_savings=ConfidenceInterval(
                        lower=sav_lower,
                        expected=sav_expected,
                        upper=sav_upper,
                    ),
                    cumulative_savings=ConfidenceInterval(
                        lower=round(cumulative_savings_lower, 2),
                        expected=round(cumulative_savings_expected, 2),
                        upper=round(cumulative_savings_upper, 2),
                    ),
                )
            )

        six_m_sav = forecasts[-1].cumulative_savings

        return FinancePredictionResponse(
            domain="finance",
            horizon_months=horizon_months,
            current_monthly_income=round(monthly_income, 2),
            current_monthly_expenses=round(monthly_expenses, 2),
            forecasts=forecasts,
            projected_6m_savings=six_m_sav,
            data_source=data_source,
            personal_weight=round(personal_weight, 2),
            user_data_points=n_points,
            model_metadata=model_meta,
            explanation=explanation,
        )

    # -------------------------------------------------------------
    # 2. Study Performance Prediction
    # -------------------------------------------------------------
    def predict_study(
        self,
        sessions: List[StudySession],
        habits: List[HabitLog],
        profile: Optional[Profile],
    ) -> StudyPredictionResponse:
        model_artifact = self._models.get("study")
        model_meta = self._metadata.get("models", {}).get("study", {})

        n_points = len(sessions)
        personal_weight = min(1.0, n_points / 30.0) if n_points > 0 else 0.0

        if n_points == 0:
            data_source = "global"
            explanation = (
                "Cold-start fallback: Score predictions generated from the global student lifestyle "
                "RandomForest model, utilizing benchmark parameters until personal study sessions are logged."
            )
        elif personal_weight < 1.0:
            data_source = "blended"
            explanation = (
                f"Blended score prediction combining your logged sessions ({int(personal_weight * 100)}%) "
                f"with benchmark academic distributions ({int((1 - personal_weight) * 100)}%)."
            )
        else:
            data_source = "personal"
            explanation = "Personalized score prediction calibrated to your individual study consistency and exam results."

        # Extract features
        if n_points > 0:
            # Recent 7-day study hours
            seven_days_ago = date.today() - timedelta(days=7)
            recent_study = [float(s.hours) for s in sessions if s.date >= seven_days_ago]
            rolling_study_hours = sum(recent_study) if recent_study else (float(sessions[-1].hours) * 3)

            # Study consistency (active days / 7)
            study_dates = {s.date for s in sessions if s.date >= seven_days_ago}
            study_consistency = len(study_dates) / 7.0

            # Past user scores
            past_scores = [float(s.score) for s in sessions if s.score is not None]
            user_mean_score = (sum(past_scores) / len(past_scores)) if past_scores else None
        else:
            target_wk = profile.target_study_hours_week if profile else 15.0
            rolling_study_hours = float(target_wk)
            study_consistency = 0.71
            user_mean_score = None

        # Cross-domain habits
        if habits:
            recent_sleep = [float(l.sleep_hours) for l in habits if l.date >= (date.today() - timedelta(days=7))]
            recent_ex = [float(l.exercise_minutes) for l in habits if l.date >= (date.today() - timedelta(days=7))]
            recent_mood = [float(l.mood) for l in habits if l.date >= (date.today() - timedelta(days=7))]

            rolling_sleep = (sum(recent_sleep) / len(recent_sleep)) if recent_sleep else 7.2
            rolling_exercise = (sum(recent_ex) / len(recent_ex)) if recent_ex else 25.0
            rolling_mood = (sum(recent_mood) / len(recent_mood)) if recent_mood else 3.5
        else:
            rolling_sleep = profile.target_sleep_hours if profile else 7.5
            rolling_exercise = 25.0
            rolling_mood = 3.5

        feat_names = model_artifact.get("feature_names", [
            "rolling_study_hours",
            "study_consistency",
            "rolling_sleep_hours",
            "rolling_exercise_minutes",
            "rolling_mood",
        ]) if model_artifact else [
            "rolling_study_hours", "study_consistency", "rolling_sleep_hours", "rolling_exercise_minutes", "rolling_mood"
        ]

        feature_df = pd.DataFrame([[
            rolling_study_hours,
            study_consistency,
            rolling_sleep,
            rolling_exercise,
            rolling_mood,
        ]], columns=feat_names)

        feature_importance = model_artifact.get("feature_importances", {
            "rolling_study_hours": 0.88,
            "study_consistency": 0.04,
            "rolling_exercise_minutes": 0.04,
            "rolling_sleep_hours": 0.03,
            "rolling_mood": 0.01,
        }) if model_artifact else {}

        # Global prediction via RandomForest
        global_score = 78.5
        score_std = 4.5
        if model_artifact and "model" in model_artifact:
            try:
                rf_model = model_artifact["model"]
                global_score = float(rf_model.predict(feature_df)[0])
                # Estimator tree variance
                predictions = [tree.predict(feature_df.values)[0] for tree in rf_model.estimators_]
                score_std = float(np.std(predictions))
            except Exception as e:
                logger.error(f"Error predicting study score: {e}")

        # Blend
        if user_mean_score is not None:
            expected_score = (1.0 - personal_weight) * global_score + personal_weight * user_mean_score
        else:
            expected_score = global_score

        expected_score = min(99.0, max(30.0, expected_score))
        ci_margin = max(2.5, 1.645 * score_std)
        score_ci = ConfidenceInterval(
            lower=round(max(0.0, expected_score - ci_margin), 1),
            expected=round(expected_score, 1),
            upper=round(min(100.0, expected_score + ci_margin), 1),
        )

        # Scenarios across different study hours (5, 10, 15, 20, 25 hrs/week)
        scenarios: List[StudyScenario] = []
        for hours_scenario in [5.0, 10.0, 15.0, 20.0, 25.0]:
            scenario_df = pd.DataFrame([[
                hours_scenario,
                min(1.0, hours_scenario / 15.0),
                rolling_sleep,
                rolling_exercise,
                rolling_mood,
            ]], columns=feat_names)
            if model_artifact and "model" in model_artifact:
                s_pred = float(model_artifact["model"].predict(scenario_df)[0])
            else:
                s_pred = min(98.0, 55.0 + hours_scenario * 1.8)

            s_blended = (1.0 - personal_weight) * s_pred + personal_weight * (
                (user_mean_score or s_pred) + (hours_scenario - rolling_study_hours) * 1.2
            )
            s_blended = min(99.0, max(30.0, s_blended))
            scenarios.append(
                StudyScenario(
                    weekly_study_hours=hours_scenario,
                    projected_score=ConfidenceInterval(
                        lower=round(max(0.0, s_blended - ci_margin), 1),
                        expected=round(s_blended, 1),
                        upper=round(min(100.0, s_blended + ci_margin), 1),
                    ),
                )
            )

        top_lever = "Weekly Study Hours" if rolling_study_hours < 15.0 else (
            "Sleep Duration (> 7h)" if rolling_sleep < 6.8 else "Study Consistency (Frequency)"
        )

        return StudyPredictionResponse(
            domain="study",
            current_predicted_score=score_ci,
            feature_importance=feature_importance,
            study_hours_scenarios=scenarios,
            data_source=data_source,
            personal_weight=round(personal_weight, 2),
            user_data_points=n_points,
            model_metadata=model_meta,
            top_improvement_lever=top_lever,
            explanation=explanation,
        )

    # -------------------------------------------------------------
    # 3. Habit Streak & Burnout Prediction
    # -------------------------------------------------------------
    def predict_habits(
        self,
        habits: List[HabitLog],
        sessions: List[StudySession],
        profile: Optional[Profile],
    ) -> HabitPredictionResponse:
        model_artifact = self._models.get("habits")
        model_meta = self._metadata.get("models", {}).get("habits", {})

        n_points = len(habits)
        personal_weight = min(1.0, n_points / 30.0) if n_points > 0 else 0.0

        if n_points == 0:
            data_source = "global"
            explanation = (
                "Cold-start fallback: Burnout and streak probabilities calculated using the global "
                "calibrated logistic regression benchmark based on sleep debt and recovery heuristics."
            )
        elif personal_weight < 1.0:
            data_source = "blended"
            explanation = (
                f"Blended habit health forecast combining your logged routines ({int(personal_weight * 100)}%) "
                f"with calibrated recovery benchmark models ({int((1 - personal_weight) * 100)}%)."
            )
        else:
            data_source = "personal"
            explanation = "Personalized burnout risk and habit continuation forecast based on your routine metrics."

        target_sleep = profile.target_sleep_hours if profile else 7.5

        if n_points > 0:
            recent_7d = [l for l in habits if l.date >= (date.today() - timedelta(days=7))]
            if not recent_7d:
                recent_7d = habits[-7:]

            rolling_sleep = sum(float(l.sleep_hours) for l in recent_7d) / len(recent_7d)
            rolling_exercise = sum(float(l.exercise_minutes) for l in recent_7d) / len(recent_7d)
            rolling_mood = sum(float(l.mood) for l in recent_7d) / len(recent_7d)
            sleep_debt = max(0.0, target_sleep - rolling_sleep)

            # Mood trend (recent vs prior)
            mood_trend = 0.0
            if len(habits) >= 14:
                prior_7d = habits[-14:-7]
                prior_mood = sum(float(l.mood) for l in prior_7d) / len(prior_7d)
                mood_trend = rolling_mood - prior_mood

            # Current streak
            curr_streak = 0
            for l in reversed(habits):
                if bool(l.done):
                    curr_streak += 1
                else:
                    break

            user_completion_rate = sum(1 for l in habits if bool(l.done)) / len(habits)
        else:
            rolling_sleep = target_sleep
            sleep_debt = 0.0
            rolling_exercise = 25.0
            rolling_mood = 3.5
            mood_trend = 0.0
            curr_streak = 0
            user_completion_rate = 0.75

        # Cognitive workload from study sessions
        if sessions:
            recent_study = [float(s.hours) for s in sessions if s.date >= (date.today() - timedelta(days=7))]
            rolling_workload = (sum(recent_study) / 7.0) if recent_study else 2.0
        else:
            rolling_workload = 2.0

        # Model Inference
        streak_prob = 0.85
        burnout_risk = 0.15

        if model_artifact and "streak_model" in model_artifact and "burnout_model" in model_artifact:
            try:
                scaler = model_artifact["scaler"]
                streak_model = model_artifact["streak_model"]
                burnout_model = model_artifact["burnout_model"]

                feat_names = model_artifact.get("feature_names", [
                    "rolling_7d_sleep",
                    "sleep_debt_7d",
                    "rolling_7d_exercise",
                    "rolling_7d_mood",
                    "mood_trend",
                    "rolling_7d_workload",
                    "current_streak",
                ]) if model_artifact else [
                    "rolling_7d_sleep", "sleep_debt_7d", "rolling_7d_exercise", "rolling_7d_mood", "mood_trend", "rolling_7d_workload", "current_streak"
                ]

                feat_df = pd.DataFrame([[
                    rolling_sleep,
                    sleep_debt,
                    rolling_exercise,
                    rolling_mood,
                    mood_trend,
                    rolling_workload,
                    curr_streak,
                ]], columns=feat_names)
                feat_scaled = scaler.transform(feat_df)

                global_streak_prob = float(streak_model.predict_proba(feat_scaled)[0, 1])
                global_burnout_prob = float(burnout_model.predict_proba(feat_scaled)[0, 1])

                # Blend with personal history
                streak_prob = (1.0 - personal_weight) * global_streak_prob + personal_weight * user_completion_rate
                burnout_risk = global_burnout_prob
            except Exception as e:
                logger.error(f"Error predicting habit burnout: {e}")

        streak_prob = min(0.99, max(0.05, streak_prob))
        burnout_risk = min(0.99, max(0.02, burnout_risk))

        if burnout_risk >= 0.65:
            risk_level = "high"
        elif burnout_risk >= 0.35:
            risk_level = "moderate"
        else:
            risk_level = "low"

        # Construct Risk Factors
        factors: List[HabitRiskFactor] = [
            HabitRiskFactor(
                factor="Sleep Recovery",
                status="critical" if sleep_debt > 1.5 else ("warning" if sleep_debt > 0.5 else "optimal"),
                value=f"{rolling_sleep:.1f}h avg ({sleep_debt:.1f}h debt)",
                impact="Critical biological restorer for cognitive resilience and emotional regulation.",
            ),
            HabitRiskFactor(
                factor="Physical Activity",
                status="optimal" if rolling_exercise >= 30 else ("warning" if rolling_exercise >= 15 else "critical"),
                value=f"{int(rolling_exercise)} min/day",
                impact="Reduces cortisol and prevents chronic nervous system fatigue.",
            ),
            HabitRiskFactor(
                factor="Mood & Stress Trend",
                status="optimal" if rolling_mood >= 3.5 else ("warning" if rolling_mood >= 2.5 else "critical"),
                value=f"{rolling_mood:.1f} / 5",
                impact="Leading subjective indicator of psychological burnout.",
            ),
            HabitRiskFactor(
                factor="Cognitive Workload",
                status="warning" if rolling_workload > 5.0 else "optimal",
                value=f"{rolling_workload:.1f} h/day study",
                impact="Sustained high focus hours without recovery accelerate burnout risk.",
            ),
        ]

        recommendations: List[str] = []
        if sleep_debt > 1.0:
            recommendations.append(f"Target an extra 45-60 minutes of sleep tonight to clear {sleep_debt:.1f}h accumulated debt.")
        if rolling_exercise < 20:
            recommendations.append("Incorporate a 20-minute brisk walk to break prolonged sitting and boost circulation.")
        if rolling_mood < 3.0:
            recommendations.append("Take scheduled 15-minute breaks between deep study/work blocks to reset cognitive fatigue.")
        if not recommendations:
            recommendations.append("Habit and recovery metrics are balanced. Maintain your current daily routine consistency.")

        return HabitPredictionResponse(
            domain="habits",
            streak_continuation_probability=round(streak_prob, 3),
            burnout_risk_score=round(burnout_risk, 3),
            burnout_risk_level=risk_level,
            risk_factors=factors,
            recommendations=recommendations,
            data_source=data_source,
            personal_weight=round(personal_weight, 2),
            user_data_points=n_points,
            model_metadata=model_meta,
            explanation=explanation,
        )


# Global singleton instance
predictor_service = MLPredictorService()
