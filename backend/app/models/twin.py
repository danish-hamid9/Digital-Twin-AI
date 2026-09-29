import uuid
from datetime import datetime, timezone, date
from sqlalchemy import Column, String, Date, JSON, ForeignKey, Index, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.user import GUID

class TwinSnapshot(Base):
    __tablename__ = "twin_snapshots"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, default=date.today)
    state = Column(JSON, nullable=False, default=dict)  # Aggregate digital twin state vector
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="twin_snapshots")

    __table_args__ = (
        Index("ix_twin_snapshots_user_date", "user_id", "date"),
    )


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    domain = Column(String(50), nullable=False)  # 'finance', 'study', 'habits'
    horizon = Column(String(50), nullable=False)  # '30d', '60d', '90d', '180d'
    result = Column(JSON, nullable=False)  # Predictions with lower, expected, upper bounds
    model_version = Column(String(50), nullable=False, default="v1.0.0")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="predictions")


class Simulation(Base):
    __tablename__ = "simulations"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    baseline = Column(JSON, nullable=False)
    scenario = Column(JSON, nullable=False)
    result = Column(JSON, nullable=False)  # P10, P50, P90 Monte Carlo outputs
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="simulations")
