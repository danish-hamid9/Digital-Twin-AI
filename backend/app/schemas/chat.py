import uuid
import datetime as dt
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

class ChatMessageCreate(BaseModel):
    message: str = Field(min_length=1, max_length=4000, description="User's prompt or question")

class ToolCallRecord(BaseModel):
    tool_name: str
    arguments: Dict[str, Any]
    result: Optional[Dict[str, Any]] = None

class PlanProposal(BaseModel):
    action: str = Field(description="'create' or 'update'")
    plan_id: Optional[str] = None
    title: str
    description: Optional[str] = ""
    domain: str = "general"
    status: str = "pending"
    due_date: Optional[str] = None

class ChatTurnResponse(BaseModel):
    role: str = "assistant"
    content: str
    tool_calls: List[ToolCallRecord] = Field(default_factory=list)
    proposed_plans: List[PlanProposal] = Field(default_factory=list)
    provider: Optional[str] = "gemini"
    model: Optional[str] = None
    created_at: dt.datetime = Field(default_factory=dt.datetime.utcnow)

class ChatMessageOut(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    tool_calls: Optional[List[Dict[str, Any]]] = None
    tool_results: Optional[List[Dict[str, Any]]] = None
    provider: Optional[str] = None
    model: Optional[str] = None
    created_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)
