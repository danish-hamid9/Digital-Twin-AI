"""
Monte Carlo Simulation Engine for Digital Twin AI (Phase 5)
Simulates stochastic multi-domain counterfactual "what-if" scenarios across
Finance, Study Performance, and Habit/Burnout Wellbeing over a 1-12 month horizon.

Key Characteristics:
  - 500+ stochastic iterations (Monte Carlo).
  - Explicit cross-domain coupling:
      1. Sleep (<6.5h) -> Study score retention penalty (8%/hour below 6.5h).
      2. Exercise (>=30m) -> 15% burnout reduction + 6% cognitive focus bonus.
      3. Financial runway (<2 months) -> Anxiety penalty on habit consistency (up to 12%).
      4. Severe burnout (>60%) -> Secondary cognitive performance degradation.
  - Generates P10 (Risk/Stress), P50 (Expected), P90 (Optimistic) distributions.
  - Side-by-side comparison: Baseline vs Scenario.
"""

import sys
import os
from datetime import date, timedelta
from pathlib import Path
from typing import Dict, Any, List, Optional
import numpy as np

# Ensure backend imports
backend_dir = Path(__file__).resolve().parent.parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.core.simulation_config import (
    SLEEP_THRESHOLD_HOURS,
    SLEEP_PENALTY_PER_HOUR,
    EXERCISE_MIN_THRESHOLD,
    EXERCISE_BURNOUT_REDUCTION,
    EXERCISE_FOCUS_BONUS,
    RUNWAY_MONTHS_STRESS_THRESHOLD,
    FINANCIAL_STRESS_HABIT_PENALTY,
    BURNOUT_SEVERE_THRESHOLD,
    BURNOUT_STUDY_PENALTY,
    STUDY_SCORE_PER_HOUR,
    STUDY_BASE_SCORE,
    DEFAULT_ITERATIONS,
    MIN_ITERATIONS,
    MAX_ITERATIONS,
    DEFAULT_HORIZON_MONTHS,
    DISCLAIMER_TEXT,
    ASSUMPTIONS_META,
)


def _compute_percentiles(arr: np.ndarray) -> Dict[str, float]:
    """Computes p10, p50, p90 rounded to 2 decimal places."""
    p10, p50, p90 = np.percentile(arr, [10, 50, 90])
    return {
        "p10": float(round(p10, 2)),
        "p50": float(round(p50, 2)),
        "p90": float(round(p90, 2)),
    }


def run_monte_carlo_simulation(
    baseline_state: Dict[str, Any],
    scenario_params: Dict[str, Any],
    random_seed: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Executes a vectorized Monte Carlo simulation with 500+ iterations.
    
    baseline_state keys:
      - monthly_income: float
      - monthly_expenses: float
      - current_savings: float
      - weekly_study_hours: float
      - target_sleep_hours: float
      - daily_exercise_minutes: float
      - habit_consistency: float (0.0 to 1.0)
      - base_exam_score: float (optional)

    scenario_params keys:
      - salary_change_pct: float
      - one_time_expense: float
      - one_time_expense_month: int
      - study_hours_delta: float
      - sleep_target_delta: float
      - exercise_minutes_delta: float
      - horizon_months: int
      - iterations: int
    """
    if random_seed is not None:
        np.random.seed(random_seed)

    # 1. Parse parameters & clamp bounds
    iterations = max(MIN_ITERATIONS, min(MAX_ITERATIONS, int(scenario_params.get("iterations", DEFAULT_ITERATIONS))))
    horizon = max(1, min(12, int(scenario_params.get("horizon_months", DEFAULT_HORIZON_MONTHS))))

    salary_change_pct = float(scenario_params.get("salary_change_pct", 0.0))
    one_time_exp = max(0.0, float(scenario_params.get("one_time_expense", 0.0)))
    one_time_month = max(1, min(horizon, int(scenario_params.get("one_time_expense_month", 1))))
    study_delta = float(scenario_params.get("study_hours_delta", 0.0))
    sleep_delta = float(scenario_params.get("sleep_target_delta", 0.0))
    exercise_delta = float(scenario_params.get("exercise_minutes_delta", 0.0))

    # Baseline anchors
    base_income = max(500.0, float(baseline_state.get("monthly_income", 4000.0)))
    base_exp = max(300.0, float(baseline_state.get("monthly_expenses", 2500.0)))
    initial_savings = float(baseline_state.get("current_savings", max(1000.0, base_income * 1.5)))
    base_study_h = max(0.0, float(baseline_state.get("weekly_study_hours", 12.0)))
    base_sleep_h = max(4.0, min(10.0, float(baseline_state.get("target_sleep_hours", 7.2))))
    base_ex_m = max(0.0, float(baseline_state.get("daily_exercise_minutes", 25.0)))
    base_habit_rate = max(0.1, min(0.95, float(baseline_state.get("habit_consistency", 0.75))))

    # Arrays to store month-by-month stochastic state across all iterations
    # Shape: (iterations, horizon)
    b_cum_savings = np.zeros((iterations, horizon))
    s_cum_savings = np.zeros((iterations, horizon))

    b_monthly_exp = np.zeros((iterations, horizon))
    s_monthly_exp = np.zeros((iterations, horizon))

    b_monthly_inc = np.zeros((iterations, horizon))
    s_monthly_inc = np.zeros((iterations, horizon))

    b_study_scores = np.zeros((iterations, horizon))
    s_study_scores = np.zeros((iterations, horizon))

    b_habit_cons = np.zeros((iterations, horizon))
    s_habit_cons = np.zeros((iterations, horizon))

    b_burnout_prob = np.zeros((iterations, horizon))
    s_burnout_prob = np.zeros((iterations, horizon))

    # Rolling trackers
    b_prev_savings = np.full(iterations, initial_savings)
    s_prev_savings = np.full(iterations, initial_savings)

    # Pre-generate stochastic shocks to ensure fair baseline vs scenario paired sampling
    inc_shocks = np.random.normal(0.0, 0.02, size=(iterations, horizon))
    exp_shocks = np.random.normal(0.0, 0.06, size=(iterations, horizon))
    sleep_shocks = np.random.normal(0.0, 0.35, size=(iterations, horizon))
    ex_shocks = np.random.normal(0.0, 6.0, size=(iterations, horizon))
    study_shocks = np.random.normal(0.0, 2.2, size=(iterations, horizon))
    habit_shocks = np.random.normal(0.0, 0.04, size=(iterations, horizon))
    burnout_shocks = np.random.normal(0.0, 0.04, size=(iterations, horizon))

    for m in range(horizon):
        month_idx = m + 1
        seasonal_factor = 0.04 * np.sin(m * np.pi / 6.0)

        # ---------------------------------------------------------
        # A. Finance Domain Simulation
        # ---------------------------------------------------------
        # Baseline income & expenses
        b_inc = base_income * (1.0 + inc_shocks[:, m])
        b_exp = np.maximum(200.0, base_exp * (1.0 + seasonal_factor + exp_shocks[:, m]))

        # Scenario income & expenses
        scenario_salary_mult = 1.0 + (salary_change_pct / 100.0)
        s_inc = (base_income * scenario_salary_mult) * (1.0 + inc_shocks[:, m])
        
        s_exp_base = np.maximum(200.0, base_exp * (1.0 + seasonal_factor + exp_shocks[:, m]))
        s_exp = s_exp_base + (one_time_exp if month_idx == one_time_month else 0.0)

        # Cumulative savings tracking
        b_prev_savings = b_prev_savings + (b_inc - b_exp)
        s_prev_savings = s_prev_savings + (s_inc - s_exp)

        b_cum_savings[:, m] = b_prev_savings
        s_cum_savings[:, m] = s_prev_savings

        b_monthly_inc[:, m] = b_inc
        s_monthly_inc[:, m] = s_inc

        b_monthly_exp[:, m] = b_exp
        s_monthly_exp[:, m] = s_exp

        # Financial runway in months (liquid savings / current monthly expense)
        b_runway = np.maximum(0.0, b_prev_savings) / np.maximum(1.0, b_exp)
        s_runway = np.maximum(0.0, s_prev_savings) / np.maximum(1.0, s_exp)

        # ---------------------------------------------------------
        # B. Wellbeing & Habits Domain (with Financial Stress Coupling)
        # ---------------------------------------------------------
        # Sleep
        b_sleep = np.clip(base_sleep_h + sleep_shocks[:, m], 3.0, 10.0)
        s_sleep = np.clip((base_sleep_h + sleep_delta) + sleep_shocks[:, m], 3.0, 10.0)

        # Exercise
        b_ex = np.maximum(0.0, base_ex_m + ex_shocks[:, m])
        s_ex = np.maximum(0.0, (base_ex_m + exercise_delta) + ex_shocks[:, m])

        # Cross-Domain: Financial Runway Stress on Habit Adherence
        # If runway < 2 months, financial anxiety imposes up to 12% adherence penalty
        b_fin_stress_penalty = np.where(
            b_runway < RUNWAY_MONTHS_STRESS_THRESHOLD,
            FINANCIAL_STRESS_HABIT_PENALTY * (1.0 - (b_runway / RUNWAY_MONTHS_STRESS_THRESHOLD)),
            0.0,
        )
        s_fin_stress_penalty = np.where(
            s_runway < RUNWAY_MONTHS_STRESS_THRESHOLD,
            FINANCIAL_STRESS_HABIT_PENALTY * (1.0 - (s_runway / RUNWAY_MONTHS_STRESS_THRESHOLD)),
            0.0,
        )

        # Exercise bonus on habits (regular workout boosts routine consistency)
        b_ex_habit_bonus = np.where(b_ex >= EXERCISE_MIN_THRESHOLD, 0.05, 0.0)
        s_ex_habit_bonus = np.where(s_ex >= EXERCISE_MIN_THRESHOLD, 0.05, 0.0)

        # Stochastic Habit Consistency Rate (0 to 1)
        b_habit = np.clip(
            base_habit_rate - b_fin_stress_penalty + b_ex_habit_bonus + habit_shocks[:, m],
            0.05,
            0.98,
        )
        s_habit = np.clip(
            base_habit_rate - s_fin_stress_penalty + s_ex_habit_bonus + habit_shocks[:, m],
            0.05,
            0.98,
        )

        b_habit_cons[:, m] = b_habit
        s_habit_cons[:, m] = s_habit

        # Burnout Vulnerability Probability
        # Base: 0.20 + sleep debt (max(0, 7.5 - sleep)*0.10) + financial anxiety + workload - exercise bonus
        b_sleep_debt = np.maximum(0.0, 7.5 - b_sleep)
        s_sleep_debt = np.maximum(0.0, 7.5 - s_sleep)

        b_burnout_base = 0.20 + (b_sleep_debt * 0.10) + (b_fin_stress_penalty * 0.6)
        s_burnout_base = 0.20 + (s_sleep_debt * 0.10) + (s_fin_stress_penalty * 0.6)

        # Exercise mitigation
        b_burnout_base -= np.where(b_ex >= EXERCISE_MIN_THRESHOLD, EXERCISE_BURNOUT_REDUCTION, 0.0)
        s_burnout_base -= np.where(s_ex >= EXERCISE_MIN_THRESHOLD, EXERCISE_BURNOUT_REDUCTION, 0.0)

        # Workload factor
        b_study_curr = max(0.0, base_study_h)
        s_study_curr = max(0.0, base_study_h + study_delta)
        b_burnout_base += np.maximum(0.0, (b_study_curr - 15.0) * 0.01)
        s_burnout_base += np.maximum(0.0, (s_study_curr - 15.0) * 0.01)

        b_burnout = np.clip(b_burnout_base + burnout_shocks[:, m], 0.02, 0.98)
        s_burnout = np.clip(s_burnout_base + burnout_shocks[:, m], 0.02, 0.98)

        b_burnout_prob[:, m] = b_burnout
        s_burnout_prob[:, m] = s_burnout

        # ---------------------------------------------------------
        # C. Study Domain (with Sleep & Focus Coupling)
        # ---------------------------------------------------------
        # Base score from weekly study hours
        b_raw_score = STUDY_BASE_SCORE + (STUDY_SCORE_PER_HOUR * b_study_curr)
        s_raw_score = STUDY_BASE_SCORE + (STUDY_SCORE_PER_HOUR * s_study_curr)

        # Cross-Domain: Sleep Retention Penalty
        # Each hour below 6.5h reduces score trajectory by 8%
        b_sleep_deficit = np.maximum(0.0, SLEEP_THRESHOLD_HOURS - b_sleep)
        s_sleep_deficit = np.maximum(0.0, SLEEP_THRESHOLD_HOURS - s_sleep)

        b_sleep_retention = 1.0 - (SLEEP_PENALTY_PER_HOUR * b_sleep_deficit)
        s_sleep_retention = 1.0 - (SLEEP_PENALTY_PER_HOUR * s_sleep_deficit)

        # Cross-Domain: Exercise Focus Bonus
        # Exercising >= 30m adds 6% focus retention
        b_focus_bonus = np.where(b_ex >= EXERCISE_MIN_THRESHOLD, 1.0 + EXERCISE_FOCUS_BONUS, 1.0)
        s_focus_bonus = np.where(s_ex >= EXERCISE_MIN_THRESHOLD, 1.0 + EXERCISE_FOCUS_BONUS, 1.0)

        # Severe burnout penalty (> 60%)
        b_burnout_penalty = np.where(
            b_burnout > BURNOUT_SEVERE_THRESHOLD,
            1.0 - (BURNOUT_STUDY_PENALTY * (b_burnout - BURNOUT_SEVERE_THRESHOLD) / 0.4),
            1.0,
        )
        s_burnout_penalty = np.where(
            s_burnout > BURNOUT_SEVERE_THRESHOLD,
            1.0 - (BURNOUT_STUDY_PENALTY * (s_burnout - BURNOUT_SEVERE_THRESHOLD) / 0.4),
            1.0,
        )

        b_score = np.clip(
            (b_raw_score * b_sleep_retention * b_focus_bonus * b_burnout_penalty) + study_shocks[:, m],
            10.0,
            100.0,
        )
        s_score = np.clip(
            (s_raw_score * s_sleep_retention * s_focus_bonus * s_burnout_penalty) + study_shocks[:, m],
            10.0,
            100.0,
        )

        b_study_scores[:, m] = b_score
        s_study_scores[:, m] = s_score

    # ---------------------------------------------------------
    # Aggregating Monthly Distributions (P10, P50, P90)
    # ---------------------------------------------------------
    today = date.today()
    trajectory_points = []

    for m in range(horizon):
        month_idx = m + 1
        # Approx monthly date calculation
        proj_year = today.year + ((today.month + month_idx - 1) // 12)
        proj_month = ((today.month + month_idx - 1) % 12) + 1
        proj_date_str = f"{proj_year:04d}-{proj_month:02d}"

        b_point = {
            "cumulative_savings": _compute_percentiles(b_cum_savings[:, m]),
            "monthly_expenses": _compute_percentiles(b_monthly_exp[:, m]),
            "monthly_income": _compute_percentiles(b_monthly_inc[:, m]),
            "study_score": _compute_percentiles(b_study_scores[:, m]),
            "habit_consistency": _compute_percentiles(b_habit_cons[:, m]),
            "burnout_risk": _compute_percentiles(b_burnout_prob[:, m]),
        }

        s_point = {
            "cumulative_savings": _compute_percentiles(s_cum_savings[:, m]),
            "monthly_expenses": _compute_percentiles(s_monthly_exp[:, m]),
            "monthly_income": _compute_percentiles(s_monthly_inc[:, m]),
            "study_score": _compute_percentiles(s_study_scores[:, m]),
            "habit_consistency": _compute_percentiles(s_habit_cons[:, m]),
            "burnout_risk": _compute_percentiles(s_burnout_prob[:, m]),
        }

        delta_savings_p50 = float(round(s_point["cumulative_savings"]["p50"] - b_point["cumulative_savings"]["p50"], 2))
        delta_study_p50 = float(round(s_point["study_score"]["p50"] - b_point["study_score"]["p50"], 2))
        delta_burnout_p50 = float(round(s_point["burnout_risk"]["p50"] - b_point["burnout_risk"]["p50"], 3))
        delta_habit_p50 = float(round(s_point["habit_consistency"]["p50"] - b_point["habit_consistency"]["p50"], 3))

        trajectory_points.append({
            "month_index": month_idx,
            "projected_date": proj_date_str,
            "baseline": b_point,
            "scenario": s_point,
            "savings_delta_p50": delta_savings_p50,
            "study_score_delta_p50": delta_study_p50,
            "burnout_risk_delta_p50": delta_burnout_p50,
            "habit_consistency_delta_p50": delta_habit_p50,
        })

    # Summary Endpoints
    last_idx = horizon - 1
    baseline_final_savings = _compute_percentiles(b_cum_savings[:, last_idx])
    scenario_final_savings = _compute_percentiles(s_cum_savings[:, last_idx])
    savings_net_impact = float(round(scenario_final_savings["p50"] - baseline_final_savings["p50"], 2))

    baseline_final_study = _compute_percentiles(b_study_scores[:, last_idx])
    scenario_final_study = _compute_percentiles(s_study_scores[:, last_idx])
    study_score_net_impact = float(round(scenario_final_study["p50"] - baseline_final_study["p50"], 2))

    baseline_final_burnout = _compute_percentiles(b_burnout_prob[:, last_idx])
    scenario_final_burnout = _compute_percentiles(s_burnout_prob[:, last_idx])
    burnout_risk_net_impact = float(round(scenario_final_burnout["p50"] - baseline_final_burnout["p50"], 3))

    # Cross-domain synthesized insights
    insights: List[str] = []

    # Financial insight
    if salary_change_pct != 0:
        sign = "+" if salary_change_pct > 0 else ""
        direction = "expands" if savings_net_impact > 0 else "contracts"
        insights.append(
            f"Salary adjustment of {sign}{salary_change_pct:.1f}% {direction} projected {horizon}-month cumulative savings "
            f"by {sign}${savings_net_impact:,.2f} (P50)."
        )

    if one_time_exp > 0:
        insights.append(
            f"A one-time expenditure of ${one_time_exp:,.2f} in Month {one_time_month} temporarily dips liquidity; "
            f"trajectory recovers to ${scenario_final_savings['p50']:,.2f} by Month {horizon}."
        )

    # Sleep -> Study coupling insight
    if sleep_delta < 0:
        sleep_abs = abs(sleep_delta)
        score_drop = abs(study_score_net_impact)
        insights.append(
            f"Sleep reduction of {sleep_abs:.1f}h/day triggers cross-domain retention penalties: "
            f"projected study score drops by {score_drop:.1f} pts (P50) despite study hours."
        )
    elif sleep_delta > 0:
        insights.append(
            f"Sleep boost of +{sleep_delta:.1f}h/day reinforces cognitive resilience, supporting study scores up to {scenario_final_study['p50']:.1f}%."
        )

    # Exercise -> Burnout coupling insight
    if exercise_delta >= 10:
        insights.append(
            f"Increasing daily exercise by +{exercise_delta:.0f} mins activates the resilience bonus, reducing burnout risk by {abs(burnout_risk_net_impact)*100:.1f}%."
        )
    elif exercise_delta <= -15:
        insights.append(
            f"Cutting exercise time elevates vulnerability to chronic cognitive burnout over the {horizon}-month horizon."
        )

    # Study hours alone
    if study_delta != 0 and sleep_delta == 0:
        sign = "+" if study_delta > 0 else ""
        insights.append(
            f"Adjusting study allocation by {sign}{study_delta:.1f} hrs/week shifts expected exam performance by {sign}{study_score_net_impact:.1f} points."
        )

    if not insights:
        insights.append("Baseline and scenario are identical; no parameter changes applied.")

    return {
        "horizon_months": horizon,
        "iterations": iterations,
        "scenario_params": {
            "salary_change_pct": salary_change_pct,
            "one_time_expense": one_time_exp,
            "one_time_expense_month": one_time_month,
            "study_hours_delta": study_delta,
            "sleep_target_delta": sleep_delta,
            "exercise_minutes_delta": exercise_delta,
            "horizon_months": horizon,
            "iterations": iterations,
        },
        "monthly_trajectory": trajectory_points,
        "summary": {
            "baseline_final_savings": baseline_final_savings,
            "scenario_final_savings": scenario_final_savings,
            "savings_net_impact_p50": savings_net_impact,
            "baseline_final_study_score": baseline_final_study,
            "scenario_final_study_score": scenario_final_study,
            "study_score_net_impact_p50": study_score_net_impact,
            "baseline_final_burnout_risk": baseline_final_burnout,
            "scenario_final_burnout_risk": scenario_final_burnout,
            "burnout_risk_net_impact_p50": burnout_risk_net_impact,
            "cross_domain_insights": insights,
        },
        "assumptions": ASSUMPTIONS_META,
        "disclaimer": DISCLAIMER_TEXT,
    }
