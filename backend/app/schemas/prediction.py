"""
Pydantic Schemas for Phase 4 ML Predictions & Forecasts
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class ConfidenceInterval(BaseModel):
    lower: float = Field(..., description="Lower confidence bound (e.g. 10th percentile / 80% CI)")
    expected: float = Field(..., description="Point estimate / expected prediction")
    upper: float = Field(..., description="Upper confidence bound (e.g. 90th percentile / 80% CI)")


# -------------------------------------------------------------
# Finance Forecast Schemas
# -------------------------------------------------------------

class FinanceMonthlyForecast(BaseModel):
    month_index: int = Field(..., description="Forecast horizon index (1 to 6)")
    projected_date: str = Field(..., description="Target Year-Month (e.g. 2026-10)")
    projected_expenses: ConfidenceInterval
    projected_savings: ConfidenceInterval
    cumulative_savings: ConfidenceInterval


class FinancePredictionResponse(BaseModel):
    domain: str = "finance"
    horizon_months: int
    current_monthly_income: float
    current_monthly_expenses: float
    forecasts: List[FinanceMonthlyForecast]
    projected_6m_savings: ConfidenceInterval
    data_source: str = Field(..., description="'personal', 'blended', or 'global'")
    personal_weight: float = Field(..., description="Smooth weight w in [0.0, 1.0]")
    user_data_points: int
    model_metadata: Dict[str, Any]
    explanation: str


# -------------------------------------------------------------
# Study Performance Schemas
# -------------------------------------------------------------

class StudyScenario(BaseModel):
    weekly_study_hours: float
    projected_score: ConfidenceInterval


class StudyPredictionResponse(BaseModel):
    domain: str = "study"
    current_predicted_score: ConfidenceInterval
    feature_importance: Dict[str, float]
    study_hours_scenarios: List[StudyScenario]
    data_source: str
    personal_weight: float
    user_data_points: int
    model_metadata: Dict[str, Any]
    top_improvement_lever: str
    explanation: str


# -------------------------------------------------------------
# Habit & Burnout Schemas
# -------------------------------------------------------------

class HabitRiskFactor(BaseModel):
    factor: str
    status: str = Field(..., description="'optimal', 'warning', or 'critical'")
    value: str
    impact: str


class HabitPredictionResponse(BaseModel):
    domain: str = "habits"
    streak_continuation_probability: float = Field(..., description="Probability in [0.0, 1.0]")
    burnout_risk_score: float = Field(..., description="Calibrated burnout risk in [0.0, 1.0]")
    burnout_risk_level: str = Field(..., description="'low', 'moderate', or 'high'")
    risk_factors: List[HabitRiskFactor]
    recommendations: List[str]
    data_source: str
    personal_weight: float
    user_data_points: int
    model_metadata: Dict[str, Any]
    explanation: str


# -------------------------------------------------------------
# Overview Aggregated Forecast Schema
# -------------------------------------------------------------

class OverviewPredictionResponse(BaseModel):
    finance: FinancePredictionResponse
    study: StudyPredictionResponse
    habits: HabitPredictionResponse
