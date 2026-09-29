import uuid
import datetime as dt
from typing import Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict

MIN_VALID_DATE = dt.date(2000, 1, 1)
MAX_VALID_DATE = dt.date(2050, 12, 31)

def validate_sane_date(v: dt.date) -> dt.date:
    if v < MIN_VALID_DATE or v > MAX_VALID_DATE:
        raise ValueError(f"Date must be between {MIN_VALID_DATE} and {MAX_VALID_DATE}")
    return v

class FinanceEntryBase(BaseModel):
    date: dt.date = Field(default_factory=dt.date.today)
    entry_type: str = Field(..., alias="type", description="Must be 'income' or 'expense'")
    category: str = Field(min_length=1, max_length=100)
    amount: float = Field(gt=0, le=10_000_000, description="Amount must be positive and bounded")
    description: Optional[str] = Field(default="", max_length=500)

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    @field_validator("entry_type")
    @classmethod
    def check_type(cls, v: str) -> str:
        if v not in ("income", "expense"):
            raise ValueError("type must be either 'income' or 'expense'")
        return v

    @field_validator("date")
    @classmethod
    def check_date_range(cls, v: dt.date) -> dt.date:
        return validate_sane_date(v)

class FinanceEntryCreate(FinanceEntryBase):
    pass

class FinanceEntryUpdate(BaseModel):
    date: Optional[dt.date] = None
    entry_type: Optional[str] = Field(default=None, alias="type")
    category: Optional[str] = Field(default=None, min_length=1, max_length=100)
    amount: Optional[float] = Field(default=None, gt=0, le=10_000_000)
    description: Optional[str] = Field(default=None, max_length=500)

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    @field_validator("entry_type")
    @classmethod
    def check_type(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ("income", "expense"):
            raise ValueError("type must be either 'income' or 'expense'")
        return v

    @field_validator("date")
    @classmethod
    def check_date_range(cls, v: Optional[dt.date]) -> Optional[dt.date]:
        if v is not None:
            return validate_sane_date(v)
        return v

class FinanceEntryOut(FinanceEntryBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: dt.datetime

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class SavingsGoalBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    target_amount: float = Field(gt=0, le=100_000_000)
    current_amount: float = Field(default=0.0, ge=0, le=100_000_000)
    target_date: Optional[dt.date] = None

    @field_validator("target_date")
    @classmethod
    def check_target_date(cls, v: Optional[dt.date]) -> Optional[dt.date]:
        if v is not None:
            return validate_sane_date(v)
        return v

class SavingsGoalCreate(SavingsGoalBase):
    pass

class SavingsGoalUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    target_amount: Optional[float] = Field(default=None, gt=0, le=100_000_000)
    current_amount: Optional[float] = Field(default=None, ge=0, le=100_000_000)
    target_date: Optional[dt.date] = None

class SavingsGoalOut(SavingsGoalBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)
