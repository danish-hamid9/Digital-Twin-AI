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
