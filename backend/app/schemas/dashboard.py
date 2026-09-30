from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class DateRangeInfo(BaseModel):
    preset: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None

# -------------------------------------------------------------
# Finance Analytics Schemas
# -------------------------------------------------------------
class CashFlowDataPoint(BaseModel):
    date: str
    income: float
    expenses: float
    net_savings: float

class CategoryDistribution(BaseModel):
    category: str
    amount: float
    percentage: float
    count: int

class SavingsGoalSummary(BaseModel):
    id: str
    title: str
    target_amount: float
    current_amount: float
    progress_pct: float

class FinanceAnalytics(BaseModel):
    total_income: float
    total_expenses: float
    net_savings: float
    savings_rate: float
    currency: str
    entries_count: int
    runway_months: Optional[float] = None
    cash_flow_trend: List[CashFlowDataPoint]
    category_distribution: List[CategoryDistribution]
    goals: List[SavingsGoalSummary]

    model_config = ConfigDict(from_attributes=True)

# -------------------------------------------------------------
# Study Analytics Schemas
# -------------------------------------------------------------
class StudyTrendPoint(BaseModel):
    date: str
    hours: float
    score: Optional[float] = None
    subject: Optional[str] = None

class SubjectBreakdown(BaseModel):
    subject: str
    hours: float
    percentage: float
    sessions_count: int
    avg_score: Optional[float] = None

class StudyAnalytics(BaseModel):
    total_study_hours: float
    avg_daily_hours: float
    target_weekly_hours: float
    weekly_progress_pct: float
    avg_score: Optional[float] = None
    sessions_count: int
    top_subject: Optional[str] = None
    subject_breakdown: List[SubjectBreakdown]
    study_trend: List[StudyTrendPoint]

    model_config = ConfigDict(from_attributes=True)

# -------------------------------------------------------------
# Habit & Wellbeing Analytics Schemas
# -------------------------------------------------------------
class HabitTrendPoint(BaseModel):
    date: str
    habit: str
    done: bool
    sleep_hours: float
    exercise_minutes: int
    mood: int

class SleepMoodCorrelation(BaseModel):
    date: str
    sleep_hours: float
    mood: int
    exercise_minutes: int

class SleepBucket(BaseModel):
    range_label: str
    avg_mood: float
    count: int

class HabitAnalytics(BaseModel):
    avg_sleep_hours: float
    target_sleep_hours: float
    sleep_variance: float
    avg_exercise_minutes: float
    avg_mood: float
    habit_completion_rate: float
    current_streak: int
    longest_streak: int
    logs_count: int
    habits_trend: List[HabitTrendPoint]
    sleep_vs_mood: List[SleepMoodCorrelation]
    sleep_buckets: List[SleepBucket]

    model_config = ConfigDict(from_attributes=True)

# -------------------------------------------------------------
# Combined Dashboard Overview Schema
# -------------------------------------------------------------
class DashboardOverviewResponse(BaseModel):
    date_range: DateRangeInfo
    finance: FinanceAnalytics
    study: StudyAnalytics
    habits: HabitAnalytics
