from typing import Optional, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session

try:
    from app.models import OperationalLog
    from app.database import get_db
except ImportError:
    from models import OperationalLog
    from database import get_db

class OperationalLogger:
    """Service for logging operational events"""

    @staticmethod
    def log_event(
        db: Session,
        level: str,
        category: str,
        event_type: str,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        user_id: Optional[int] = None,
        entity_id: Optional[int] = None,
        entity_type: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        source: str = "system",
        ip_address: Optional[str] = None
    ):
        """Log an operational event"""
        try:
            log_entry = OperationalLog(
                level=level.upper(),
                category=category,
                event_type=event_type,
                message=message,
                details=details,
                user_id=user_id,
                entity_id=entity_id,
                entity_type=entity_type,
                latitude=latitude,
                longitude=longitude,
                source=source,
                ip_address=ip_address
            )

            db.add(log_entry)
            db.commit()

            return log_entry.id
        except Exception as e:
            db.rollback()
            print(f"Failed to log event: {e}")
            return None

    @staticmethod
    def log_disaster_alert(
        db: Session,
        disaster_id: int,
        disaster_type: str,
        severity: float,
        location: str,
        user_id: Optional[int] = None
    ):
        """Log disaster alert events"""
        OperationalLogger.log_event(
            db=db,
            level="WARNING",
            category="disaster",
            event_type="alert_triggered",
            message=f"{disaster_type.title()} alert triggered - Severity: {severity}/10",
            details={"disaster_type": disaster_type, "severity": severity, "location": location},
            user_id=user_id,
            entity_id=disaster_id,
            entity_type="disaster"
        )

    @staticmethod
    def log_resource_dispatch(
        db: Session,
        resource_id: int,
        disaster_id: int,
        dispatch_time: datetime,
        estimated_arrival: datetime,
        user_id: Optional[int] = None
    ):
        """Log resource dispatch events"""
        OperationalLogger.log_event(
            db=db,
            level="INFO",
            category="resource",
            event_type="resource_dispatched",
            message=f"Resource dispatched to disaster site",
            details={
                "dispatch_time": dispatch_time.isoformat(),
                "estimated_arrival": estimated_arrival.isoformat()
            },
            user_id=user_id,
            entity_id=resource_id,
            entity_type="resource"
        )

    @staticmethod
    def log_sos_resolved(
        db: Session,
        sos_id: int,
        resolution_time: datetime,
        response_time_minutes: float,
        user_id: Optional[int] = None
    ):
        """Log SOS resolution events"""
        OperationalLogger.log_event(
            db=db,
            level="INFO",
            category="sos",
            event_type="sos_resolved",
            message=f"SOS report resolved in {response_time_minutes:.1f} minutes",
            details={"resolution_time": resolution_time.isoformat(), "response_time_minutes": response_time_minutes},
            user_id=user_id,
            entity_id=sos_id,
            entity_type="sos"
        )

    @staticmethod
    def log_shelter_update(
        db: Session,
        shelter_id: int,
        old_occupancy: int,
        new_occupancy: int,
        capacity: int,
        user_id: Optional[int] = None
    ):
        """Log shelter capacity updates"""
        level = "WARNING" if new_occupancy >= capacity * 0.9 else "INFO"

        OperationalLogger.log_event(
            db=db,
            level=level,
            category="infrastructure",
            event_type="shelter_capacity_update",
            message=f"Shelter occupancy: {new_occupancy}/{capacity} ({(new_occupancy/capacity*100):.1f}%)",
            details={
                "old_occupancy": old_occupancy,
                "new_occupancy": new_occupancy,
                "capacity": capacity,
                "utilization_percent": round(new_occupancy/capacity*100, 1)
            },
            user_id=user_id,
            entity_id=shelter_id,
            entity_type="shelter"
        )

# Global logger instance
logger = OperationalLogger()