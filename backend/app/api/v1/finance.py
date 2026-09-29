import uuid
import math
from datetime import date
from typing import Optional, Literal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_

from app.core.database import get_db
from app.models.user import User
from app.models.finance import FinanceEntry, SavingsGoal
from app.schemas.finance import (
    FinanceEntryCreate,
    FinanceEntryUpdate,
    FinanceEntryOut,
    SavingsGoalCreate,
    SavingsGoalUpdate,
    SavingsGoalOut,
)
from app.schemas.common import PaginatedResponse
from app.api.deps import get_current_user

router = APIRouter()

# -------------------------------------------------------------
# Finance Entries (Scoped strictly to current_user)
# -------------------------------------------------------------

@router.get("/entries", response_model=PaginatedResponse[FinanceEntryOut])
async def list_finance_entries(
    start_date: Optional[date] = Query(None, description="Filter from date (inclusive)"),
    end_date: Optional[date] = Query(None, description="Filter to date (inclusive)"),
    type: Optional[Literal["income", "expense"]] = Query(None, description="Filter by income or expense"),
    category: Optional[str] = Query(None, description="Filter by category"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conditions = [FinanceEntry.user_id == current_user.id]

    if start_date:
        conditions.append(FinanceEntry.date >= start_date)
    if end_date:
        conditions.append(FinanceEntry.date <= end_date)
    if type:
        conditions.append(FinanceEntry.type == type)
    if category:
        conditions.append(FinanceEntry.category.ilike(f"%{category}%"))

    # Total count query
    count_stmt = select(func.count(FinanceEntry.id)).where(and_(*conditions))
    total_result = await db.execute(count_stmt)
    total = total_result.scalar_one()

    # Paginated data query
    offset = (page - 1) * page_size
    stmt = (
        select(FinanceEntry)
        .where(and_(*conditions))
        .order_by(desc(FinanceEntry.date), desc(FinanceEntry.created_at))
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


@router.post("/entries", response_model=FinanceEntryOut, status_code=status.HTTP_201_CREATED)
async def create_finance_entry(
    entry_in: FinanceEntryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    entry = FinanceEntry(
        user_id=current_user.id,
        date=entry_in.date,
        type=entry_in.entry_type,
        category=entry_in.category.strip(),
        amount=round(entry_in.amount, 2),
        description=entry_in.description or "",
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


@router.get("/entries/{entry_id}", response_model=FinanceEntryOut)
async def get_finance_entry(
    entry_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(FinanceEntry).where(
        FinanceEntry.id == entry_id,
        FinanceEntry.user_id == current_user.id
    )
    result = await db.execute(stmt)
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finance entry not found")
    return entry


@router.put("/entries/{entry_id}", response_model=FinanceEntryOut)
async def update_finance_entry(
    entry_id: uuid.UUID,
    entry_in: FinanceEntryUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(FinanceEntry).where(
        FinanceEntry.id == entry_id,
        FinanceEntry.user_id == current_user.id
    )
    result = await db.execute(stmt)
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finance entry not found")

    update_data = entry_in.model_dump(exclude_unset=True)
    if "entry_type" in update_data:
        entry.type = update_data.pop("entry_type")
    for field, val in update_data.items():
        if field == "amount" and val is not None:
            val = round(val, 2)
        setattr(entry, field, val)

    await db.commit()
    await db.refresh(entry)
    return entry


@router.delete("/entries/{entry_id}", status_code=status.HTTP_200_OK)
async def delete_finance_entry(
    entry_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(FinanceEntry).where(
        FinanceEntry.id == entry_id,
        FinanceEntry.user_id == current_user.id
    )
    result = await db.execute(stmt)
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finance entry not found")

    await db.delete(entry)
    await db.commit()
    return {"status": "success", "message": "Finance entry deleted"}


# -------------------------------------------------------------
# Savings Goals (Scoped strictly to current_user)
# -------------------------------------------------------------

@router.get("/goals", response_model=list[SavingsGoalOut])
async def list_savings_goals(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(SavingsGoal)
        .where(SavingsGoal.user_id == current_user.id)
        .order_by(desc(SavingsGoal.created_at))
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/goals", response_model=SavingsGoalOut, status_code=status.HTTP_201_CREATED)
async def create_savings_goal(
    goal_in: SavingsGoalCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    goal = SavingsGoal(
        user_id=current_user.id,
        title=goal_in.title.strip(),
        target_amount=round(goal_in.target_amount, 2),
        current_amount=round(goal_in.current_amount, 2),
        target_date=goal_in.target_date,
    )
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return goal


@router.put("/goals/{goal_id}", response_model=SavingsGoalOut)
async def update_savings_goal(
    goal_id: uuid.UUID,
    goal_in: SavingsGoalUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(SavingsGoal).where(
        SavingsGoal.id == goal_id,
        SavingsGoal.user_id == current_user.id
    )
    result = await db.execute(stmt)
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Savings goal not found")

    update_data = goal_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if field in ("target_amount", "current_amount") and val is not None:
            val = round(val, 2)
        setattr(goal, field, val)

    await db.commit()
    await db.refresh(goal)
    return goal


@router.delete("/goals/{goal_id}", status_code=status.HTTP_200_OK)
async def delete_savings_goal(
    goal_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(SavingsGoal).where(
        SavingsGoal.id == goal_id,
        SavingsGoal.user_id == current_user.id
    )
    result = await db.execute(stmt)
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Savings goal not found")

    await db.delete(goal)
    await db.commit()
    return {"status": "success", "message": "Savings goal deleted"}
