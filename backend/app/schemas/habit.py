import uuid
import datetime as dt
from typing import Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict
from app.schemas.finance import validate_sane_date

class HabitLogBase(BaseModel):
    date: dt.date = Field(default_factory=dt.date.today)
    habit: str = Field(min_length=1, max_length=100)
    done: bool = Field(default=False)
    sleep_hours: float = Field(default=7.0, ge=0.0, le=24.0, description="Sleep hours between 0 and 24")
    exercise_minutes: int = Field(default=0, ge=0, le=1440, description="Exercise minutes between 0 and 1440")
    mood: int = Field(default=3, ge=1, le=5, description="Mood score on 1-5 scale")

    @field_validator("date")
    @classmethod
    def check_date_range(cls, v: dt.date) -> dt.date:
        return validate_sane_date(v)

class HabitLogCreate(HabitLogBase):
    pass

class HabitLogUpdate(BaseModel):
    date: Optional[dt.date] = None
    habit: Optional[str] = Field(default=None, min_length=1, max_length=100)
    done: Optional[bool] = None
    sleep_hours: Optional[float] = Field(default=None, ge=0.0, le=24.0)
    exercise_minutes: Optional[int] = Field(default=None, ge=0, le=1440)
    mood: Optional[int] = Field(default=None, ge=1, le=5)

    @field_validator("date")
    @classmethod
    def check_date_range(cls, v: Optional[dt.date]) -> Optional[dt.date]:
        if v is not None:
            return validate_sane_date(v)
        return v

class HabitLogOut(HabitLogBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)


class GoalBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    category: str = Field(default="general", max_length=50)
    target_date: Optional[dt.date] = None
    is_completed: bool = False

    @field_validator("target_date")
    @classmethod
    def check_target_date(cls, v: Optional[dt.date]) -> Optional[dt.date]:
        if v is not None:
            return validate_sane_date(v)
        return v

class GoalCreate(GoalBase):
    pass

class GoalUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    category: Optional[str] = Field(default=None, max_length=50)
    target_date: Optional[dt.date] = None
    is_completed: Optional[bool] = None

class GoalOut(GoalBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)
