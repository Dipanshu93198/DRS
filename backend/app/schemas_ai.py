from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class ChatMessage(BaseModel):
    """Single chat message"""
    role: str  # "user" or "assistant"
    content: str
    timestamp: Optional[datetime] = None


class ChatRequest(BaseModel):
    """Request for chat interaction"""
    message: str
    conversation_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "message": "How should civilians respond to this earthquake?",
                "context": {
                    "disaster_type": "earthquake",
                    "severity": 7.5,
                    "location": "San Francisco"
                }
            }
        }


class ChatResponse(BaseModel):
    """Response from chat"""
    message: str
    conversation_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    thinking_time_ms: Optional[int] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "message": "During an earthquake: DROP to hands and knees immediately...",
                "conversation_id": "conv-123",
                "timestamp": "2026-02-20T10:30:00",
                "thinking_time_ms": 2341
            }
        }


class DisasterExplanationRequest(BaseModel):
    """Request to explain a disaster"""
    disaster_type: str
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    severity_score: float = Field(..., ge=0, le=100)
    context: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "disaster_type": "fire",
                "latitude": 28.7041,
                "longitude": 77.1025,
                "severity_score": 75.0,
                "context": "High wind conditions, residential area"
            }
        }


class DisasterExplanationResponse(BaseModel):
    """Response with disaster explanation"""
    explanation: str
    disaster_type: str
    severity_level: str
    key_impacts: List[str]
    vulnerable_groups: List[str]
    recommended_actions: List[str]


class ResourcePriorityRequest(BaseModel):
    """Request for resource prioritization"""
    disaster_type: str
    severity_score: float = Field(..., ge=0, le=100)
    available_resources: List[Dict[str, Any]]
    current_situation: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "disaster_type": "fire",
                "severity_score": 85.0,
                "available_resources": [
                    {
                        "name": "Ambulance-01",
                        "type": "ambulance",
                        "distance_km": 5.2
                    },
                    {
                        "name": "Rescue-01",
                        "type": "rescue",
                        "distance_km": 8.0
                    }
                ],
                "current_situation": "Multiple buildings affected, civilians trapped"
            }
        }


class ResourcePriority(BaseModel):
    """Single resource priority recommendation"""
    rank: int
    resource_name: str
    resource_type: str
    reasoning: str
    estimated_arrival_minutes: float
    primary_role: str


class ResourcePriorityResponse(BaseModel):
    """Response with resource prioritization"""
    priorities: List[ResourcePriority]
    situation_assessment: str
    critical_challenges: List[str]
    resource_adequacy: str
    overall_strategy: str


class SafetyInstructionsRequest(BaseModel):
    """Request for safety instructions"""
    disaster_type: str
    location_type: str = "urban"  # urban, rural, coastal, etc.
    has_vulnerable_populations: bool = False
    
    class Config:
        json_schema_extra = {
            "example": {
                "disaster_type": "flood",
                "location_type": "urban",
                "has_vulnerable_populations": True
            }
        }


class SafetyInstructionsResponse(BaseModel):
    """Response with safety instructions"""
    disaster_type: str
    immediate_actions: List[str]
    safety_measures: List[str]
    things_to_avoid: List[str]
    evacuation_triggers: List[str]
    emergency_contact_info: str
    essential_supplies: List[str]
    special_considerations: Optional[str] = None


class SituationAnalysisRequest(BaseModel):
    """Request for comprehensive situation analysis"""
    disaster_type: str
    severity_score: float = Field(..., ge=0, le=100)
    affected_population: int
    affected_area_km2: float
    available_resources: int
    time_since_onset: str  # e.g., "2 hours", "30 minutes"
    
    class Config:
        json_schema_extra = {
            "example": {
                "disaster_type": "earthquake",
                "severity_score": 7.2,
                "affected_population": 500000,
                "affected_area_km2": 2000.0,
                "available_resources": 150,
                "time_since_onset": "2 hours"
            }
        }


class SituationAnalysisResponse(BaseModel):
    """Response with comprehensive situation analysis"""
    situation_summary: str
    severity_level: str
    critical_challenges: List[str]
    resource_adequacy_assessment: str
    prioritization_strategy: str
    next_30_minute_actions: List[str]
    forecast: Optional[str] = None


class ConversationHistoryRequest(BaseModel):
    """Request to get conversation history"""
    conversation_id: str
    limit: int = 10


class ConversationHistoryResponse(BaseModel):
    """Response with conversation history"""
    conversation_id: str
    messages: List[ChatMessage]
    created_at: Optional[datetime] = None
    last_updated: Optional[datetime] = None


class DecisionSummary(BaseModel):
    """Summary of AI decision"""
    recommendation: str
    confidence: float = Field(..., ge=0, le=1)
    key_factors: List[str]
    alternative_actions: List[str]
    risks: List[str]
    benefits: List[str]
