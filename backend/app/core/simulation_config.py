"""
Centralized Cross-Domain Simulation Assumptions & Coefficients
Defines the cross-domain coupling parameters used by the Monte Carlo simulation engine.
All coefficients are explicitly marked as heuristic assumptions.
"""

from typing import Dict, Any

SIMULATION_ASSUMPTIONS: Dict[str, Any] = {
    "version": "1.0.0",
    "disclaimer": (
        "These coefficients represent heuristic behavioral modeling assumptions "
        "and are used solely for probabilistic trajectory estimations, not deterministic guarantees."
    ),
    "domains": {
        "sleep_to_study": {
            "title": "Sleep Deficit Impact on Study Performance",
            "threshold_hours": 6.5,
            "penalty_per_hour_deficit": 0.08,
            "max_penalty": 0.35,
            "description": "Each hour of sleep below 6.5h reduces simulated study retention and exam performance by 8% (capped at 35%).",
            "is_assumption": True
        },
        "exercise_to_wellbeing": {
            "title": "Exercise Impact on Habit & Burnout Resilience",
            "target_minutes_per_day": 30.0,
            "burnout_reduction_factor": 0.15,
            "focus_bonus_factor": 0.06,
            "description": "Engaging in >=30 mins of daily exercise reduces burnout risk by 15% and provides a 6% boost to focus consistency.",
            "is_assumption": True
        },
        "financial_runway_to_habits": {
            "title": "Financial Runway Stress on Habit Adherence",
            "critical_runway_months": 2.0,
            "stress_habit_penalty": 0.12,
            "description": "Having less than 2 months of emergency savings introduces chronic financial stress, lowering habit completion by 12%.",
            "is_assumption": True
        },
        "monte_carlo_parameters": {
            "title": "Monte Carlo Engine Parameters",
            "default_iterations": 500,
            "expense_volatility_std": 0.15,
            "income_volatility_std": 0.05,
            "confidence_percentiles": {
                "risk": 10,
                "expected": 50,
                "best": 90
            },
            "description": "Simulates 500+ stochastic iterations with random shocks in discretionary spending and income variance.",
            "is_assumption": True
        }
    }
}
