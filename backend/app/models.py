from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, JSON
import enum

try:
    from app.database import Base
    from app.config import settings
except ImportError:
    from database import Base
    from config import settings

# Only import Geometry if using PostgreSQL
USE_GEOMETRY = "sqlite" not in settings.SQLALCHEMY_DATABASE_URL

if "postgresql" in settings.SQLALCHEMY_DATABASE_URL:
    from geoalchemy2 import Geometry
    HAS_GEOMETRY = True
else:
    HAS_GEOMETRY = False
    Geometry = None

# Use JSON for SQLite, JSONB for PostgreSQL
JSONColumnType = JSON if "sqlite" in settings.SQLALCHEMY_DATABASE_URL else JSON


class ResourceType(str, enum.Enum):
    """Resource types"""
    AMBULANCE = "ambulance"
    DRONE = "drone"
    RESCUE = "rescue"


class ResourceStatus(str, enum.Enum):
    """Resource availability status"""
    AVAILABLE = "available"
    BUSY = "busy"
    OFFLINE = "offline"


class Resource(Base):
    """Resource model for ambulances, drones, rescue teams"""
    
    __tablename__ = "resources"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    type = Column(Enum(ResourceType), index=True)
    status = Column(Enum(ResourceStatus), default=ResourceStatus.AVAILABLE, index=True)
    latitude = Column(Float)
    longitude = Column(Float)
    speed = Column(Float, default=0.0)  # Current speed in km/h
    heading = Column(Float, default=0.0)  # Direction in degrees
    # Geometry column only for PostgreSQL  
    geom = Column(Geometry("POINT", srid=4326), index=True) if HAS_GEOMETRY else None
    resource_metadata = Column(JSONColumnType, nullable=True)  # Store custom metadata like capacity, specialization
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    class Config:
        from_attributes = True


class DispatchRecord(Base):
    """Record of dispatch operations"""
    
    __tablename__ = "dispatch_records"
    
    id = Column(Integer, primary_key=True, index=True)
    resource_id = Column(Integer, index=True)
    disaster_lat = Column(Float)
    disaster_lon = Column(Float)
    disaster_type = Column(String)
    severity_score = Column(Float)
    distance_km = Column(Float)  # Distance from resource to disaster location
    dispatch_time = Column(DateTime, default=datetime.utcnow)
    estimated_arrival = Column(DateTime)
    actual_arrival = Column(DateTime, nullable=True)
    status = Column(String, default="dispatched")  # dispatched, arrived, completed, cancelled
    created_at = Column(DateTime, default=datetime.utcnow)
    
    class Config:
        from_attributes = True


class DisasterType(str, enum.Enum):
    """Types of disasters"""
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


class DisasterStatus(str, enum.Enum):
    """Status of a disaster"""
    REPORTED = "reported"
    VALIDATED = "validated"
    ACTIVE = "active"
    CONTAINED = "contained"
    RESOLVED = "resolved"
    CANCELLED = "cancelled"


class Disaster(Base):
    """Disaster event tracking"""
    
    __tablename__ = "disasters"
    
    id = Column(Integer, primary_key=True, index=True)
    type = Column(Enum(DisasterType), index=True)
    status = Column(Enum(DisasterStatus), default=DisasterStatus.REPORTED, index=True)
    latitude = Column(Float, index=True)
    longitude = Column(Float, index=True)
    geom = Column(Geometry("POINT", srid=4326), index=True) if HAS_GEOMETRY else None
    severity_score = Column(Float, default=0.0)  # 0-10 scale
    is_validated = Column(Integer, default=0)  # 1=validated, 0=not validated
    validation_score = Column(Float, nullable=True)  # Confidence score 0-100
    validation_details = Column(JSONColumnType, nullable=True)  # Validation metadata
    affected_area_radius_km = Column(Float, nullable=True)
    estimated_affected_population = Column(Integer, nullable=True)
    num_casualties = Column(Integer, default=0)
    description = Column(String)
    source = Column(String)  # Source of report (USGS, citizen, official, etc)
    metadata = Column(JSONColumnType, nullable=True)  # Additional info
    reported_at = Column(DateTime, default=datetime.utcnow, index=True)
    validated_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    class Config:
        from_attributes = True


class SOSStatus(str, enum.Enum):
    """SOS report status"""
    PENDING = "pending"
    ACKNOWLEDGED = "acknowledged"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CANCELLED = "cancelled"


class EmergencyType(str, enum.Enum):
    """Type of emergency reported"""
    MEDICAL = "medical"
    ACCIDENT = "accident"
    FIRE = "fire"
    FLOODING = "flooding"
    TRAPPED = "trapped"
    MISSING = "missing"
    OTHER = "other"


class SOSReport(Base):
    """Direct SOS reports from citizens"""
    
    __tablename__ = "sos_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    reporter_name = Column(String)
    reporter_phone = Column(String)
    reporter_email = Column(String, nullable=True)
    latitude = Column(Float, index=True)
    longitude = Column(Float, index=True)
    geom = Column(Geometry("POINT", srid=4326), index=True) if HAS_GEOMETRY else None
    emergency_type = Column(Enum(EmergencyType), index=True)
    description = Column(String)  # User's description of emergency
    severity_score = Column(Float)  # 0-10 rating
    status = Column(Enum(SOSStatus), default=SOSStatus.PENDING, index=True)
    num_people_affected = Column(Integer, nullable=True)
    has_injuries = Column(Integer, default=0)  # Number of injured people
    requires_evacuation = Column(Integer, default=0)  # Number needing evacuation
    is_urgent = Column(Integer, default=0)  # Boolean flag (1=urgent, 0=not urgent)
    incident_metadata = Column(JSONColumnType, nullable=True)  # Additional info (vulnerable groups, hazards, etc)
    nearest_resource_id = Column(Integer, nullable=True)  # Assigned resource
    crowd_assistance_enabled = Column(Integer, default=1)  # Allow crowd help
    reported_at = Column(DateTime, default=datetime.utcnow, index=True)
    acknowledged_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    class Config:
        from_attributes = True


class CrowdAssistance(Base):
    """Citizens offering assistance for nearby SOS reports"""
    
    __tablename__ = "crowd_assistance"
    
    id = Column(Integer, primary_key=True, index=True)
    sos_report_id = Column(Integer, index=True)  # FK to SOSReport
    helper_name = Column(String)
    helper_phone = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    geom = Column(Geometry("POINT", srid=4326), index=True) if HAS_GEOMETRY else None
    assistance_type = Column(String)  # e.g., "medical_knowledge", "transportation", "shelter", "supplies"
    description = Column(String)  # What help they can provide
    availability_status = Column(String, default="available")  # available, helping, unavailable
    distance_km = Column(Float)  # Distance from helper to SOS location
    estimated_arrival_min = Column(Integer, nullable=True)  # ETA in minutes
    is_verified = Column(Integer, default=0)  # Verified volunteer
    rating = Column(Float, nullable=True)  # Community rating
    offered_at = Column(DateTime, default=datetime.utcnow)
    accepted_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    class Config:
        from_attributes = True


class AlertBroadcast(Base):
    """Alert broadcast history for real-time updates"""
    
    __tablename__ = "alert_broadcasts"
    
    id = Column(Integer, primary_key=True, index=True)
    sos_report_id = Column(Integer, index=True)
    alert_type = Column(String)  # "new_sos", "status_update", "resource_assigned", "resolved"
    message = Column(String)
    broadcast_scope = Column(String)  # "immediate", "district", "state", "national"
    latitude = Column(Float)
    longitude = Column(Float)
    broadcaster_type = Column(String)  # "citizen", "emergency_official", "ai_system"
    recipients_reached = Column(Integer, default=0)
    broadcast_time = Column(DateTime, default=datetime.utcnow, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    class Config:
        from_attributes = True
