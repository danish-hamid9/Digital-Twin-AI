"""
Recommendations API Endpoints for Digital Twin AI (Phase 6)
Delivers deterministic, rule-based recommendations citing user-specific numbers,
grounded explanations, and educational disclaimers.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.finance import FinanceEntry, SavingsGoal
from app.models.study import StudySession
from app.models.habit import HabitLog
from app.schemas.recommendation import RecommendationResponse
from app.services.recommendation_service import recommendation_service

router = APIRouter()


@router.get("", response_model=RecommendationResponse)
async def get_recommendations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Evaluates multi-domain rule thresholds against user metrics and returns
    actionable, grounded recommendations with user numbers and educational disclaimer.
    """
    # Fetch user records
    f_stmt = select(FinanceEntry).where(FinanceEntry.user_id == current_user.id).order_by(FinanceEntry.date.asc())
    f_res = await db.execute(f_stmt)
    finance_entries = list(f_res.scalars().all())

    g_stmt = select(SavingsGoal).where(SavingsGoal.user_id == current_user.id).order_by(SavingsGoal.created_at.asc())
    g_res = await db.execute(g_stmt)
    savings_goals = list(g_res.scalars().all())

    s_stmt = select(StudySession).where(StudySession.user_id == current_user.id).order_by(StudySession.date.asc())
    s_res = await db.execute(s_stmt)
    study_sessions = list(s_res.scalars().all())

    h_stmt = select(HabitLog).where(HabitLog.user_id == current_user.id).order_by(HabitLog.date.asc())
    h_res = await db.execute(h_stmt)
    habit_logs = list(h_res.scalars().all())

    return recommendation_service.generate_recommendations(
        finance_entries=finance_entries,
        savings_goals=savings_goals,
        study_sessions=study_sessions,
        habit_logs=habit_logs,
        profile=current_user.profile,
    )
