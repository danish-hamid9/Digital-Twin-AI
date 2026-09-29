import uuid
import math
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_

from app.core.database import get_db
from app.models.user import User
from app.models.study import StudySession
from app.schemas.study import StudySessionCreate, StudySessionUpdate, StudySessionOut
from app.schemas.common import PaginatedResponse
from app.api.deps import get_current_user

router = APIRouter()

@router.get("/sessions", response_model=PaginatedResponse[StudySessionOut])
async def list_study_sessions(
    start_date: Optional[date] = Query(None, description="Filter from date (inclusive)"),
    end_date: Optional[date] = Query(None, description="Filter to date (inclusive)"),
    subject: Optional[str] = Query(None, description="Filter by subject"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conditions = [StudySession.user_id == current_user.id]

    if start_date:
        conditions.append(StudySession.date >= start_date)
    if end_date:
        conditions.append(StudySession.date <= end_date)
    if subject:
        conditions.append(StudySession.subject.ilike(f"%{subject}%"))

    count_stmt = select(func.count(StudySession.id)).where(and_(*conditions))
    total_result = await db.execute(count_stmt)
    total = total_result.scalar_one()

    offset = (page - 1) * page_size
    stmt = (
        select(StudySession)
        .where(and_(*conditions))
        .order_by(desc(StudySession.date), desc(StudySession.created_at))
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


@router.post("/sessions", response_model=StudySessionOut, status_code=status.HTTP_201_CREATED)
async def create_study_session(
    session_in: StudySessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = StudySession(
        user_id=current_user.id,
        date=session_in.date,
        subject=session_in.subject.strip(),
        hours=round(session_in.hours, 2),
        score=round(session_in.score, 2) if session_in.score is not None else None,
        notes=session_in.notes or "",
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


@router.get("/sessions/{session_id}", response_model=StudySessionOut)
async def get_study_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(StudySession).where(
        StudySession.id == session_id,
        StudySession.user_id == current_user.id
    )
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study session not found")
    return session


@router.put("/sessions/{session_id}", response_model=StudySessionOut)
async def update_study_session(
    session_id: uuid.UUID,
    session_in: StudySessionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(StudySession).where(
        StudySession.id == session_id,
        StudySession.user_id == current_user.id
    )
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study session not found")

    update_data = session_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if field in ("hours", "score") and val is not None:
            val = round(val, 2)
        setattr(session, field, val)

    await db.commit()
    await db.refresh(session)
    return session


@router.delete("/sessions/{session_id}", status_code=status.HTTP_200_OK)
async def delete_study_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(StudySession).where(
        StudySession.id == session_id,
        StudySession.user_id == current_user.id
    )
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study session not found")

    await db.delete(session)
    await db.commit()
    return {"status": "success", "message": "Study session deleted"}
