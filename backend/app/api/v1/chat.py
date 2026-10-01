from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db
from app.core.security import check_rate_limit
from app.core.config import settings
from app.api.deps import get_current_user
from app.models.user import User
from app.models.chat import ChatMessage
from app.schemas.chat import ChatMessageCreate, ChatTurnResponse, ChatMessageOut
from app.services.chat_service import ChatService

router = APIRouter()

chat_service = ChatService()


@router.post("/send", response_model=ChatTurnResponse)
async def send_chat_message(
    request: Request,
    chat_in: ChatMessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Send a message to the Gemini Digital Twin assistant.
    Executes tool-calling loop, grounded in real personal data, with plan proposals and disclaimers.
    Rate-limited to RATE_LIMIT_CHAT_PER_MINUTE requests per IP.
    """
    check_rate_limit(request, key_prefix="chat_send", limit=settings.RATE_LIMIT_CHAT_PER_MINUTE)
    try:
        response = await chat_service.execute_chat_turn(
            db=db,
            user=current_user,
            user_message=chat_in.message,
        )
        return response
    except Exception as e:
        import re
        err_code = getattr(e, "code", None) or getattr(e, "status_code", None)
        err_str = str(e)
        if (err_code in (429, 503)) or bool(re.search(r"\b(429|503)\b", err_str)):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="The AI assistant is temporarily busy or rate-limited. Please try again in a few moments.",
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The AI assistant encountered an unexpected error while processing your request. Please try again later.",
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
