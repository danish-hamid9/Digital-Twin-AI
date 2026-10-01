import uuid
import datetime as dt
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.plan import Plan
from app.schemas.plan import PlanCreate, PlanUpdate, PlanOut

router = APIRouter()

@router.get("", response_model=List[PlanOut])
async def list_plans(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve all action plans for the authenticated user."""
    query = select(Plan).where(Plan.user_id == current_user.id)
    if status_filter and status_filter != "all":
        query = query.where(Plan.status == status_filter)
    res = await db.execute(query.order_by(desc(Plan.created_at)))
    return res.scalars().all()

@router.post("", response_model=PlanOut, status_code=status.HTTP_201_CREATED)
async def create_plan(
    plan_in: PlanCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Confirm and persist a newly created plan."""
    plan = Plan(
        user_id=current_user.id,
        title=plan_in.title,
        description=plan_in.description or "",
        domain=plan_in.domain or "general",
        status=plan_in.status or "pending",
        due_date=plan_in.due_date,
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return plan

@router.put("/{plan_id}", response_model=PlanOut)
async def update_plan(
    plan_id: uuid.UUID,
    plan_in: PlanUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an existing plan after user confirmation."""
    res = await db.execute(
        select(Plan).where(Plan.id == plan_id, Plan.user_id == current_user.id)
    )
    plan = res.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")

    # Use model_dump(exclude_unset=True) so only supplied fields are applied.
    # setattr avoids Pyrefly bad-assignment errors from Optional → non-Optional column types.
    for field, value in plan_in.model_dump(exclude_unset=True).items():
        setattr(plan, field, value)

    await db.commit()
    await db.refresh(plan)
    return plan


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_plan(
    plan_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a plan."""
    res = await db.execute(
        select(Plan).where(Plan.id == plan_id, Plan.user_id == current_user.id)
    )
    plan = res.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")

    await db.delete(plan)
    await db.commit()
