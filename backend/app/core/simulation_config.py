"""
Centralized Simulation Configuration & Cross-Domain Behavioral Assumptions
Single source of truth for all Monte Carlo parameters, heuristic thresholds,
and cross-domain coupling coefficients.
"""

from typing import Dict, Any

# ---------------------------------------------------------------------------
# Cross-Domain Coupling Coefficients & Thresholds
# ---------------------------------------------------------------------------

# Sleep -> Study coupling
SLEEP_THRESHOLD_HOURS: float = 6.5
SLEEP_PENALTY_PER_HOUR: float = 0.08  # 8% score penalty per hour of sleep below 6.5h
DEFAULT_SLEEP_TARGET: float = 7.5  # Single source of truth default sleep target hours (Settings value)

# Exercise -> Resilience & Focus coupling
EXERCISE_MIN_THRESHOLD: int = 30  # minutes/day
EXERCISE_BURNOUT_REDUCTION: float = 0.15  # 15% reduction in burnout likelihood
EXERCISE_FOCUS_BONUS: float = 0.06  # 6% boost to cognitive retention / study score

# Financial Runway -> Habits / Stress coupling
RUNWAY_MONTHS_STRESS_THRESHOLD: float = 2.0  # months of emergency expenses
FINANCIAL_STRESS_HABIT_PENALTY: float = 0.12  # up to 12% drop in habit adherence when runway < 2 months

# Burnout -> Cognitive Performance coupling
BURNOUT_SEVERE_THRESHOLD: float = 0.60
BURNOUT_STUDY_PENALTY: float = 0.10  # 10% penalty on exam score when severely burned out

# Study hours sensitivity
STUDY_SCORE_PER_HOUR: float = 2.5  # base exam points gained per weekly study hour
STUDY_BASE_SCORE: float = 50.0  # baseline exam score without study hours

# ---------------------------------------------------------------------------
# Recommendation Engine Thresholds (Phase 6)
# ---------------------------------------------------------------------------
EMERGENCY_FUND_MONTHS_THRESHOLD: float = 3.0  # Alert if savings runway is under 3 months
HABIT_STREAK_DROP_DAYS_THRESHOLD: int = 3  # Alert if active habit streak drops by >= 3 days or inactive for 3+ days
SAVINGS_PACE_BEHIND_PCT_THRESHOLD: float = 0.85  # Alert if savings velocity is < 85% of pace needed for target date

RECOMMENDATION_DISCLAIMER_TEXT: str = (
    "Automated suggestions generated from your logged behavior and established habits. "
    "These are educational heuristics and life simulation insights, not professional financial, legal, or medical advice."
)

# ---------------------------------------------------------------------------
# Simulation Run Defaults & Constraints
# ---------------------------------------------------------------------------
DEFAULT_ITERATIONS: int = 15000
MIN_ITERATIONS: int = 500
MAX_ITERATIONS: int = 15000

DEFAULT_HORIZON_MONTHS: int = 6
MIN_HORIZON_MONTHS: int = 1
MAX_HORIZON_MONTHS: int = 12

DISCLAIMER_TEXT: str = (
    "Monte Carlo simulations provide stochastic probabilistic projections based on historical distributions "
    "and cross-domain behavioral assumptions, not deterministic guarantees."
)

ASSUMPTIONS_META: Dict[str, Any] = {
    "sleep_study_penalty": {
        "title": "Sleep → Study Retention Penalty",
        "description": "Each hour of sleep below 6.5h/day introduces an 8% penalty on simulated retention and exam score.",
        "threshold": SLEEP_THRESHOLD_HOURS,
        "coefficient": SLEEP_PENALTY_PER_HOUR,
        "type": "negative",
    },
    "exercise_resilience_bonus": {
        "title": "Exercise → Resilience & Cognitive Bonus",
        "description": "Exercising ≥ 30 mins/day yields a 15% reduction in burnout risk and a 6% cognitive focus boost.",
        "threshold": EXERCISE_MIN_THRESHOLD,
        "burnout_reduction": EXERCISE_BURNOUT_REDUCTION,
        "focus_bonus": EXERCISE_FOCUS_BONUS,
        "type": "positive",
    },
    "savings_runway_habit_stress": {
        "title": "Financial Runway → Habit Adherence",
        "description": "Savings runway below 2 months introduces financial anxiety, lowering habit adherence by up to 12%.",
        "threshold": RUNWAY_MONTHS_STRESS_THRESHOLD,
        "penalty": FINANCIAL_STRESS_HABIT_PENALTY,
        "type": "negative",
    },
}
