from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.chat import ChatMessage
from app.schemas.chat import ChatMessageCreate, ChatTurnResponse, ChatMessageOut
from app.services.chat_service import ChatService

router = APIRouter()

chat_service = ChatService()

@router.post("/send", response_model=ChatTurnResponse)
async def send_chat_message(
    chat_in: ChatMessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Send a message to the Gemini Digital Twin assistant.
    Executes tool-calling loop, grounded in real personal data, with plan proposals and disclaimers.
    """
    try:
        response = await chat_service.execute_chat_turn(
            db=db,
            user=current_user,
            user_message=chat_in.message,
        )
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat assistant error: {str(e)}"
        )

@router.get("/history", response_model=List[ChatMessageOut])
async def get_chat_history(
    limit: int = Query(default=30, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve chronologically ordered chat messages for the authenticated user."""
    res = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.user_id == current_user.id)
        .order_by(desc(ChatMessage.created_at))
        .limit(limit)
    )
    messages = res.scalars().all()
    return list(reversed(messages))

@router.delete("/history", status_code=status.HTTP_204_NO_CONTENT)
async def clear_chat_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Clear chat history for the authenticated user."""
    res = await db.execute(
        select(ChatMessage).where(ChatMessage.user_id == current_user.id)
    )
    messages = res.scalars().all()
    for m in messages:
        await db.delete(m)
    await db.commit()
