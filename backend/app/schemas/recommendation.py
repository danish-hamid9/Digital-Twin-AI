"""
Pydantic Schemas for Phase 6 Recommendation Engine
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class RecommendationItem(BaseModel):
    id: str = Field(..., description="Unique deterministic identifier for recommendation (e.g. emergency_fund_low)")
    rule_id: str = Field(..., description="Identifier of the rule that generated this recommendation")
    domain: str = Field(..., description="'finance', 'study', 'habits', or 'general'")
    priority: str = Field(..., description="'high', 'medium', or 'low'")
    category: str = Field(..., description="'risk_alert', 'performance_warning', 'habit_streak', or 'positive_reinforcement'")
    title: str = Field(..., description="Actionable title for recommendation card")
    explanation: str = Field(..., description="Grounded explanation citing exact user numbers and thresholds")
    action_text: str = Field(..., description="Concrete suggested next step or intervention")
    action_link: Optional[str] = Field(None, description="In-app deep link (e.g. /finance, /habits, /simulator)")
    user_metric_name: str = Field(..., description="Name of the specific user metric evaluated")
    user_metric_value: str = Field(..., description="Formatted string of the user's current metric value")
    threshold_value: str = Field(..., description="Formatted string of the reference threshold violated")
    created_at: str = Field(..., description="Timestamp of recommendation evaluation")


class RecommendationResponse(BaseModel):
    recommendations: List[RecommendationItem] = Field(default_factory=list)
    total_count: int
    high_priority_count: int
    disclaimer: str = Field(..., description="Mandatory legal / medical / financial educational disclaimer")
