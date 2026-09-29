from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.user import User, Profile
from app.models.finance import FinanceEntry, SavingsGoal
from app.models.study import StudySession
from app.models.habit import HabitLog, Goal
from app.models.plan import Plan
from app.models.twin import TwinSnapshot, Prediction, Simulation
from app.models.chat import ChatMessage
from app.schemas.user import ProfileOut, ProfileUpdate, UserDataExport
from app.api.deps import get_current_user

router = APIRouter()

@router.get("/profile", response_model=ProfileOut)
async def get_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Profile).where(Profile.user_id == current_user.id)
    result = await db.execute(stmt)
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@router.put("/profile", response_model=ProfileOut)
async def update_profile(
    profile_in: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Profile).where(Profile.user_id == current_user.id)
    result = await db.execute(stmt)
    profile = result.scalar_one_or_none()
    if not profile:
        profile = Profile(user_id=current_user.id)
        db.add(profile)

    update_data = profile_in.model_dump(exclude_unset=True)
    if "currency" in update_data and update_data["currency"]:
        update_data["currency"] = update_data["currency"].upper()

    for field, val in update_data.items():
        setattr(profile, field, val)

    await db.commit()
    await db.refresh(profile)
    return profile

@router.get("/export-data", response_model=UserDataExport)
async def export_my_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    GDPR/CCPA Compliance: Export all data belonging to the authenticated user.
    """
    uid = current_user.id

    # Fetch all domain records
    finances = (await db.execute(select(FinanceEntry).where(FinanceEntry.user_id == uid))).scalars().all()
    savings = (await db.execute(select(SavingsGoal).where(SavingsGoal.user_id == uid))).scalars().all()
    studies = (await db.execute(select(StudySession).where(StudySession.user_id == uid))).scalars().all()
    habits = (await db.execute(select(HabitLog).where(HabitLog.user_id == uid))).scalars().all()
    goals = (await db.execute(select(Goal).where(Goal.user_id == uid))).scalars().all()
    plans = (await db.execute(select(Plan).where(Plan.user_id == uid))).scalars().all()
    snapshots = (await db.execute(select(TwinSnapshot).where(TwinSnapshot.user_id == uid))).scalars().all()
    predictions = (await db.execute(select(Prediction).where(Prediction.user_id == uid))).scalars().all()
    simulations = (await db.execute(select(Simulation).where(Simulation.user_id == uid))).scalars().all()
    chats = (await db.execute(select(ChatMessage).where(ChatMessage.user_id == uid))).scalars().all()

    return UserDataExport(
        user=current_user,
        profile=current_user.profile,
        finance_entries=[{"id": str(f.id), "date": str(f.date), "type": f.type, "category": f.category, "amount": f.amount, "description": f.description} for f in finances],
        savings_goals=[{"id": str(s.id), "title": s.title, "target_amount": s.target_amount, "current_amount": s.current_amount, "target_date": str(s.target_date) if s.target_date else None} for s in savings],
        study_sessions=[{"id": str(s.id), "date": str(s.date), "subject": s.subject, "hours": s.hours, "score": s.score, "notes": s.notes} for s in studies],
        habit_logs=[{"id": str(h.id), "date": str(h.date), "habit": h.habit, "done": h.done, "sleep_hours": h.sleep_hours, "exercise_minutes": h.exercise_minutes, "mood": h.mood} for h in habits],
        goals=[{"id": str(g.id), "title": g.title, "category": g.category, "target_date": str(g.target_date) if g.target_date else None, "is_completed": g.is_completed} for g in goals],
        plans=[{"id": str(p.id), "title": p.title, "description": p.description, "domain": p.domain, "status": p.status, "due_date": str(p.due_date) if p.due_date else None} for p in plans],
        twin_snapshots=[{"id": str(ts.id), "date": str(ts.date), "state": ts.state} for ts in snapshots],
        predictions=[{"id": str(pr.id), "domain": pr.domain, "horizon": pr.horizon, "result": pr.result, "model_version": pr.model_version} for pr in predictions],
        simulations=[{"id": str(sm.id), "baseline": sm.baseline, "scenario": sm.scenario, "result": sm.result} for sm in simulations],
        chat_messages=[{"id": str(c.id), "role": c.role, "content": c.content, "created_at": str(c.created_at)} for c in chats],
    )

@router.delete("/delete-data")
async def delete_my_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    GDPR/CCPA Compliance: Hard cascade delete of the authenticated user and all their records.
    """
    await db.delete(current_user)
    await db.commit()
    return {"status": "success", "message": "All user data and account records permanently deleted."}
