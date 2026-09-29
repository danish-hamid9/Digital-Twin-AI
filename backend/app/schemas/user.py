import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict

class ProfileBase(BaseModel):
    full_name: Optional[str] = ""
    occupation: Optional[str] = ""
    currency: str = Field(default="USD", max_length=10)
    monthly_target_savings: float = 500.0
    target_study_hours_week: float = 15.0
    target_sleep_hours: float = 7.5

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    occupation: Optional[str] = None
    currency: Optional[str] = None
    monthly_target_savings: Optional[float] = None
    target_study_hours_week: Optional[float] = None
    target_sleep_hours: Optional[float] = None

class ProfileOut(ProfileBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=100)
    full_name: Optional[str] = ""
    currency: Optional[str] = "USD"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    created_at: datetime
    profile: Optional[ProfileOut] = None

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class UserDataExport(BaseModel):
    user: UserOut
    profile: Optional[ProfileOut]
    finance_entries: list[dict]
    savings_goals: list[dict]
    study_sessions: list[dict]
    habit_logs: list[dict]
    goals: list[dict]
    plans: list[dict]
    twin_snapshots: list[dict]
    predictions: list[dict]
    simulations: list[dict]
    chat_messages: list[dict]
