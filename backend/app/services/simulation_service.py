"""
Simulation Service for Digital Twin AI (Phase 5)
Constructs the baseline personal state from authenticated database records
and executes the 500+ run Monte Carlo engine in a non-blocking threadpool.
"""

import sys
import logging
from datetime import date, timedelta
from typing import List, Optional, Dict, Any
from pathlib import Path

# Ensure paths
repo_root = Path(__file__).resolve().parent.parent.parent.parent
sys.path.insert(0, str(repo_root))

from app.models.finance import FinanceEntry
from app.models.study import StudySession
from app.models.habit import HabitLog
from app.models.user import Profile
from app.schemas.simulation import (
    SimulationScenarioParams,
    SimulationRunResponse,
)
from ml.simulator import run_monte_carlo_simulation

logger = logging.getLogger("app.services.simulation")


class SimulationService:
    def extract_baseline_state(
        self,
        finance_entries: List[FinanceEntry],
        study_sessions: List[StudySession],
        habit_logs: List[HabitLog],
        profile: Optional[Profile],
    ) -> Dict[str, Any]:
        """
        Synthesizes the active user's current behavioral and financial state
        to anchor the Monte Carlo baseline trajectory.
        """
        # 1. Finance Baseline
        incomes = [float(e.amount) for e in finance_entries if e.type == "income"]
        expenses = [float(e.amount) for e in finance_entries if e.type == "expense"]

        if incomes:
            # Estimate monthly income (sum / months span, or average)
            min_date = min(e.date for e in finance_entries if e.type == "income")
            max_date = max(e.date for e in finance_entries if e.type == "income")
            days_span = max(30, (max_date - min_date).days + 1)
            monthly_income = (sum(incomes) / days_span) * 30.0
        else:
            monthly_income = 4000.0

        if expenses:
            min_date = min(e.date for e in finance_entries if e.type == "expense")
            max_date = max(e.date for e in finance_entries if e.type == "expense")
            days_span = max(30, (max_date - min_date).days + 1)
            monthly_expenses = (sum(expenses) / days_span) * 30.0
        else:
            monthly_expenses = 2500.0

        # Estimated liquid savings reserve
        net_flow = sum(incomes) - sum(expenses)
        current_savings = max(1000.0, net_flow) if net_flow > 0 else (
            float(profile.monthly_target_savings * 3.0) if profile and profile.monthly_target_savings else 5000.0
        )

        # 2. Study Baseline
        if study_sessions:
            recent_30d = [s for s in study_sessions if s.date >= (date.today() - timedelta(days=30))]
            if recent_30d:
                weekly_study_hours = (sum(float(s.hours) for s in recent_30d) / 30.0) * 7.0
            else:
                weekly_study_hours = (sum(float(s.hours) for s in study_sessions) / len(study_sessions)) * 4.0
        elif profile and profile.target_study_hours_week:
            weekly_study_hours = float(profile.target_study_hours_week)
        else:
            weekly_study_hours = 12.0

        # 3. Habit & Wellbeing Baseline
        if habit_logs:
            recent_habits = [h for h in habit_logs if h.date >= (date.today() - timedelta(days=14))]
            if not recent_habits:
                recent_habits = habit_logs[-14:]

            measured_sleep = sum(float(h.sleep_hours) for h in recent_habits) / len(recent_habits)
            daily_exercise = sum(float(h.exercise_minutes) for h in recent_habits) / len(recent_habits)
            habit_consistency = sum(1 for h in recent_habits if bool(h.done)) / len(recent_habits)
        else:
            measured_sleep = float(profile.target_sleep_hours) if profile and profile.target_sleep_hours else 7.5
            daily_exercise = 25.0
            habit_consistency = 0.75

        user_target_sleep = float(profile.target_sleep_hours) if profile and profile.target_sleep_hours else 7.5
        currency = profile.currency if profile and profile.currency else "USD"

        return {
            "monthly_income": monthly_income,
            "monthly_expenses": monthly_expenses,
            "current_savings": current_savings,
            "weekly_study_hours": weekly_study_hours,
            "target_sleep_hours": measured_sleep,
            "user_target_sleep_hours": user_target_sleep,
            "daily_exercise_minutes": daily_exercise,
            "habit_consistency": habit_consistency,
            "currency": currency,
        }

    def run_simulation(
        self,
        finance_entries: List[FinanceEntry],
        study_sessions: List[StudySession],
        habit_logs: List[HabitLog],
        profile: Optional[Profile],
        scenario_params: SimulationScenarioParams,
        simulation_id: Optional[str] = None,
        random_seed: Optional[int] = None,
    ) -> SimulationRunResponse:
        """
        Synchronous worker executing the Monte Carlo engine.
        Safe to call inside asyncio.to_thread.
        """
        baseline_state = self.extract_baseline_state(
            finance_entries, study_sessions, habit_logs, profile
        )

        user_history = {
            "finance": [
                {"amount": float(e.amount), "type": str(e.type), "date": str(e.date)}
                for e in finance_entries
            ],
            "study": [
                {"hours": float(s.hours), "score": float(s.score) if s.score is not None else None, "date": str(s.date)}
                for s in study_sessions
            ],
            "habits": [
                {"sleep_hours": float(h.sleep_hours), "exercise_minutes": float(h.exercise_minutes), "done": bool(h.done), "date": str(h.date)}
                for h in habit_logs
            ],
        }

        raw_result = run_monte_carlo_simulation(
            baseline_state=baseline_state,
            scenario_params=scenario_params.model_dump(),
            user_history=user_history,
            random_seed=random_seed,
        )

        return SimulationRunResponse(
            simulation_id=simulation_id,
            horizon_months=raw_result["horizon_months"],
            iterations=raw_result["iterations"],
            model=raw_result.get("model", getattr(scenario_params, "model", "parametric")),
            limited_history=raw_result.get("limited_history", False),
            scenario_params=scenario_params,
            monthly_trajectory=raw_result["monthly_trajectory"],
            summary=raw_result["summary"],
            assumptions=raw_result["assumptions"],
            disclaimer=raw_result["disclaimer"],
            comparison_results=raw_result.get("comparison_results"),
        )


simulation_service = SimulationService()
