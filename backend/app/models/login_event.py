import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Index
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.user import GUID

class LoginEvent(Base):
    __tablename__ = "login_events"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    success = Column(Boolean, nullable=False, default=True)
    method = Column(String(50), nullable=False, default="password")  # "password" or "demo-login"
    browser_os = Column(String(255), nullable=False, default="Unknown")
    ip_address = Column(String(100), nullable=False, default="")

    user = relationship("User", back_populates="login_events")
