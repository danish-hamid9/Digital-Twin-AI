import uuid
from datetime import datetime, timezone, date
from sqlalchemy import Column, String, Date, Float, Integer, Boolean, ForeignKey, Index, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.user import GUID

class HabitLog(Base):
    __tablename__ = "habit_logs"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, default=date.today)
    habit = Column(String(100), nullable=False)
    done = Column(Boolean, nullable=False, default=False)
    sleep_hours = Column(Float, nullable=False, default=7.0)
    exercise_minutes = Column(Integer, nullable=False, default=0)
    mood = Column(Integer, nullable=False, default=3)  # 1 to 5 scale
    source = Column(String(50), nullable=False, default="user")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="habit_logs")

    __table_args__ = (
        Index("ix_habit_logs_user_date", "user_id", "date"),
    )


class Goal(Base):
    __tablename__ = "goals"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False, default="general")  # finance, study, wellbeing, general
    target_date = Column(Date, nullable=True)
    is_completed = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="goals")
