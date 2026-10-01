import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, JSON, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.user import GUID

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(50), nullable=False)  # user, assistant, system, tool
    content = Column(Text, nullable=False, default="")
    tool_calls = Column(JSON, nullable=True)
    tool_results = Column(JSON, nullable=True)
    provider = Column(String(50), nullable=True)
    model = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="chat_messages")
