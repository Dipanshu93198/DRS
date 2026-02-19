from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any
from enum import Enum


class DisasterType(str, Enum):
    EARTHQUAKE = "earthquake"
    FLOOD = "flood"
    HURRICANE = "hurricane"
    TORNADO = "tornado"
    WILDFIRE = "wildfire"
    LANDSLIDE = "landslide"
    TSUNAMI = "tsunami"
    EXPLOSION = "explosion"
    CHEMICAL_LEAK = "chemical_leak"
    INDUSTRIAL_ACCIDENT = "industrial_accident"
    DISEASE_OUTBREAK = "disease_outbreak"
    OTHER = "other"


class DisasterStatus(str, Enum):
    REPORTED = "reported"
    VALIDATED = "validated"
    ACTIVE = "active"
    CONTAINED = "contained"
    RESOLVED = "resolved"
    CANCELLED = "cancelled"


class DisasterValidationRequest(BaseModel):
    """Request to validate a disaster report"""
    type: DisasterType
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    severity_score: float = Field(..., ge=0, le=10)
    description: str
    source: str  # e.g., "USGS", "citizen_report", "official", "social_media"
    metadata: Optional[Dict[str, Any]] = None


class DisasterValidationResponse(BaseModel):
    """Response with validation results"""
    is_valid: bool
    validation_score: float  # 0-100 confidence
    reason: str
    severity_level: str  # Low, Medium, High, Critical
    recommended_actions: list[str]
    validation_details: Dict[str, Any]


class DisasterCreate(BaseModel):
    """Request to create a disaster record"""
    type: DisasterType
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    severity_score: float = Field(..., ge=0, le=10)
    affected_area_radius_km: Optional[float] = None
    estimated_affected_population: Optional[int] = None
    num_casualties: int = 0
    description: str
    source: str
    metadata: Optional[Dict[str, Any]] = None
    is_validated: bool = False
    validation_score: Optional[float] = None


class DisasterResponse(BaseModel):
    """Response with disaster information"""
    id: int
    type: DisasterType
    status: DisasterStatus
    latitude: float
    longitude: float
    severity_score: float
    is_validated: bool
    validation_score: Optional[float]
    affected_area_radius_km: Optional[float]
    estimated_affected_population: Optional[int]
    num_casualties: int
    description: str
    source: str
    metadata: Optional[Dict[str, Any]]
    reported_at: datetime
    validated_at: Optional[datetime]
    resolved_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class ResourceType(str, Enum):
    AMBULANCE = "ambulance"
    DRONE = "drone"
    RESCUE = "rescue"


class ResourceStatus(str, Enum):
    AVAILABLE = "available"
    BUSY = "busy"
    OFFLINE = "offline"


class LocationUpdateRequest(BaseModel):
    """Request to update resource location"""
    resource_id: int
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    speed: Optional[float] = 0.0
    heading: Optional[float] = 0.0
    
    class Config:
        json_schema_extra = {
            "example": {
                "resource_id": 1,
                "latitude": 28.7041,
                "longitude": 77.1025,
                "speed": 50.0,
                "heading": 45.0
            }
        }


class ResourceCreate(BaseModel):
    """Request to create a new resource"""
    name: str
    type: ResourceType
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    status: Optional[ResourceStatus] = ResourceStatus.AVAILABLE
    metadata: Optional[Dict[str, Any]] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Ambulance-01",
                "type": "ambulance",
                "latitude": 28.7041,
                "longitude": 77.1025,
                "status": "available",
                "metadata": {"capacity": 2, "specialization": "trauma"}
            }
        }


class ResourceUpdate(BaseModel):
    """Request to update resource"""
    name: Optional[str] = None
    status: Optional[ResourceStatus] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    speed: Optional[float] = None
    heading: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None


class ResourceResponse(BaseModel):
    """Response with resource information"""
    id: int
    name: str
    type: ResourceType
    status: ResourceStatus
    latitude: float
    longitude: float
    speed: float
    heading: float
    metadata: Optional[Dict[str, Any]] = None
    last_updated: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True


class NearbyResource(BaseModel):
    """Resource with calculated distance"""
    resource: ResourceResponse
    distance_km: float
    estimated_arrival_minutes: float


class DispatchRequest(BaseModel):
    """Request for auto-dispatch"""
    disaster_lat: float = Field(..., ge=-90, le=90)
    disaster_lon: float = Field(..., ge=-180, le=180)
    disaster_type: str
    severity_score: float = Field(..., ge=0, le=100)
    resource_type_priority: Optional[list[ResourceType]] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "disaster_lat": 28.7041,
                "disaster_lon": 77.1025,
                "disaster_type": "fire",
                "severity_score": 85.5,
                "resource_type_priority": ["ambulance", "rescue"]
            }
        }


class DispatchRecommendation(BaseModel):
    """Dispatch recommendation response"""
    resource_id: int
    resource_name: str
    resource_type: ResourceType
    distance_km: float
    current_location: dict
    estimated_arrival_minutes: float
    reason: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "resource_id": 1,
                "resource_name": "Ambulance-01",
                "resource_type": "ambulance",
                "distance_km": 5.2,
                "current_location": {"latitude": 28.6500, "longitude": 77.0500},
                "estimated_arrival_minutes": 12,
                "reason": "Nearest available ambulance with trauma specialization"
            }
        }


class DispatchRecord(BaseModel):
    """Response with dispatch record"""
    id: int
    resource_id: int
    disaster_lat: float
    disaster_lon: float
    disaster_type: str
    severity_score: float
    distance_km: float
    dispatch_time: datetime
    estimated_arrival: datetime
    status: str
    
    class Config:
        from_attributes = True


class StatusFilter(str, Enum):
    """Filter for resource status"""
    ALL = "all"
    AVAILABLE = "available"
    BUSY = "busy"
    OFFLINE = "offline"


# ============ PHASE 5: SOS SCHEMAS ============

class EmergencyType(str, Enum):
    """Type of emergency"""
    MEDICAL = "medical"
    ACCIDENT = "accident"
    FIRE = "fire"
    FLOODING = "flooding"
    TRAPPED = "trapped"
    MISSING = "missing"
    OTHER = "other"


class SOSStatus(str, Enum):
    """Status of SOS report"""
    PENDING = "pending"
    ACKNOWLEDGED = "acknowledged"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CANCELLED = "cancelled"


class SOSReportCreate(BaseModel):
    """Request to create a new SOS report"""
    reporter_name: str = Field(..., min_length=1, max_length=100)
    reporter_phone: str = Field(..., min_length=10, max_length=20)
    reporter_email: Optional[str] = None
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    emergency_type: EmergencyType
    description: str = Field(..., min_length=10, max_length=1000)
    severity_score: float = Field(..., ge=0, le=10)
    num_people_affected: int = Field(default=1, ge=1)
    has_injuries: int = Field(default=0, ge=0)
    requires_evacuation: int = Field(default=0, ge=0)
    is_urgent: bool = False
    metadata: Optional[Dict[str, Any]] = None
    crowd_assistance_enabled: bool = True
    
    class Config:
        json_schema_extra = {
            "example": {
                "reporter_name": "Rajesh Kumar",
                "reporter_phone": "+919876543210",
                "reporter_email": "rajesh@example.com",
                "latitude": 28.7041,
                "longitude": 77.1025,
                "emergency_type": "medical",
                "description": "Person collapsed in the mall, unconscious, heavy bleeding on head",
                "severity_score": 9.0,
                "num_people_affected": 1,
                "has_injuries": 1,
                "requires_evacuation": 1,
                "is_urgent": True,
                "metadata": {
                    "vulnerable_groups": ["elderly"],
                    "hazards": ["traffic"],
                    "access_info": "Near main entrance"
                },
                "crowd_assistance_enabled": True
            }
        }


class SOSReportUpdate(BaseModel):
    """Request to update SOS report"""
    status: Optional[SOSStatus] = None
    description: Optional[str] = None
    num_people_affected: Optional[int] = None
    has_injuries: Optional[int] = None
    requires_evacuation: Optional[int] = None
    nearest_resource_id: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None


class SOSReportResponse(BaseModel):
    """Response with SOS report details"""
    id: int
    reporter_name: str
    reporter_phone: str
    latitude: float
    longitude: float
    emergency_type: EmergencyType
    description: str
    severity_score: float
    status: SOSStatus
    num_people_affected: int
    has_injuries: int
    requires_evacuation: int
    is_urgent: bool
    nearest_resource_id: Optional[int] = None
    distance_to_nearest_resource_km: Optional[float] = None
    crowd_assistance_enabled: bool
    reported_at: datetime
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class CrowdAssistanceOffer(BaseModel):
    """Request to offer assistance for SOS"""
    sos_report_id: int
    helper_name: str = Field(..., min_length=1, max_length=100)
    helper_phone: str = Field(..., min_length=10, max_length=20)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    assistance_type: str = Field(..., min_length=1, max_length=50)  # medical_knowledge, transportation, shelter, supplies, etc
    description: str = Field(..., min_length=10, max_length=500)
    
    class Config:
        json_schema_extra = {
            "example": {
                "sos_report_id": 1,
                "helper_name": "Priya Sharma",
                "helper_phone": "+919876543211",
                "latitude": 28.7050,
                "longitude": 77.1030,
                "assistance_type": "medical_knowledge",
                "description": "I'm a nursing student, can provide first aid assistance"
            }
        }


class CrowdAssistanceResponse(BaseModel):
    """Response with crowd assistance details"""
    id: int
    sos_report_id: int
    helper_name: str
    helper_phone: str
    latitude: float
    longitude: float
    assistance_type: str
    description: str
    availability_status: str
    distance_km: float
    estimated_arrival_min: Optional[int] = None
    is_verified: bool
    rating: Optional[float] = None
    offered_at: datetime
    accepted_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class ClusteredSOSLocation(BaseModel):
    """Clustered SOS reports by location"""
    cluster_id: str
    center_latitude: float
    center_longitude: float
    num_incidents: int
    severity_average: float
    incident_types: list[str]
    most_recent_incident: datetime
    nearby_resources: int


class AlertBroadcastRequest(BaseModel):
    """Request to broadcast an alert"""
    sos_report_id: int
    alert_type: str  # new_sos, status_update, resource_assigned, resolved
    message: str
    broadcast_scope: str = "immediate"  # immediate, district, state, national
    
    class Config:
        json_schema_extra = {
            "example": {
                "sos_report_id": 1,
                "alert_type": "new_sos",
                "message": "Medical emergency reported near Delhi Mall need immediate assistance",
                "broadcast_scope": "district"
            }
        }


class AlertBroadcastResponse(BaseModel):
    """Response with alert broadcast details"""
    id: int
    sos_report_id: int
    alert_type: str
    message: str
    broadcast_scope: str
    latitude: float
    longitude: float
    broadcaster_type: str
    recipients_reached: int
    broadcast_time: datetime
    
    class Config:
        from_attributes = True


class SOSAnalytics(BaseModel):
    """Analytics for SOS reports"""
    total_active_sos: int
    total_resolved_today: int
    average_response_time_minutes: float
    most_common_emergency_type: str
    urgent_cases: int
    crowd_assistance_available: int
    nearby_resources_count: int
