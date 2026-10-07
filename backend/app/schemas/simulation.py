"""
Pydantic Schemas for Phase 5 Counterfactual What-If Simulation Engine
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class PercentileValue(BaseModel):
    p10: float = Field(..., description="10th percentile (Risk / Stress Case)")
    p50: float = Field(..., description="50th percentile (Median / Expected Case)")
    p90: float = Field(..., description="90th percentile (Optimistic / Best Case)")


class DomainTrajectoryPoint(BaseModel):
    cumulative_savings: PercentileValue
    monthly_expenses: PercentileValue
    monthly_income: PercentileValue
    study_score: PercentileValue
    habit_consistency: PercentileValue
    burnout_risk: PercentileValue


class SimulationMonthPoint(BaseModel):
    month_index: int = Field(..., description="Month index 1 to horizon_months")
    projected_date: str = Field(..., description="Target Year-Month (e.g. 2026-10)")
    baseline: DomainTrajectoryPoint
    scenario: DomainTrajectoryPoint
    savings_delta_p50: float
    study_score_delta_p50: float
    burnout_risk_delta_p50: float
    habit_consistency_delta_p50: float


class SimulationScenarioParams(BaseModel):
    salary_change_pct: float = Field(
        0.0,
        ge=-100.0,
        le=500.0,
        description="Percentage change in monthly income (e.g. +15.0 for 15% raise, -10.0 for pay cut)",
    )
    one_time_expense: float = Field(
        0.0,
        ge=0.0,
        description="One-time expense amount in user currency (e.g. 1200 for laptop)",
    )
    one_time_expense_month: int = Field(
        1,
        ge=1,
        le=12,
        description="Month in which the one-time expense occurs (1 to horizon)",
    )
    study_hours_delta: float = Field(
        0.0,
        description="Change in weekly study hours (e.g. +5.0 or -4.0)",
    )
    sleep_target_delta: float = Field(
        0.0,
        description="Change in daily sleep target hours (e.g. -1.0 or +0.5)",
    )
    exercise_minutes_delta: float = Field(
        0.0,
        description="Change in daily exercise minutes (e.g. +15 or -10)",
    )
    horizon_months: int = Field(
        6,
        ge=1,
        le=12,
        description="Forecast horizon in months (1-12)",
    )
    model: str = Field(
        "parametric",
        description="Simulation engine model: parametric | bootstrap | compare",
    )
    iterations: int = Field(
        15000,
        ge=500,
        le=15000,
        description="Number of Monte Carlo iterations (default 15,000, maximum 15,000)",
    )


class SimulationSummary(BaseModel):
    baseline_final_savings: PercentileValue
    scenario_final_savings: PercentileValue
    savings_net_impact_p50: float
    baseline_final_study_score: PercentileValue
    scenario_final_study_score: PercentileValue
    study_score_net_impact_p50: float
    baseline_final_burnout_risk: PercentileValue
    scenario_final_burnout_risk: PercentileValue
    burnout_risk_net_impact_p50: float
    cross_domain_insights: List[str]


class SimulationRunResponse(BaseModel):
    simulation_id: Optional[str] = None
    horizon_months: int
    iterations: int
    model: str = "parametric"
    limited_history: bool = False
    scenario_params: SimulationScenarioParams
    monthly_trajectory: List[SimulationMonthPoint]
    summary: SimulationSummary
    assumptions: Dict[str, Any]
    disclaimer: str
    comparison_results: Optional[Dict[str, Any]] = None
