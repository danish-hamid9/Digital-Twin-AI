import uuid
from datetime import datetime, timezone, date
from sqlalchemy import Column, String, Date, Float, ForeignKey, Index, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.user import GUID

class FinanceEntry(Base):
    __tablename__ = "finance_entries"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, default=date.today)
    type = Column(String(50), nullable=False)  # 'income' or 'expense'
    category = Column(String(100), nullable=False)
    amount = Column(Float, nullable=False)
    description = Column(String(500), nullable=True, default="")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="finance_entries")

    __table_args__ = (
        Index("ix_finance_entries_user_date", "user_id", "date"),
    )


class SavingsGoal(Base):
    __tablename__ = "savings_goals"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    target_amount = Column(Float, nullable=False)
    current_amount = Column(Float, nullable=False, default=0.0)
    target_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="savings_goals")
