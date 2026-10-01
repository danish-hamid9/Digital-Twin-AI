import uuid
from datetime import datetime, timezone, date
from sqlalchemy import Column, String, Date, Float, ForeignKey, Index, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.user import GUID

class StudySession(Base):
    __tablename__ = "study_sessions"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, default=date.today)
    subject = Column(String(100), nullable=False)
    hours = Column(Float, nullable=False)
    score = Column(Float, nullable=True)  # Optional score on test/assessment (0-100)
    notes = Column(String(500), nullable=True, default="")
    source = Column(String(50), nullable=False, default="user")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="study_sessions")

    __table_args__ = (
        Index("ix_study_sessions_user_date", "user_id", "date"),
    )
