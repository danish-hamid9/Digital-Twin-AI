"""
Simulations API Endpoints for Digital Twin AI (Phase 5)
Provides stochastic Monte Carlo counterfactual projections, cross-domain
ripple analysis, and P10/P50/P90 distributions.
Runs simulations off the main async event loop via asyncio.to_thread.
"""

import asyncio
import uuid
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.finance import FinanceEntry
from app.models.study import StudySession
from app.models.habit import HabitLog
from app.models.twin import Simulation
from app.schemas.simulation import (
    SimulationScenarioParams,
    SimulationRunResponse,
)
from app.services.simulation_service import simulation_service
from app.core.simulation_config import ASSUMPTIONS_META, DISCLAIMER_TEXT

router = APIRouter()


@router.post("/run", response_model=SimulationRunResponse, status_code=status.HTTP_200_OK)
async def run_simulation(
    params: SimulationScenarioParams,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Executes a 500+ iteration stochastic Monte Carlo counterfactual simulation
    comparing the user's baseline trajectory against scenario modifications.
    Factors in coupled cross-domain effects (Sleep -> Study, Exercise -> Burnout, Savings Runway -> Habits).
    Runs non-blocking in a worker thread.
    """
    # 1. Fetch user data across all 3 domains
    f_stmt = select(FinanceEntry).where(FinanceEntry.user_id == current_user.id).order_by(FinanceEntry.date.asc())
    f_res = await db.execute(f_stmt)
    finance_entries = list(f_res.scalars().all())

    s_stmt = select(StudySession).where(StudySession.user_id == current_user.id).order_by(StudySession.date.asc())
    s_res = await db.execute(s_stmt)
    study_sessions = list(s_res.scalars().all())

    h_stmt = select(HabitLog).where(HabitLog.user_id == current_user.id).order_by(HabitLog.date.asc())
    h_res = await db.execute(h_stmt)
    habit_logs = list(h_res.scalars().all())

    sim_id = str(uuid.uuid4())

    # 2. Run off-loop in worker threadpool
    response = await asyncio.to_thread(
        simulation_service.run_simulation,
        finance_entries=finance_entries,
        study_sessions=study_sessions,
        habit_logs=habit_logs,
        profile=current_user.profile,
        scenario_params=params,
        simulation_id=sim_id,
    )

    # 3. Persist simulation run to database
    try:
        db_sim = Simulation(
            id=uuid.UUID(sim_id),
            user_id=current_user.id,
            baseline={
                "monthly_income": response.monthly_trajectory[0].baseline.monthly_income.p50 if response.monthly_trajectory else 4000.0,
                "monthly_expenses": response.monthly_trajectory[0].baseline.monthly_expenses.p50 if response.monthly_trajectory else 2500.0,
            },
            scenario=params.model_dump(),
            result=response.model_dump(),
        )
        db.add(db_sim)
        await db.commit()
    except Exception as e:
        # Non-fatal logging if save fails
        await db.rollback()

    return response


@router.get("/assumptions", response_model=Dict[str, Any])
async def get_simulation_assumptions(
    current_user: User = Depends(get_current_user),
):
    """
    Returns the centralized cross-domain behavioral assumptions and heuristic coefficients
    governing the Monte Carlo simulation engine.
    """
    return {
        "assumptions": ASSUMPTIONS_META,
        "disclaimer": DISCLAIMER_TEXT,
    }


@router.get("/latest", response_model=SimulationRunResponse)
async def get_latest_simulation(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves the most recent saved simulation run, or generates a default baseline if none exists.
    """
    stmt = (
        select(Simulation)
        .where(Simulation.user_id == current_user.id)
        .order_by(Simulation.created_at.desc())
        .limit(1)
    )
    res = await db.execute(stmt)
    latest_sim = res.scalar_one_or_none()

    if latest_sim and latest_sim.result:
        try:
            return SimulationRunResponse(**latest_sim.result)
        except Exception:
            pass

    # Default fallback run
    default_params = SimulationScenarioParams(
        salary_change_pct=10.0,
        one_time_expense=0.0,
        study_hours_delta=0.0,
        sleep_target_delta=0.0,
        exercise_minutes_delta=0.0,
        horizon_months=6,
        iterations=500,
    )
    return await run_simulation(default_params, db=db, current_user=current_user)
