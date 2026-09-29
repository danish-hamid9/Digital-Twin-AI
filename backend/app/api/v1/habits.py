import uuid
import math
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_

from app.core.database import get_db
from app.models.user import User
from app.models.habit import HabitLog, Goal
from app.schemas.habit import (
    HabitLogCreate,
    HabitLogUpdate,
    HabitLogOut,
    GoalCreate,
    GoalUpdate,
    GoalOut,
)
from app.schemas.common import PaginatedResponse
from app.api.deps import get_current_user

router = APIRouter()

# -------------------------------------------------------------
# Habit Logs (Scoped strictly to current_user)
# -------------------------------------------------------------

@router.get("/logs", response_model=PaginatedResponse[HabitLogOut])
async def list_habit_logs(
    start_date: Optional[date] = Query(None, description="Filter from date (inclusive)"),
    end_date: Optional[date] = Query(None, description="Filter to date (inclusive)"),
    habit: Optional[str] = Query(None, description="Filter by habit name"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conditions = [HabitLog.user_id == current_user.id]

    if start_date:
        conditions.append(HabitLog.date >= start_date)
    if end_date:
        conditions.append(HabitLog.date <= end_date)
    if habit:
        conditions.append(HabitLog.habit.ilike(f"%{habit}%"))

    count_stmt = select(func.count(HabitLog.id)).where(and_(*conditions))
    total_result = await db.execute(count_stmt)
    total = total_result.scalar_one()

    offset = (page - 1) * page_size
    stmt = (
        select(HabitLog)
        .where(and_(*conditions))
        .order_by(desc(HabitLog.date), desc(HabitLog.created_at))
        .offset(offset)
        .limit(page_size)
    )
    result = await db.execute(stmt)
    items = result.scalars().all()

    total_pages = math.ceil(total / page_size) if total > 0 else 1

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post("/logs", response_model=HabitLogOut, status_code=status.HTTP_201_CREATED)
async def create_habit_log(
    log_in: HabitLogCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    log = HabitLog(
        user_id=current_user.id,
        date=log_in.date,
        habit=log_in.habit.strip(),
        done=log_in.done,
        sleep_hours=round(log_in.sleep_hours, 2),
        exercise_minutes=log_in.exercise_minutes,
        mood=log_in.mood,
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)
    return log


@router.get("/logs/{log_id}", response_model=HabitLogOut)
async def get_habit_log(
    log_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(HabitLog).where(
        HabitLog.id == log_id,
        HabitLog.user_id == current_user.id
    )
    result = await db.execute(stmt)
    log = result.scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habit log not found")
    return log


@router.put("/logs/{log_id}", response_model=HabitLogOut)
async def update_habit_log(
    log_id: uuid.UUID,
    log_in: HabitLogUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(HabitLog).where(
        HabitLog.id == log_id,
        HabitLog.user_id == current_user.id
    )
    result = await db.execute(stmt)
    log = result.scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habit log not found")

    update_data = log_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if field == "sleep_hours" and val is not None:
            val = round(val, 2)
        setattr(log, field, val)

    await db.commit()
    await db.refresh(log)
    return log


@router.delete("/logs/{log_id}", status_code=status.HTTP_200_OK)
async def delete_habit_log(
    log_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(HabitLog).where(
        HabitLog.id == log_id,
        HabitLog.user_id == current_user.id
    )
    result = await db.execute(stmt)
    log = result.scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Habit log not found")

    await db.delete(log)
    await db.commit()
    return {"status": "success", "message": "Habit log deleted"}


# -------------------------------------------------------------
# Goals (Scoped strictly to current_user)
# -------------------------------------------------------------

@router.get("/goals", response_model=list[GoalOut])
async def list_goals(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Goal).where(Goal.user_id == current_user.id).order_by(desc(Goal.created_at))
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/goals", response_model=GoalOut, status_code=status.HTTP_201_CREATED)
async def create_goal(
    goal_in: GoalCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    goal = Goal(
        user_id=current_user.id,
        title=goal_in.title.strip(),
        category=goal_in.category.strip(),
        target_date=goal_in.target_date,
        is_completed=goal_in.is_completed,
    )
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return goal


@router.put("/goals/{goal_id}", response_model=GoalOut)
async def update_goal(
    goal_id: uuid.UUID,
    goal_in: GoalUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Goal).where(
        Goal.id == goal_id,
        Goal.user_id == current_user.id
    )
    result = await db.execute(stmt)
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")

    update_data = goal_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(goal, field, val)

    await db.commit()
    await db.refresh(goal)
    return goal


@router.delete("/goals/{goal_id}", status_code=status.HTTP_200_OK)
async def delete_goal(
    goal_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Goal).where(
        Goal.id == goal_id,
        Goal.user_id == current_user.id
    )
    result = await db.execute(stmt)
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")

    await db.delete(goal)
    await db.commit()
    return {"status": "success", "message": "Goal deleted"}
