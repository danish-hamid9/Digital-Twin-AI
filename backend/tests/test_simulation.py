"""
Unit and Integration Tests for Phase 5 Counterfactual Simulation Engine
Verifies:
  1. Monte Carlo engine executes 500+ iterations with correct percentile distributions.
  2. Salary increase raises projected cumulative savings.
  3. Sleep reduction lowers projected study performance via cross-domain retention penalty.
  4. Exercise increase decreases burnout risk via resilience bonus.
  5. Full end-to-end API endpoints (/run, /latest, /assumptions).
"""

import pytest
from httpx import AsyncClient
from ml.simulator import run_monte_carlo_simulation


async def get_auth_token(client: AsyncClient, email: str = "sim_user@example.com") -> str:
    res = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "Password123!", "full_name": "Simulator Tester"},
    )
    assert res.status_code == 201
    return res.json()["access_token"]


# ===========================================================================
# 1. Pure Engine Math Tests (Unit Tests)
# ===========================================================================

def test_monte_carlo_basic_distribution_integrity():
    """Verifies that 500 iterations produce valid P10 <= P50 <= P90 distributions."""
    baseline = {
        "monthly_income": 4000.0,
        "monthly_expenses": 2500.0,
        "current_savings": 5000.0,
        "weekly_study_hours": 12.0,
        "target_sleep_hours": 7.5,
        "daily_exercise_minutes": 25.0,
        "habit_consistency": 0.80,
    }
    scenario = {
        "salary_change_pct": 0.0,
        "one_time_expense": 0.0,
        "study_hours_delta": 0.0,
        "sleep_target_delta": 0.0,
        "exercise_minutes_delta": 0.0,
        "horizon_months": 6,
        "iterations": 500,
    }

    result = run_monte_carlo_simulation(baseline, scenario, random_seed=42)

    assert result["iterations"] == 500
    assert result["horizon_months"] == 6
    assert len(result["monthly_trajectory"]) == 6

    for point in result["monthly_trajectory"]:
        b_sav = point["baseline"]["cumulative_savings"]
        assert b_sav["p10"] <= b_sav["p50"] <= b_sav["p90"]

        s_sav = point["scenario"]["cumulative_savings"]
        assert s_sav["p10"] <= s_sav["p50"] <= s_sav["p90"]

        b_study = point["baseline"]["study_score"]
        assert 0.0 <= b_study["p10"] <= b_study["p50"] <= b_study["p90"] <= 100.0

        b_bo = point["baseline"]["burnout_risk"]
        assert 0.0 <= b_bo["p10"] <= b_bo["p50"] <= b_bo["p90"] <= 1.0


def test_cross_domain_salary_increase_raises_savings():
    """Verifies that a positive salary change raises cumulative savings over baseline."""
    baseline = {
        "monthly_income": 4000.0,
        "monthly_expenses": 2500.0,
        "current_savings": 5000.0,
    }
    scenario = {
        "salary_change_pct": 15.0,  # +15% raise ($600/month)
        "horizon_months": 6,
        "iterations": 500,
    }

    result = run_monte_carlo_simulation(baseline, scenario, random_seed=42)
    summary = result["summary"]

    assert summary["savings_net_impact_p50"] > 0
    # Expected ~600 * 6 = $3600 lift
    assert summary["savings_net_impact_p50"] > 2500.0
    assert summary["scenario_final_savings"]["p50"] > summary["baseline_final_savings"]["p50"]


def test_cross_domain_sleep_reduction_lowers_study_scores():
    """
    Verifies that sleep reduction below 6.5h triggers the cross-domain
    cognitive retention penalty, lowering projected exam scores.
    """
    baseline = {
        "weekly_study_hours": 14.0,
        "target_sleep_hours": 7.0,  # healthy base
    }
    # Reduce sleep by 1.8h -> drops to 5.2h (< 6.5h threshold)
    scenario = {
        "sleep_target_delta": -1.8,
        "study_hours_delta": 0.0,  # study hours unchanged
        "horizon_months": 6,
        "iterations": 500,
    }

    result = run_monte_carlo_simulation(baseline, scenario, random_seed=42)
    summary = result["summary"]

    # Final study score under sleep deprivation should be strictly lower than baseline
    assert summary["study_score_net_impact_p50"] < 0
    assert summary["scenario_final_study_score"]["p50"] < summary["baseline_final_study_score"]["p50"]

    # Should be at least ~4-10 points lower due to 8%/hr penalty below 6.5h
    assert summary["study_score_net_impact_p50"] <= -3.0


def test_cross_domain_exercise_reduces_burnout():
    """Verifies that daily exercise >= 30 mins triggers the resilience bonus, reducing burnout probability."""
    baseline = {
        "daily_exercise_minutes": 10.0,
        "target_sleep_hours": 6.5,
    }
    scenario = {
        "exercise_minutes_delta": 25.0,  # brings total to 35m (>= 30m threshold)
        "horizon_months": 6,
        "iterations": 500,
    }

    result = run_monte_carlo_simulation(baseline, scenario, random_seed=42)
    summary = result["summary"]

    # Burnout probability in scenario should be lower than baseline
    assert summary["burnout_risk_net_impact_p50"] < 0
    assert summary["scenario_final_burnout_risk"]["p50"] < summary["baseline_final_burnout_risk"]["p50"]


# ===========================================================================
# 2. End-to-End API Integration Tests
# ===========================================================================

@pytest.mark.asyncio
async def test_simulations_api_endpoints_e2e(client: AsyncClient):
    """Tests /api/v1/simulations/run, /assumptions, and /latest end-to-end."""
    token = await get_auth_token(client, email="e2e_sim@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Check Assumptions Endpoint
    assumptions_res = await client.get("/api/v1/simulations/assumptions", headers=headers)
    assert assumptions_res.status_code == 200
    a_data = assumptions_res.json()
    assert "assumptions" in a_data
    assert "sleep_study_penalty" in a_data["assumptions"]
    assert "exercise_resilience_bonus" in a_data["assumptions"]
    assert "savings_runway_habit_stress" in a_data["assumptions"]
    assert "disclaimer" in a_data

    # 2. Run Counterfactual Scenario (Salary +10%, Sleep -1.5h)
    payload = {
        "salary_change_pct": 10.0,
        "one_time_expense": 1200.0,
        "one_time_expense_month": 2,
        "study_hours_delta": 3.0,
        "sleep_target_delta": -1.5,
        "exercise_minutes_delta": 15.0,
        "horizon_months": 6,
        "iterations": 500,
    }

    run_res = await client.post("/api/v1/simulations/run", json=payload, headers=headers)
    assert run_res.status_code == 200
    res_data = run_res.json()

    assert res_data["horizon_months"] == 6
    assert res_data["iterations"] == 500
    assert len(res_data["monthly_trajectory"]) == 6
    assert "summary" in res_data
    assert len(res_data["summary"]["cross_domain_insights"]) >= 1

    # Check that one-time expense occurred in Month 2
    month2 = res_data["monthly_trajectory"][1]
    assert month2["month_index"] == 2
    assert month2["scenario"]["monthly_expenses"]["p50"] > month2["baseline"]["monthly_expenses"]["p50"]

    # 3. Retrieve Latest Simulation
    latest_res = await client.get("/api/v1/simulations/latest", headers=headers)
    assert latest_res.status_code == 200
    l_data = latest_res.json()
    assert l_data["horizon_months"] == 6
    assert l_data["scenario_params"]["salary_change_pct"] == 10.0


# ===========================================================================
# 3. Scale, Performance, Bootstrap, and Currency Tests
# ===========================================================================

import time
from datetime import date, timedelta
from pydantic import ValidationError
from app.schemas.simulation import SimulationScenarioParams
from app.schemas.user import ProfileUpdate
from app.models.user import Profile
from app.models.finance import FinanceEntry
from app.models.study import StudySession
from app.models.habit import HabitLog
from app.services.recommendation_service import recommendation_service


def test_simulation_15000_iterations_performance():
    """
    Performance test: 15,000 Monte Carlo iterations over 12 months.
    Measures execution time and displays real timing.
    """
    baseline = {
        "monthly_income": 45000.0,
        "monthly_expenses": 30000.0,
        "current_savings": 80000.0,
        "weekly_study_hours": 15.0,
        "target_sleep_hours": 7.5,
        "daily_exercise_minutes": 30.0,
        "habit_consistency": 0.85,
        "currency": "INR",
    }
    scenario = {
        "salary_change_pct": 10.0,
        "one_time_expense": 45000.0,
        "one_time_expense_month": 3,
        "study_hours_delta": 4.0,
        "sleep_target_delta": -1.0,
        "exercise_minutes_delta": 15.0,
        "horizon_months": 12,
        "iterations": 15000,
        "model": "parametric",
    }

    start = time.perf_counter()
    result = run_monte_carlo_simulation(baseline, scenario, random_seed=42)
    elapsed = time.perf_counter() - start

    print(f"\n[PERFORMANCE] 15,000 iterations over 12 months executed in: {elapsed:.4f} seconds ({elapsed*1000:.2f} ms)")

    assert result["iterations"] == 15000
    assert result["horizon_months"] == 12
    assert len(result["monthly_trajectory"]) == 12
    assert elapsed < 3.0, f"Vectorized simulation took too long: {elapsed:.3f}s"


def test_both_models_satisfy_percentile_invariants():
    """Verifies that both parametric and bootstrap models strictly maintain P10 <= P50 <= P90."""
    baseline = {
        "monthly_income": 4000.0,
        "monthly_expenses": 2500.0,
        "current_savings": 5000.0,
        "weekly_study_hours": 12.0,
        "target_sleep_hours": 7.5,
        "daily_exercise_minutes": 25.0,
        "habit_consistency": 0.80,
    }
    scenario = {
        "salary_change_pct": 5.0,
        "one_time_expense": 500.0,
        "study_hours_delta": 2.0,
        "sleep_target_delta": -0.5,
        "exercise_minutes_delta": 10.0,
        "horizon_months": 6,
        "iterations": 5000,
    }

    # Synthesize realistic user history
    user_history = {
        "finance": [{"net_monthly_flow": 1500.0 + (i % 5) * 50.0} for i in range(25)],
        "study": [{"score": 75.0 + (i % 7)} for i in range(25)],
        "habits": [{"sleep_hours": 7.2 + (i % 3) * 0.2, "consistency": 0.82} for i in range(25)],
    }

    for model_name in ["parametric", "bootstrap"]:
        res = run_monte_carlo_simulation(
            baseline,
            {**scenario, "model": model_name},
            user_history=user_history,
            random_seed=123,
        )
        assert res["model"] == model_name
        assert len(res["monthly_trajectory"]) == 6

        for pt in res["monthly_trajectory"]:
            for key in ["baseline", "scenario"]:
                dom = pt[key]
                assert dom["cumulative_savings"]["p10"] <= dom["cumulative_savings"]["p50"] <= dom["cumulative_savings"]["p90"]
                assert dom["monthly_expenses"]["p10"] <= dom["monthly_expenses"]["p50"] <= dom["monthly_expenses"]["p90"]
                assert dom["monthly_income"]["p10"] <= dom["monthly_income"]["p50"] <= dom["monthly_income"]["p90"]
                assert dom["study_score"]["p10"] <= dom["study_score"]["p50"] <= dom["study_score"]["p90"]
                assert dom["habit_consistency"]["p10"] <= dom["habit_consistency"]["p50"] <= dom["habit_consistency"]["p90"]
                assert dom["burnout_risk"]["p10"] <= dom["burnout_risk"]["p50"] <= dom["burnout_risk"]["p90"]


def test_zero_change_equals_baseline_both_models():
    """Verifies that a zero-change scenario matches baseline metrics exactly across both models."""
    baseline = {
        "monthly_income": 5000.0,
        "monthly_expenses": 3000.0,
        "current_savings": 10000.0,
        "weekly_study_hours": 15.0,
        "target_sleep_hours": 7.5,
        "daily_exercise_minutes": 30.0,
        "habit_consistency": 0.85,
    }
    zero_scenario = {
        "salary_change_pct": 0.0,
        "one_time_expense": 0.0,
        "study_hours_delta": 0.0,
        "sleep_target_delta": 0.0,
        "exercise_minutes_delta": 0.0,
        "horizon_months": 6,
        "iterations": 2000,
    }

    user_history = {
        "finance": [{"net_monthly_flow": 2000.0} for _ in range(25)],
        "study": [{"score": 80.0} for _ in range(25)],
        "habits": [{"sleep_hours": 7.5, "consistency": 0.85} for _ in range(25)],
    }

    for model_name in ["parametric", "bootstrap"]:
        res = run_monte_carlo_simulation(
            baseline,
            {**zero_scenario, "model": model_name},
            user_history=user_history,
            random_seed=999,
        )
        summary = res["summary"]
        assert summary["savings_net_impact_p50"] == 0.0
        assert summary["study_score_net_impact_p50"] == 0.0
        assert summary["burnout_risk_net_impact_p50"] == 0.0
        assert summary["scenario_final_savings"]["p50"] == summary["baseline_final_savings"]["p50"]


def test_results_reproducible_with_seed():
    """Verifies that results are bitwise reproducible when given the exact same seed."""
    baseline = {
        "monthly_income": 4000.0,
        "monthly_expenses": 2500.0,
        "current_savings": 5000.0,
    }
    scenario = {
        "salary_change_pct": 10.0,
        "horizon_months": 6,
        "iterations": 3000,
    }

    for model_name in ["parametric", "bootstrap"]:
        r1 = run_monte_carlo_simulation(baseline, {**scenario, "model": model_name}, random_seed=777)
        r2 = run_monte_carlo_simulation(baseline, {**scenario, "model": model_name}, random_seed=777)

        assert r1["summary"]["scenario_final_savings"] == r2["summary"]["scenario_final_savings"]
        assert r1["summary"]["savings_net_impact_p50"] == r2["summary"]["savings_net_impact_p50"]
        for pt1, pt2 in zip(r1["monthly_trajectory"], r2["monthly_trajectory"]):
            assert pt1["scenario"]["cumulative_savings"] == pt2["scenario"]["cumulative_savings"]


def test_bootstrap_fallback_on_limited_history():
    """
    Verifies that when domain history has < 20 entries, bootstrap falls back
    to pooled global residuals and sets limited_history = True.
    """
    baseline = {
        "monthly_income": 4000.0,
        "monthly_expenses": 2500.0,
        "current_savings": 5000.0,
    }
    scenario = {
        "salary_change_pct": 0.0,
        "horizon_months": 6,
        "iterations": 1000,
        "model": "bootstrap",
    }

    # Only 5 entries (< 20 threshold)
    sparse_history = {
        "finance": [{"net_monthly_flow": 1200.0} for _ in range(5)],
        "study": [{"score": 75.0} for _ in range(5)],
        "habits": [{"sleep_hours": 7.0, "consistency": 0.8} for _ in range(5)],
    }

    res_sparse = run_monte_carlo_simulation(baseline, scenario, user_history=sparse_history, random_seed=42)
    assert res_sparse["limited_history"] is True

    # 25 entries (>= 20 threshold)
    rich_history = {
        "finance": [{"net_monthly_flow": 1200.0 + i * 10} for i in range(25)],
        "study": [{"score": 75.0 + i} for i in range(25)],
        "habits": [{"sleep_hours": 7.0 + (i % 2) * 0.5, "consistency": 0.8} for i in range(25)],
    }
    res_rich = run_monte_carlo_simulation(baseline, scenario, user_history=rich_history, random_seed=42)
    assert res_rich["limited_history"] is False


def test_compare_model_returns_both():
    """Verifies that model='compare' runs both models, returns comparison_results and divergence note."""
    baseline = {
        "monthly_income": 4000.0,
        "monthly_expenses": 2500.0,
        "current_savings": 5000.0,
    }
    scenario = {
        "salary_change_pct": 10.0,
        "one_time_expense": 1000.0,
        "horizon_months": 6,
        "iterations": 2000,
        "model": "compare",
    }

    res = run_monte_carlo_simulation(baseline, scenario, random_seed=42)
    assert res["model"] == "compare"
    assert res["comparison_results"] is not None
    assert "parametric" in res["comparison_results"]
    assert "bootstrap" in res["comparison_results"]
    assert "p50_difference_pct" in res["comparison_results"]
    assert "differs_by_more_than_15_pct" in res["comparison_results"]
    assert "divergence_note" in res["comparison_results"]
    assert "model_descriptions" in res["comparison_results"]
    assert "parametric" in res["comparison_results"]["model_descriptions"]
    assert "bootstrap" in res["comparison_results"]["model_descriptions"]


def test_server_side_maximum_iterations_enforcement():
    """Verifies that the server-side maximum of 15,000 iterations is strictly enforced by schema."""
    valid_params = SimulationScenarioParams(iterations=15000)
    assert valid_params.iterations == 15000

    valid_lower = SimulationScenarioParams(iterations=1000)
    assert valid_lower.iterations == 1000

    with pytest.raises(ValidationError):
        SimulationScenarioParams(iterations=15001)

    with pytest.raises(ValidationError):
        SimulationScenarioParams(iterations=499)


def test_settings_sleep_target_range_validation():
    """Verifies Settings target_sleep_hours validates range 4.0 to 10.0 hours."""
    # Valid
    p1 = ProfileUpdate(target_sleep_hours=7.5)
    assert p1.target_sleep_hours == 7.5

    p2 = ProfileUpdate(target_sleep_hours=4.0)
    assert p2.target_sleep_hours == 4.0

    p3 = ProfileUpdate(target_sleep_hours=10.0)
    assert p3.target_sleep_hours == 10.0

    # Below 4.0
    with pytest.raises(ValidationError):
        ProfileUpdate(target_sleep_hours=3.9)

    # Above 10.0
    with pytest.raises(ValidationError):
        ProfileUpdate(target_sleep_hours=10.1)


def test_inr_user_no_dollar_sign_in_simulation_or_recommendations():
    """
    CRITICAL: Verifies that an INR user NEVER sees a dollar sign '$' in:
    1. Simulation cross-domain insights
    2. Recommendations (title, explanation, action_text)
    """
    baseline_inr = {
        "monthly_income": 45000.0,
        "monthly_expenses": 32000.0,
        "current_savings": 50000.0,
        "currency": "INR",
    }
    scenario_inr = {
        "one_time_expense": 45000.0,
        "one_time_expense_month": 1,
        "horizon_months": 6,
        "iterations": 1000,
    }

    sim_res = run_monte_carlo_simulation(baseline_inr, scenario_inr, random_seed=42)
    insights = sim_res["summary"]["cross_domain_insights"]
    assert len(insights) > 0
    for insight in insights:
        assert "$" not in insight, f"Found prohibited '$' in INR simulation insight: {insight}"
        assert "₹" in insight or "INR" in insight, f"Expected INR symbol in insight: {insight}"

    # Verify recommendations for INR user
    today = date.today()
    entries = [
        FinanceEntry(date=today - timedelta(days=20), type="income", category="Salary", amount=45000.0),
        FinanceEntry(date=today - timedelta(days=15), type="expense", category="Rent", amount=12000.0),
        FinanceEntry(date=today - timedelta(days=10), type="expense", category="Living", amount=31000.0),
    ]
    profile = Profile(currency="INR", monthly_target_savings=10000.0)

    rec_res = recommendation_service.generate_recommendations(
        finance_entries=entries,
        savings_goals=[],
        study_sessions=[],
        habit_logs=[],
        profile=profile,
    )

    for rec in rec_res.recommendations:
        assert "$" not in rec.title, f"Found '$' in recommendation title: {rec.title}"
        assert "$" not in rec.explanation, f"Found '$' in recommendation explanation: {rec.explanation}"
        assert "$" not in rec.action_text, f"Found '$' in recommendation action_text: {rec.action_text}"

