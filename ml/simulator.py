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
from app.core.currency import get_currency_symbol, format_money


def _compute_percentiles(arr: np.ndarray) -> Dict[str, float]:
    """Computes p10, p50, p90 rounded to 2 decimal places."""
    p10, p50, p90 = np.percentile(arr, [10, 50, 90])
    return {
        "p10": float(round(p10, 2)),
        "p50": float(round(p50, 2)),
        "p90": float(round(p90, 2)),
    }


def _extract_bootstrap_shocks(
    user_history: Optional[Dict[str, Any]],
    iterations: int,
    horizon: int,
    base_income: float,
    base_exp: float,
    base_study_h: float,
    base_sleep_h: float,
    base_ex_m: float,
    base_habit_rate: float,
) -> tuple[Dict[str, np.ndarray], bool]:
    """
    Extracts 7-day block bootstrap residuals from user's history.
    If any domain has fewer than 20 entries, falls back to pooled global residuals
    for that domain and labels the result with limited_history = True.
    """
    limited_history = False
    shocks: Dict[str, np.ndarray] = {}

    if not user_history:
        user_history = {}

    fin_entries = user_history.get("finance", [])
    study_entries = user_history.get("study", [])
    habit_entries = user_history.get("habits", [])

    # 1. Finance Shocks
    if len(fin_entries) < 20:
        limited_history = True
        shocks["inc"] = np.random.normal(0.0, 0.02, size=(iterations, horizon))
        shocks["exp"] = np.random.normal(0.0, 0.06, size=(iterations, horizon))
    else:
        # Group finance entries into 7-day blocks
        exp_vals = [float(e.get("amount", 0.0)) for e in fin_entries if e.get("type") == "expense"]
        inc_vals = [float(e.get("amount", 0.0)) for e in fin_entries if e.get("type") == "income"]
        
        # Build residual pool
        exp_mean = np.mean(exp_vals) if exp_vals else base_exp / 4.0
        exp_residuals = [(v - exp_mean) / max(1.0, base_exp) for v in exp_vals]
        if len(exp_residuals) >= 7:
            # 7-day moving window averages
            k = 7
            exp_blocks = [float(np.mean(exp_residuals[i:i+k])) for i in range(len(exp_residuals) - k + 1)]
            idx = np.random.choice(len(exp_blocks), size=(iterations, horizon, 4))
            shocks["exp"] = np.mean(np.array(exp_blocks)[idx], axis=2)
        else:
            shocks["exp"] = np.random.normal(0.0, 0.06, size=(iterations, horizon))

        if len(inc_vals) >= 7:
            inc_mean = np.mean(inc_vals)
            inc_residuals = [(v - inc_mean) / max(1.0, base_income) for v in inc_vals]
            k = min(7, len(inc_residuals))
            inc_blocks = [float(np.mean(inc_residuals[i:i+k])) for i in range(len(inc_residuals) - k + 1)]
            idx = np.random.choice(len(inc_blocks), size=(iterations, horizon, 4))
            shocks["inc"] = np.mean(np.array(inc_blocks)[idx], axis=2)
        else:
            shocks["inc"] = np.random.normal(0.0, 0.02, size=(iterations, horizon))

    # 2. Habit & Wellbeing Shocks (Sleep, Exercise, Habit Consistency, Burnout)
    if len(habit_entries) < 20:
        limited_history = True
        shocks["sleep"] = np.random.normal(0.0, 0.35, size=(iterations, horizon))
        shocks["ex"] = np.random.normal(0.0, 6.0, size=(iterations, horizon))
        shocks["habit"] = np.random.normal(0.0, 0.04, size=(iterations, horizon))
        shocks["burnout"] = np.random.normal(0.0, 0.04, size=(iterations, horizon))
    else:
        # Build 7-day block pools for habits
        sleep_vals = [float(h.get("sleep_hours", base_sleep_h)) for h in habit_entries]
        ex_vals = [float(h.get("exercise_minutes", base_ex_m)) for h in habit_entries]
        done_vals = [1.0 if bool(h.get("done", False)) else 0.0 for h in habit_entries]

        k = 7
        sleep_blocks = [float(np.mean(sleep_vals[i:i+k]) - base_sleep_h) for i in range(len(sleep_vals) - k + 1)]
        ex_blocks = [float(np.mean(ex_vals[i:i+k]) - base_ex_m) for i in range(len(ex_vals) - k + 1)]
        done_blocks = [float(np.mean(done_vals[i:i+k]) - base_habit_rate) for i in range(len(done_vals) - k + 1)]
        burnout_blocks = [float(-0.05 * s_b + 0.02 * (1.0 - d_b)) for s_b, d_b in zip(sleep_blocks, done_blocks)]

        idx_s = np.random.choice(len(sleep_blocks), size=(iterations, horizon, 4))
        idx_e = np.random.choice(len(ex_blocks), size=(iterations, horizon, 4))
        idx_d = np.random.choice(len(done_blocks), size=(iterations, horizon, 4))
        idx_b = np.random.choice(len(burnout_blocks), size=(iterations, horizon, 4))

        shocks["sleep"] = np.mean(np.array(sleep_blocks)[idx_s], axis=2)
        shocks["ex"] = np.mean(np.array(ex_blocks)[idx_e], axis=2)
        shocks["habit"] = np.mean(np.array(done_blocks)[idx_d], axis=2)
        shocks["burnout"] = np.mean(np.array(burnout_blocks)[idx_b], axis=2)

    # 3. Study Performance Shocks
    if len(study_entries) < 20:
        limited_history = True
        shocks["study"] = np.random.normal(0.0, 2.2, size=(iterations, horizon))
    else:
        study_scores = [float(s.get("score", 85.0)) for s in study_entries if s.get("score") is not None]
        if not study_scores:
            study_scores = [float(s.get("hours", base_study_h / 4.0)) * 5.0 + 50.0 for s in study_entries]
        mean_score = np.mean(study_scores) if study_scores else 85.0
        score_residuals = [s - mean_score for s in study_scores]
        k = min(7, len(score_residuals))
        score_blocks = [float(np.mean(score_residuals[i:i+k])) for i in range(len(score_residuals) - k + 1)]
        idx_st = np.random.choice(len(score_blocks), size=(iterations, horizon, 4))
        shocks["study"] = np.mean(np.array(score_blocks)[idx_st], axis=2)

    return shocks, limited_history


def _simulate_core(
    baseline_state: Dict[str, Any],
    scenario_params: Dict[str, Any],
    shocks: Dict[str, np.ndarray],
    iterations: int,
    horizon: int,
    model_name: str,
    limited_history: bool = False,
) -> Dict[str, Any]:
    """Vectorized core execution using paired shocks."""
    salary_change_pct = float(scenario_params.get("salary_change_pct", 0.0))
    one_time_exp = max(0.0, float(scenario_params.get("one_time_expense", 0.0)))
    one_time_month = max(1, min(horizon, int(scenario_params.get("one_time_expense_month", 1))))
    study_delta = float(scenario_params.get("study_hours_delta", 0.0))
    sleep_delta = float(scenario_params.get("sleep_target_delta", 0.0))
    exercise_delta = float(scenario_params.get("exercise_minutes_delta", 0.0))

    base_income = max(500.0, float(baseline_state.get("monthly_income", 4000.0)))
    base_exp = max(300.0, float(baseline_state.get("monthly_expenses", 2500.0)))
    initial_savings = float(baseline_state.get("current_savings", max(1000.0, base_income * 1.5)))
    base_study_h = max(0.0, float(baseline_state.get("weekly_study_hours", 12.0)))
    base_sleep_h = max(4.0, min(10.0, float(baseline_state.get("target_sleep_hours", 7.2))))
    base_ex_m = max(0.0, float(baseline_state.get("daily_exercise_minutes", 25.0)))
    base_habit_rate = max(0.1, min(0.95, float(baseline_state.get("habit_consistency", 0.75))))
    currency = str(baseline_state.get("currency") or scenario_params.get("currency") or "USD")
    curr_sym = get_currency_symbol(currency)

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

    b_prev_savings = np.full(iterations, initial_savings)
    s_prev_savings = np.full(iterations, initial_savings)

    inc_shocks = shocks["inc"]
    exp_shocks = shocks["exp"]
    sleep_shocks = shocks["sleep"]
    ex_shocks = shocks["ex"]
    study_shocks = shocks["study"]
    habit_shocks = shocks["habit"]
    burnout_shocks = shocks["burnout"]

    for m in range(horizon):
        month_idx = m + 1
        seasonal_factor = 0.04 * np.sin(m * np.pi / 6.0)

        # A. Finance Domain Simulation
        b_inc = base_income * (1.0 + inc_shocks[:, m])
        b_exp = np.maximum(200.0, base_exp * (1.0 + seasonal_factor + exp_shocks[:, m]))

        scenario_salary_mult = 1.0 + (salary_change_pct / 100.0)
        s_inc = (base_income * scenario_salary_mult) * (1.0 + inc_shocks[:, m])
        s_exp_base = np.maximum(200.0, base_exp * (1.0 + seasonal_factor + exp_shocks[:, m]))
        s_exp = s_exp_base + (one_time_exp if month_idx == one_time_month else 0.0)

        b_prev_savings = b_prev_savings + (b_inc - b_exp)
        s_prev_savings = s_prev_savings + (s_inc - s_exp)

        b_cum_savings[:, m] = b_prev_savings
        s_cum_savings[:, m] = s_prev_savings
        b_monthly_inc[:, m] = b_inc
        s_monthly_inc[:, m] = s_inc
        b_monthly_exp[:, m] = b_exp
        s_monthly_exp[:, m] = s_exp

        b_runway = np.maximum(0.0, b_prev_savings) / np.maximum(1.0, b_exp)
        s_runway = np.maximum(0.0, s_prev_savings) / np.maximum(1.0, s_exp)

        # B. Wellbeing & Habits Domain (with Financial Stress Coupling)
        b_sleep = np.clip(base_sleep_h + sleep_shocks[:, m], 3.0, 10.0)
        s_sleep = np.clip((base_sleep_h + sleep_delta) + sleep_shocks[:, m], 3.0, 10.0)

        b_ex = np.maximum(0.0, base_ex_m + ex_shocks[:, m])
        s_ex = np.maximum(0.0, (base_ex_m + exercise_delta) + ex_shocks[:, m])

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

        b_ex_habit_bonus = np.where(b_ex >= EXERCISE_MIN_THRESHOLD, 0.05, 0.0)
        s_ex_habit_bonus = np.where(s_ex >= EXERCISE_MIN_THRESHOLD, 0.05, 0.0)

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

        b_sleep_debt = np.maximum(0.0, 7.5 - b_sleep)
        s_sleep_debt = np.maximum(0.0, 7.5 - s_sleep)

        b_burnout_base = 0.20 + (b_sleep_debt * 0.10) + (b_fin_stress_penalty * 0.6)
        s_burnout_base = 0.20 + (s_sleep_debt * 0.10) + (s_fin_stress_penalty * 0.6)

        b_burnout_base -= np.where(b_ex >= EXERCISE_MIN_THRESHOLD, EXERCISE_BURNOUT_REDUCTION, 0.0)
        s_burnout_base -= np.where(s_ex >= EXERCISE_MIN_THRESHOLD, EXERCISE_BURNOUT_REDUCTION, 0.0)

        b_study_curr = max(0.0, base_study_h)
        s_study_curr = max(0.0, base_study_h + study_delta)
        b_burnout_base += np.maximum(0.0, (b_study_curr - 15.0) * 0.01)
        s_burnout_base += np.maximum(0.0, (s_study_curr - 15.0) * 0.01)

        b_burnout = np.clip(b_burnout_base + burnout_shocks[:, m], 0.02, 0.98)
        s_burnout = np.clip(s_burnout_base + burnout_shocks[:, m], 0.02, 0.98)

        b_burnout_prob[:, m] = b_burnout
        s_burnout_prob[:, m] = s_burnout

        # C. Study Domain (with Sleep & Focus Coupling)
        b_raw_score = STUDY_BASE_SCORE + (STUDY_SCORE_PER_HOUR * b_study_curr)
        s_raw_score = STUDY_BASE_SCORE + (STUDY_SCORE_PER_HOUR * s_study_curr)

        b_sleep_deficit = np.maximum(0.0, SLEEP_THRESHOLD_HOURS - b_sleep)
        s_sleep_deficit = np.maximum(0.0, SLEEP_THRESHOLD_HOURS - s_sleep)

        b_sleep_retention = 1.0 - (SLEEP_PENALTY_PER_HOUR * b_sleep_deficit)
        s_sleep_retention = 1.0 - (SLEEP_PENALTY_PER_HOUR * s_sleep_deficit)

        b_focus_bonus = np.where(b_ex >= EXERCISE_MIN_THRESHOLD, 1.0 + EXERCISE_FOCUS_BONUS, 1.0)
        s_focus_bonus = np.where(s_ex >= EXERCISE_MIN_THRESHOLD, 1.0 + EXERCISE_FOCUS_BONUS, 1.0)

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

    # Aggregate Monthly Distributions (P10, P50, P90)
    today = date.today()
    trajectory_points = []

    for m in range(horizon):
        month_idx = m + 1
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

    # Cross-domain synthesized insights with dynamic currency formatting
    insights: List[str] = []

    if limited_history and model_name == "bootstrap":
        insights.append(
            "Limited history detected (under 20 entries in one or more domains); pooled global residuals applied for unobserved behavioral variance."
        )

    if salary_change_pct != 0:
        sign = "+" if salary_change_pct > 0 else ""
        direction = "expands" if savings_net_impact > 0 else "contracts"
        insights.append(
            f"Salary adjustment of {sign}{salary_change_pct:.1f}% {direction} projected {horizon}-month cumulative savings "
            f"by {sign}{curr_sym}{savings_net_impact:,.2f} (P50)."
        )

    if one_time_exp > 0:
        insights.append(
            f"A one-time expenditure of {curr_sym}{one_time_exp:,.2f} in Month {one_time_month} temporarily dips liquidity; "
            f"trajectory recovers to {curr_sym}{scenario_final_savings['p50']:,.2f} by Month {horizon}."
        )

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

    if exercise_delta >= 10:
        insights.append(
            f"Increasing daily exercise by +{exercise_delta:.0f} mins activates the resilience bonus, reducing burnout risk by {abs(burnout_risk_net_impact)*100:.1f}%."
        )
    elif exercise_delta <= -15:
        insights.append(
            f"Cutting exercise time elevates vulnerability to chronic cognitive burnout over the {horizon}-month horizon."
        )

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
        "model": model_name,
        "limited_history": limited_history,
        "scenario_params": {
            "salary_change_pct": salary_change_pct,
            "one_time_expense": one_time_exp,
            "one_time_expense_month": one_time_month,
            "study_hours_delta": study_delta,
            "sleep_target_delta": sleep_delta,
            "exercise_minutes_delta": exercise_delta,
            "horizon_months": horizon,
            "iterations": iterations,
            "model": model_name,
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


def run_monte_carlo_simulation(
    baseline_state: Dict[str, Any],
    scenario_params: Dict[str, Any],
    user_history: Optional[Dict[str, Any]] = None,
    random_seed: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Executes a vectorized Monte Carlo simulation with up to 15,000 iterations.
    Supports model: 'parametric' | 'bootstrap' | 'compare'.
    """
    if random_seed is not None:
        np.random.seed(random_seed)

    iterations = max(MIN_ITERATIONS, min(MAX_ITERATIONS, int(scenario_params.get("iterations", DEFAULT_ITERATIONS))))
    horizon = max(1, min(12, int(scenario_params.get("horizon_months", DEFAULT_HORIZON_MONTHS))))
    model = str(scenario_params.get("model", "parametric")).lower()
    if model not in ("parametric", "bootstrap", "compare"):
        model = "parametric"

    base_income = max(500.0, float(baseline_state.get("monthly_income", 4000.0)))
    base_exp = max(300.0, float(baseline_state.get("monthly_expenses", 2500.0)))
    base_study_h = max(0.0, float(baseline_state.get("weekly_study_hours", 12.0)))
    base_sleep_h = max(4.0, min(10.0, float(baseline_state.get("target_sleep_hours", 7.2))))
    base_ex_m = max(0.0, float(baseline_state.get("daily_exercise_minutes", 25.0)))
    base_habit_rate = max(0.1, min(0.95, float(baseline_state.get("habit_consistency", 0.75))))

    def generate_parametric_shocks() -> Dict[str, np.ndarray]:
        return {
            "inc": np.random.normal(0.0, 0.02, size=(iterations, horizon)),
            "exp": np.random.normal(0.0, 0.06, size=(iterations, horizon)),
            "sleep": np.random.normal(0.0, 0.35, size=(iterations, horizon)),
            "ex": np.random.normal(0.0, 6.0, size=(iterations, horizon)),
            "study": np.random.normal(0.0, 2.2, size=(iterations, horizon)),
            "habit": np.random.normal(0.0, 0.04, size=(iterations, horizon)),
            "burnout": np.random.normal(0.0, 0.04, size=(iterations, horizon)),
        }

    if model == "parametric":
        shocks = generate_parametric_shocks()
        return _simulate_core(baseline_state, scenario_params, shocks, iterations, horizon, "parametric", limited_history=False)

    elif model == "bootstrap":
        shocks, limited_history = _extract_bootstrap_shocks(
            user_history=user_history,
            iterations=iterations,
            horizon=horizon,
            base_income=base_income,
            base_exp=base_exp,
            base_study_h=base_study_h,
            base_sleep_h=base_sleep_h,
            base_ex_m=base_ex_m,
            base_habit_rate=base_habit_rate,
        )
        return _simulate_core(baseline_state, scenario_params, shocks, iterations, horizon, "bootstrap", limited_history=limited_history)

    else:  # model == "compare"
        # Run parametric
        param_shocks = generate_parametric_shocks()
        param_res = _simulate_core(baseline_state, scenario_params, param_shocks, iterations, horizon, "parametric", limited_history=False)

        # Run bootstrap with paired/offset seed
        if random_seed is not None:
            np.random.seed(random_seed + 1)
        boot_shocks, limited_history = _extract_bootstrap_shocks(
            user_history=user_history,
            iterations=iterations,
            horizon=horizon,
            base_income=base_income,
            base_exp=base_exp,
            base_study_h=base_study_h,
            base_sleep_h=base_sleep_h,
            base_ex_m=base_ex_m,
            base_habit_rate=base_habit_rate,
        )
        boot_res = _simulate_core(baseline_state, scenario_params, boot_shocks, iterations, horizon, "bootstrap", limited_history=limited_history)

        param_final_p50 = param_res["summary"]["scenario_final_savings"]["p50"]
        boot_final_p50 = boot_res["summary"]["scenario_final_savings"]["p50"]
        p50_diff_pct = round(abs(param_final_p50 - boot_final_p50) / max(1.0, abs(param_final_p50)) * 100.0, 2)
        differs_by_more_than_15_pct = p50_diff_pct > 15.0

        currency = str(baseline_state.get("currency") or scenario_params.get("currency") or "USD")
        curr_sym = get_currency_symbol(currency)

        divergence_note = None
        if differs_by_more_than_15_pct:
            divergence_note = (
                f"Note: Model A (Parametric: {curr_sym}{param_final_p50:,.2f}) and Model B "
                f"(Historical Bootstrap: {curr_sym}{boot_final_p50:,.2f}) median projected savings differ by {p50_diff_pct:.1f}% (>15%). "
                f"This divergence occurs because empirical historical shocks reflect real behavioral variance that differs from theoretical Gaussian distributions."
            )

        comparison_results = {
            "parametric": {
                "monthly_trajectory": param_res["monthly_trajectory"],
                "summary": param_res["summary"],
            },
            "bootstrap": {
                "monthly_trajectory": boot_res["monthly_trajectory"],
                "summary": boot_res["summary"],
                "limited_history": limited_history,
            },
            "p50_difference_pct": p50_diff_pct,
            "differs_by_more_than_15_pct": differs_by_more_than_15_pct,
            "divergence_note": divergence_note,
            "model_descriptions": {
                "parametric": "Model A (Parametric) simulates future outcomes using calibrated statistical probability distributions and cross-domain stress coupling.",
                "bootstrap": "Model B (Historical Bootstrap) generates shocks by block-resampling your real historical patterns (7-day blocks) to preserve personal behavioral variance.",
                "compare": "Side-by-side comparison reveals how empirical behavioral variance differs from theoretical Gaussian distributions.",
            },
        }

        # Return primary response format enriched with comparison_results
        combined_res = dict(param_res)
        combined_res["model"] = "compare"
        combined_res["limited_history"] = limited_history
        combined_res["comparison_results"] = comparison_results
        return combined_res
