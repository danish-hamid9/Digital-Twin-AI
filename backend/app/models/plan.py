import uuid
from datetime import datetime, timezone, date
from sqlalchemy import Column, String, Text, Date, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.user import GUID

class Plan(Base):
    __tablename__ = "plans"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True, default="")
    domain = Column(String(50), nullable=False, default="general")  # finance, study, habit, general
    status = Column(String(50), nullable=False, default="pending")  # proposed, pending, in_progress, completed, cancelled
    due_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="plans")
