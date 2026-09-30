"""
Predictions API Endpoints for Digital Twin AI
Delivers forecast projections, confidence intervals, and scenario analysis
for Finance, Study, and Habit domains.
Runs model inference off the main async event loop using asyncio.to_thread.
"""

import asyncio
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.finance import FinanceEntry
from app.models.study import StudySession
from app.models.habit import HabitLog
from app.schemas.prediction import (
    FinancePredictionResponse,
    StudyPredictionResponse,
    HabitPredictionResponse,
    OverviewPredictionResponse,
)
from app.services.predictor import predictor_service

router = APIRouter()


@router.get("/finance", response_model=FinancePredictionResponse)
async def get_finance_predictions(
    horizon_months: int = Query(default=3, ge=1, le=6, description="Forecast horizon in months (1-6)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Predicts monthly expenses and cumulative savings with confidence bounds 1-6 months out.
    Blends personal user history with the global Ridge regression model based on data volume.
    Inference is executed off the main async event loop.
    """
    stmt = (
        select(FinanceEntry)
        .where(FinanceEntry.user_id == current_user.id)
        .order_by(FinanceEntry.date.asc())
    )
    result = await db.execute(stmt)
    entries = list(result.scalars().all())

    # Run inference in worker thread pool so FastAPI async loop is never blocked
    response = await asyncio.to_thread(
        predictor_service.predict_finance,
        entries,
        current_user.profile,
        horizon_months,
    )
    return response


@router.get("/study", response_model=StudyPredictionResponse)
async def get_study_predictions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Predicts exam/course assessment score from study hours, consistency, sleep, and exercise.
    Outputs point estimate, confidence interval, feature importances, and what-if study hour scenarios.
    """
    s_stmt = (
        select(StudySession)
        .where(StudySession.user_id == current_user.id)
        .order_by(StudySession.date.asc())
    )
    s_res = await db.execute(s_stmt)
    sessions = list(s_res.scalars().all())

    h_stmt = (
        select(HabitLog)
        .where(HabitLog.user_id == current_user.id)
        .order_by(HabitLog.date.asc())
    )
    h_res = await db.execute(h_stmt)
    habits = list(h_res.scalars().all())

    response = await asyncio.to_thread(
        predictor_service.predict_study,
        sessions,
        habits,
        current_user.profile,
    )
    return response


@router.get("/habits", response_model=HabitPredictionResponse)
async def get_habits_predictions(
    horizon_days: int = Query(default=7, ge=1, le=30, description="Horizon days"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Predicts streak continuation probability vs calibrated burnout risk.
    Evaluates sleep recovery, physical activity deficit, and cognitive workload drivers.
    """
    h_stmt = (
        select(HabitLog)
        .where(HabitLog.user_id == current_user.id)
        .order_by(HabitLog.date.asc())
    )
    h_res = await db.execute(h_stmt)
    habits = list(h_res.scalars().all())

    s_stmt = (
        select(StudySession)
        .where(StudySession.user_id == current_user.id)
        .order_by(StudySession.date.asc())
    )
    s_res = await db.execute(s_stmt)
    sessions = list(s_res.scalars().all())

    response = await asyncio.to_thread(
        predictor_service.predict_habits,
        habits,
        sessions,
        current_user.profile,
    )
    return response


@router.get("/overview", response_model=OverviewPredictionResponse)
async def get_overview_predictions(
    horizon_months: int = Query(default=3, ge=1, le=6),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Aggregates multi-domain ML forecast predictions across finance, study, and habit health
    for the top-level dashboard overview.
    """
    # Fetch all relevant user records in parallel/consecutively
    f_res = await db.execute(select(FinanceEntry).where(FinanceEntry.user_id == current_user.id).order_by(FinanceEntry.date.asc()))
    entries = list(f_res.scalars().all())

    s_res = await db.execute(select(StudySession).where(StudySession.user_id == current_user.id).order_by(StudySession.date.asc()))
    sessions = list(s_res.scalars().all())

    h_res = await db.execute(select(HabitLog).where(HabitLog.user_id == current_user.id).order_by(HabitLog.date.asc()))
    habits = list(h_res.scalars().all())

    # Execute all 3 model inferences in worker threads
    finance_pred, study_pred, habits_pred = await asyncio.gather(
        asyncio.to_thread(predictor_service.predict_finance, entries, current_user.profile, horizon_months),
        asyncio.to_thread(predictor_service.predict_study, sessions, habits, current_user.profile),
        asyncio.to_thread(predictor_service.predict_habits, habits, sessions, current_user.profile),
    )

    return OverviewPredictionResponse(
        finance=finance_pred,
        study=study_pred,
        habits=habits_pred,
    )
