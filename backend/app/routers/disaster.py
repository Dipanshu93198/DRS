from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List

try:
    from app.database import get_db
    from app.schemas import (
        DisasterValidationRequest,
        DisasterValidationResponse,
        DisasterCreate,
        DisasterResponse,
    )
    from app.models import Disaster, DisasterStatus
    from app.services.disaster_validator import validate_disaster
except ImportError:
    from database import get_db
    from schemas import (
        DisasterValidationRequest,
        DisasterValidationResponse,
        DisasterCreate,
        DisasterResponse,
    )
    from models import Disaster, DisasterStatus
    from services.disaster_validator import validate_disaster

router = APIRouter(prefix="/disasters", tags=["disasters"])


@router.post("/validate", response_model=DisasterValidationResponse)
def validate_disaster_report(
    request: DisasterValidationRequest,
    db: Session = Depends(get_db)
):
    """
    Validate a disaster report and assess its credibility.
    Returns validation score (0-100) and recommended actions.
    """
    try:
        validation_result = validate_disaster(request)
        return validation_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation error: {str(e)}")


@router.post("/create", response_model=DisasterResponse)
def create_disaster(
    request: DisasterCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new disaster record in the system.
    If is_validated is True, the disaster is marked as validated.
    """
    try:
        disaster = Disaster(
            type=request.type,
            latitude=request.latitude,
            longitude=request.longitude,
            severity_score=request.severity_score,
            affected_area_radius_km=request.affected_area_radius_km,
            estimated_affected_population=request.estimated_affected_population,
            num_casualties=request.num_casualties,
            description=request.description,
            source=request.source,
            metadata=request.metadata,
            is_validated=1 if request.is_validated else 0,
            validation_score=request.validation_score,
            status=DisasterStatus.VALIDATED if request.is_validated else DisasterStatus.REPORTED,
            validated_at=datetime.utcnow() if request.is_validated else None,
        )
        
        db.add(disaster)
        db.commit()
        db.refresh(disaster)
        
        return disaster
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Creation error: {str(e)}")


@router.get("/{disaster_id}", response_model=DisasterResponse)
def get_disaster(
    disaster_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific disaster by ID.
    """
    disaster = db.query(Disaster).filter(Disaster.id == disaster_id).first()
    if not disaster:
        raise HTTPException(status_code=404, detail="Disaster not found")
    
    return disaster


@router.get("/", response_model=List[DisasterResponse])
def list_disasters(
    status: str = None,
    validated_only: bool = False,
    db: Session = Depends(get_db)
):
    """
    List all disasters with optional filtering by status or validation state.
    """
    query = db.query(Disaster)
    
    if status:
        query = query.filter(Disaster.status == status)
    
    if validated_only:
        query = query.filter(Disaster.is_validated == 1)
    
    disasters = query.all()
    return disasters


@router.put("/{disaster_id}/status", response_model=DisasterResponse)
def update_disaster_status(
    disaster_id: int,
    new_status: str,
    db: Session = Depends(get_db)
):
    """
    Update the status of a disaster (e.g., from REPORTED to ACTIVE, or ACTIVE to RESOLVED).
    """
    disaster = db.query(Disaster).filter(Disaster.id == disaster_id).first()
    if not disaster:
        raise HTTPException(status_code=404, detail="Disaster not found")
    
    try:
        disaster.status = DisasterStatus(new_status)
        
        if new_status == "resolved":
            disaster.resolved_at = datetime.utcnow()
        
        disaster.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(disaster)
        
        return disaster
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {new_status}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Update error: {str(e)}")


@router.get("/stats/summary")
def get_disaster_statistics(
    db: Session = Depends(get_db)
):
    """
    Get summary statistics about disasters.
    """
    total = db.query(Disaster).count()
    validated = db.query(Disaster).filter(Disaster.is_validated == 1).count()
    active = db.query(Disaster).filter(Disaster.status == DisasterStatus.ACTIVE).count()
    by_type = db.query(Disaster.type).all()
    
    type_counts = {}
    for disaster_type in by_type:
        type_counts[disaster_type[0].value] = type_counts.get(disaster_type[0].value, 0) + 1
    
    return {
        "total_disasters": total,
        "validated_disasters": validated,
        "active_disasters": active,
        "validation_rate": round((validated / total * 100) if total > 0 else 0, 2),
        "by_type": type_counts
    }
