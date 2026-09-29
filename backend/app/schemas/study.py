import uuid
import datetime as dt
from typing import Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict
from app.schemas.finance import validate_sane_date

class StudySessionBase(BaseModel):
    date: dt.date = Field(default_factory=dt.date.today)
    subject: str = Field(min_length=1, max_length=100)
    hours: float = Field(gt=0, le=24.0, description="Hours must be positive and at most 24.0")
    score: Optional[float] = Field(default=None, ge=0.0, le=100.0, description="Score on 0-100 scale")
    notes: Optional[str] = Field(default="", max_length=500)

    @field_validator("date")
    @classmethod
    def check_date_range(cls, v: dt.date) -> dt.date:
        return validate_sane_date(v)

class StudySessionCreate(StudySessionBase):
    pass

class StudySessionUpdate(BaseModel):
    date: Optional[dt.date] = None
    subject: Optional[str] = Field(default=None, min_length=1, max_length=100)
    hours: Optional[float] = Field(default=None, gt=0, le=24.0)
    score: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    notes: Optional[str] = Field(default=None, max_length=500)

    @field_validator("date")
    @classmethod
    def check_date_range(cls, v: Optional[dt.date]) -> Optional[dt.date]:
        if v is not None:
            return validate_sane_date(v)
        return v

class StudySessionOut(StudySessionBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)
