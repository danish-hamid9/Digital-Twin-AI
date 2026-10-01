"""
Simulation Verification Suite for Digital Twin AI (Demo Account).
Evaluates counterfactual Monte Carlo simulation runs against independent hand-computed expectations
and validates mathematical invariants and behavioral couplings.
"""

import pytest
import numpy as np
from pathlib import Path
from pydantic import ValidationError

from app.models.user import User, Profile
from app.models.finance import FinanceEntry
from app.models.study import StudySession
from app.models.habit import HabitLog
from app.schemas.simulation import SimulationScenarioParams
from app.services.simulation_service import simulation_service
from scripts.seed_demo_account import get_sync_session, DEMO_EMAIL


@pytest.fixture(scope="module")
def demo_data():
    session = get_sync_session()
    user = session.query(User).filter_by(email=DEMO_EMAIL).first()
    assert user is not None, f"Demo user {DEMO_EMAIL} not found. Run seed_demo_account.py first."

    fe = session.query(FinanceEntry).filter_by(user_id=user.id).all()
    ss = session.query(StudySession).filter_by(user_id=user.id).all()
    hl = session.query(HabitLog).filter_by(user_id=user.id).all()
    profile = user.profile

    base_state = simulation_service.extract_baseline_state(fe, ss, hl, profile)
    session.close()

    return {
        "user": user,
        "fe": fe,
        "ss": ss,
        "hl": hl,
        "profile": profile,
        "base_state": base_state,
    }


SCENARIOS = [
    {
        "id": "SCEN-01",
        "name": "Zero-Change Baseline",
        "salary_pct": 0.0,
        "expense": 0.0,
        "sleep": 0.0,
        "study": 0.0,
        "exercise": 0.0,
        "horizon": 6,
        "iterations": 500,
    },
    {
        "id": "SCEN-02",
        "name": "Conservative Raise",
        "salary_pct": 10.0,
        "expense": 0.0,
        "sleep": 0.0,
        "study": 0.0,
        "exercise": 0.0,
        "horizon": 3,
        "iterations": 500,
    },
    {
        "id": "SCEN-03",
        "name": "High Promotion (12m)",
        "salary_pct": 50.0,
        "expense": 0.0,
        "sleep": 0.0,
        "study": 0.0,
        "exercise": 0.0,
        "horizon": 12,
        "iterations": 500,
    },
    {
        "id": "SCEN-04",
        "name": "Moderate Salary Cut",
        "salary_pct": -25.0,
        "expense": 0.0,
        "sleep": 0.0,
        "study": 0.0,
        "exercise": 0.0,
        "horizon": 6,
        "iterations": 500,
    },
    {
        "id": "SCEN-05",
        "name": "Severe Salary Cut (12m)",
        "salary_pct": -30.0,
        "expense": 0.0,
        "sleep": 0.0,
        "study": 0.0,
        "exercise": 0.0,
        "horizon": 12,
        "iterations": 500,
    },
    {
        "id": "SCEN-06",
        "name": "Max Raise + Major Purchase",
        "salary_pct": 60.0,
        "expense": 2000.0,
        "sleep": 0.0,
        "study": 0.0,
        "exercise": 0.0,
        "horizon": 6,
        "iterations": 500,
    },
    {
        "id": "SCEN-07",
        "name": "Modest Raise + Medical Expense",
        "salary_pct": 15.0,
        "expense": 500.0,
        "sleep": 0.0,
        "study": 0.0,
        "exercise": 0.0,
        "horizon": 3,
        "iterations": 500,
    },
    {
        "id": "SCEN-08",
        "name": "Major Expense Without Raise",
        "salary_pct": 0.0,
        "expense": 2000.0,
        "sleep": 0.0,
        "study": 0.0,
        "exercise": 0.0,
        "horizon": 6,
        "iterations": 500,
    },
    {
        "id": "SCEN-09",
        "name": "Emergency Expense (12m)",
        "salary_pct": 0.0,
        "expense": 500.0,
        "sleep": 0.0,
        "study": 0.0,
        "exercise": 0.0,
        "horizon": 12,
        "iterations": 500,
    },
    {
        "id": "SCEN-10",
        "name": "Sleep Deprived Exam Cramming",
        "salary_pct": 0.0,
        "expense": 0.0,
        "sleep": -2.0,
        "study": 5.0,
        "exercise": 0.0,
        "horizon": 3,
        "iterations": 500,
    },
    {
        "id": "SCEN-11",
        "name": "Sleep Recovery",
        "salary_pct": 0.0,
        "expense": 0.0,
        "sleep": 1.0,
        "study": 0.0,
        "exercise": 0.0,
        "horizon": 6,
        "iterations": 500,
    },
    {
        "id": "SCEN-12",
        "name": "Cardio Fitness Regimen",
        "salary_pct": 0.0,
        "expense": 0.0,
        "sleep": 0.0,
        "study": 0.0,
        "exercise": 30.0,
        "horizon": 6,
        "iterations": 500,
    },
    {
        "id": "SCEN-13",
        "name": "Full Lifestyle Upgrade",
        "salary_pct": 30.0,
        "expense": 500.0,
        "sleep": 0.5,
        "study": 4.0,
        "exercise": 20.0,
        "horizon": 12,
        "iterations": 500,
    },
    {
        "id": "SCEN-14",
        "name": "High Crunch Overwork",
        "salary_pct": -10.0,
        "expense": 2000.0,
        "sleep": -1.5,
        "study": 3.0,
        "exercise": -15.0,
        "horizon": 6,
        "iterations": 500,
    },
    {
        "id": "SCEN-15",
        "name": "Balanced Progress",
        "salary_pct": 20.0,
        "expense": 500.0,
        "sleep": 1.0,
        "study": 2.0,
        "exercise": 15.0,
        "horizon": 3,
        "iterations": 500,
    },
    {
        "id": "SCEN-16",
        "name": "Promotion Overwork",
        "salary_pct": 40.0,
        "expense": 0.0,
        "sleep": -2.0,
        "study": 8.0,
        "exercise": -10.0,
        "horizon": 12,
        "iterations": 500,
    },
]


def test_simulation_scenarios_hand_calculation(demo_data):
    """
    Requirements 6 & 7:
    Run at least 15 scenarios, compute expected savings delta independently
    using a simple hand formula: (base_income * (salary_pct / 100) * horizon) - one_time_expense,
    and compare against the simulator's P50 within stated tolerance.
    """
    base_income = float(demo_data["base_state"]["monthly_income"])
    assert base_income > 0

    results = []

    for sc in SCENARIOS:
        params = SimulationScenarioParams(
            salary_change_pct=sc["salary_pct"],
            one_time_expense=sc["expense"],
            sleep_target_delta=sc["sleep"],
            study_hours_delta=sc["study"],
            exercise_minutes_delta=sc["exercise"],
            horizon_months=sc["horizon"],
            iterations=sc["iterations"],
        )

        res = simulation_service.run_simulation(
            finance_entries=demo_data["fe"],
            study_sessions=demo_data["ss"],
            habit_logs=demo_data["hl"],
            profile=demo_data["profile"],
            scenario_params=params,
            random_seed=42,
        )

        # Independent hand calculation
        expected_savings = round((base_income * (sc["salary_pct"] / 100.0) * sc["horizon"]) - sc["expense"], 2)
        actual_savings_p50 = float(res.summary.savings_net_impact_p50)
        diff = round(actual_savings_p50 - expected_savings, 2)

        # Stated tolerance: within 5% of expected magnitude or $100 (for near-zero)
        tolerance = max(abs(expected_savings) * 0.05, 100.0)
        passed = abs(diff) <= tolerance

        results.append({
            "id": sc["id"],
            "name": sc["name"],
            "inputs": f"sal={sc['salary_pct']:+g}%, exp=${sc['expense']:.0f}, slp={sc['sleep']:+g}h, hrz={sc['horizon']}m",
            "expected": expected_savings,
            "actual": actual_savings_p50,
            "diff": diff,
            "passed": passed,
        })

        assert passed, (
            f"Scenario {sc['id']} failed: Expected ${expected_savings}, "
            f"Got P50 ${actual_savings_p50}, Diff ${diff} exceeds tolerance ${tolerance:.2f}"
        )

    # Print markdown table for logging
    print("\n\n### Simulation Verification Results Table")
    print("| Scenario ID | Name | Inputs | Expected Delta ($) | Actual P50 Delta ($) | Diff ($) | Status |")
    print("|---|---|---|---|---|---|---|")
    for r in results:
        status = "**PASS**" if r["passed"] else "**FAIL**"
        print(f"| {r['id']} | {r['name']} | {r['inputs']} | {r['expected']:+,.2f} | {r['actual']:+,.2f} | {r['diff']:+,.2f} | {status} |")


def test_percentile_invariants_p10_p50_p90(demo_data):
    """
    Requirement 8:
    Verify mathematical consistency: P10 <= P50 <= P90 across all monthly trajectory points.
    """
    params = SimulationScenarioParams(
        salary_change_pct=15.0,
        one_time_expense=500.0,
        sleep_target_delta=-1.0,
        study_hours_delta=2.0,
        exercise_minutes_delta=15.0,
        horizon_months=6,
        iterations=500,
    )

    res = simulation_service.run_simulation(
        finance_entries=demo_data["fe"],
        study_sessions=demo_data["ss"],
        habit_logs=demo_data["hl"],
        profile=demo_data["profile"],
        scenario_params=params,
        random_seed=123,
    )

    metrics = ["cumulative_savings", "monthly_expenses", "monthly_income", "study_score", "habit_consistency", "burnout_risk"]

    for pt in res.monthly_trajectory:
        for branch in ["baseline", "scenario"]:
            point_data = pt.dict()[branch]
            for metric in metrics:
                p10 = point_data[metric]["p10"]
                p50 = point_data[metric]["p50"]
                p90 = point_data[metric]["p90"]
                assert p10 <= p50 <= p90, f"Invariant violated in month {pt.month_index} {branch} {metric}: {p10} <= {p50} <= {p90}"


def test_zero_change_equals_baseline(demo_data):
    """
    Requirement 8:
    A zero-change scenario equals the baseline (delta ≈ 0 across all metrics).
    """
    params = SimulationScenarioParams(
        salary_change_pct=0.0,
        one_time_expense=0.0,
        sleep_target_delta=0.0,
        study_hours_delta=0.0,
        exercise_minutes_delta=0.0,
        horizon_months=6,
        iterations=500,
    )

    res = simulation_service.run_simulation(
        finance_entries=demo_data["fe"],
        study_sessions=demo_data["ss"],
        habit_logs=demo_data["hl"],
        profile=demo_data["profile"],
        scenario_params=params,
        random_seed=42,
    )

    assert abs(res.summary.savings_net_impact_p50) < 5.0, f"Zero change savings delta should be ~0: {res.summary.savings_net_impact_p50}"
    assert abs(res.summary.study_score_net_impact_p50) < 0.5, f"Zero change study delta should be ~0: {res.summary.study_score_net_impact_p50}"
    assert abs(res.summary.burnout_risk_net_impact_p50) < 0.05, f"Zero change burnout delta should be ~0: {res.summary.burnout_risk_net_impact_p50}"


def test_seed_determinism(demo_data):
    """
    Requirement 8:
    Same random seed gives identical outputs.
    """
    params = SimulationScenarioParams(
        salary_change_pct=25.0,
        one_time_expense=1000.0,
        horizon_months=6,
        iterations=500,
    )

    res1 = simulation_service.run_simulation(
        finance_entries=demo_data["fe"],
        study_sessions=demo_data["ss"],
        habit_logs=demo_data["hl"],
        profile=demo_data["profile"],
        scenario_params=params,
        random_seed=999,
    )

    res2 = simulation_service.run_simulation(
        finance_entries=demo_data["fe"],
        study_sessions=demo_data["ss"],
        habit_logs=demo_data["hl"],
        profile=demo_data["profile"],
        scenario_params=params,
        random_seed=999,
    )

    assert res1.summary.savings_net_impact_p50 == res2.summary.savings_net_impact_p50
    assert res1.summary.study_score_net_impact_p50 == res2.summary.study_score_net_impact_p50
    assert res1.summary.burnout_risk_net_impact_p50 == res2.summary.burnout_risk_net_impact_p50


def test_monotonicity_salary_raises_savings(demo_data):
    """
    Requirement 8:
    Higher salary monotonically raises cumulative savings.
    """
    salary_pcts = [-20.0, 0.0, 15.0, 35.0]
    savings_impacts = []

    for pct in salary_pcts:
        params = SimulationScenarioParams(
            salary_change_pct=pct,
            horizon_months=6,
            iterations=500,
        )
        res = simulation_service.run_simulation(
            finance_entries=demo_data["fe"],
            study_sessions=demo_data["ss"],
            habit_logs=demo_data["hl"],
            profile=demo_data["profile"],
            scenario_params=params,
            random_seed=42,
        )
        savings_impacts.append(res.summary.savings_net_impact_p50)

    for i in range(len(savings_impacts) - 1):
        assert savings_impacts[i] < savings_impacts[i + 1], (
            f"Salary monotonicity violated: {savings_impacts[i]} not < {savings_impacts[i+1]}"
        )


def test_monotonicity_less_sleep_lowers_study_score(demo_data):
    """
    Requirement 8:
    Less sleep lowers study retention score due to cross-domain cognitive penalty.
    """
    params_normal = SimulationScenarioParams(
        sleep_target_delta=0.0,
        study_hours_delta=0.0,
        horizon_months=6,
        iterations=500,
    )
    params_deprived = SimulationScenarioParams(
        sleep_target_delta=-2.0,
        study_hours_delta=0.0,
        horizon_months=6,
        iterations=500,
    )

    res_normal = simulation_service.run_simulation(
        finance_entries=demo_data["fe"],
        study_sessions=demo_data["ss"],
        habit_logs=demo_data["hl"],
        profile=demo_data["profile"],
        scenario_params=params_normal,
        random_seed=42,
    )

    res_deprived = simulation_service.run_simulation(
        finance_entries=demo_data["fe"],
        study_sessions=demo_data["ss"],
        habit_logs=demo_data["hl"],
        profile=demo_data["profile"],
        scenario_params=params_deprived,
        random_seed=42,
    )

    assert res_deprived.summary.study_score_net_impact_p50 < res_normal.summary.study_score_net_impact_p50, (
        f"Sleep penalty failed: Deprived {res_deprived.summary.study_score_net_impact_p50} "
        f"not lower than Normal {res_normal.summary.study_score_net_impact_p50}"
    )


def test_monotonicity_more_exercise_lowers_burnout(demo_data):
    """
    Requirement 8:
    More exercise lowers burnout risk vulnerability.
    """
    params_none = SimulationScenarioParams(
        exercise_minutes_delta=0.0,
        horizon_months=6,
        iterations=500,
    )
    params_active = SimulationScenarioParams(
        exercise_minutes_delta=30.0,
        horizon_months=6,
        iterations=500,
    )

    res_none = simulation_service.run_simulation(
        finance_entries=demo_data["fe"],
        study_sessions=demo_data["ss"],
        habit_logs=demo_data["hl"],
        profile=demo_data["profile"],
        scenario_params=params_none,
        random_seed=42,
    )

    res_active = simulation_service.run_simulation(
        finance_entries=demo_data["fe"],
        study_sessions=demo_data["ss"],
        habit_logs=demo_data["hl"],
        profile=demo_data["profile"],
        scenario_params=params_active,
        random_seed=42,
    )

    assert res_active.summary.burnout_risk_net_impact_p50 < res_none.summary.burnout_risk_net_impact_p50, (
        f"Exercise burnout reduction failed: Active {res_active.summary.burnout_risk_net_impact_p50} "
        f"not lower than None {res_none.summary.burnout_risk_net_impact_p50}"
    )


def test_invalid_inputs_rejected():
    """
    Requirement 8:
    Invalid simulation inputs are rejected.
    """
    # Horizon > 12
    with pytest.raises(ValidationError):
        SimulationScenarioParams(horizon_months=13)

    # Horizon < 1
    with pytest.raises(ValidationError):
        SimulationScenarioParams(horizon_months=0)

    # Iterations < 100
    with pytest.raises(ValidationError):
        SimulationScenarioParams(iterations=50)

    # Salary change < -100%
    with pytest.raises(ValidationError):
        SimulationScenarioParams(salary_change_pct=-150.0)
