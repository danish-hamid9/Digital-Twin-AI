import uuid
import datetime as dt
from typing import Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict
from app.schemas.finance import validate_sane_date

class PlanBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: Optional[str] = Field(default="")
    domain: str = Field(default="general", max_length=50)  # finance, study, habit, general
    status: str = Field(default="pending", max_length=50)  # proposed, pending, in_progress, completed, cancelled
    due_date: Optional[dt.date] = None

    @field_validator("due_date")
    @classmethod
    def check_due_date(cls, v: Optional[dt.date]) -> Optional[dt.date]:
        if v is not None:
            return validate_sane_date(v)
        return v

class PlanCreate(PlanBase):
    pass

class PlanUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = None
    domain: Optional[str] = Field(default=None, max_length=50)
    status: Optional[str] = Field(default=None, max_length=50)
    due_date: Optional[dt.date] = None

    @field_validator("due_date")
    @classmethod
    def check_due_date(cls, v: Optional[dt.date]) -> Optional[dt.date]:
        if v is not None:
            return validate_sane_date(v)
        return v

class PlanOut(PlanBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)
