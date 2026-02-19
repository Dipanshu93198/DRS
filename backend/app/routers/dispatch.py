from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import DispatchRequest, DispatchRecommendation
from app.models import DispatchRecord, Resource, ResourceStatus
from app.services.dispatch import auto_dispatch
from typing import List

router = APIRouter(prefix="/dispatch", tags=["dispatch"])


@router.post("/auto", response_model=DispatchRecommendation)
def auto_dispatch_resource(
    request: DispatchRequest,
    db: Session = Depends(get_db)
):
    """
    Automatically dispatch the best available resource to a disaster location
    """
    try:
        recommendation = auto_dispatch(db, request)
        return recommendation
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dispatch error: {str(e)}")


@router.get("/active")
def get_active_dispatch_records(
    db: Session = Depends(get_db)
):
    """Get all active dispatch records"""
    records = db.query(DispatchRecord).filter(
        DispatchRecord.status.in_(["dispatched", "en-route"])
    ).all()
    
    result = []
    for record in records:
        resource = db.query(Resource).filter(Resource.id == record.resource_id).first()
        if resource:
            result.append({
                "dispatch_id": record.id,
                "resource_id": resource.id,
                "resource_name": resource.name,
                "resource_type": resource.type,
                "current_location": {
                    "latitude": resource.latitude,
                    "longitude": resource.longitude
                },
                "disaster_location": {
                    "latitude": record.disaster_lat,
                    "longitude": record.disaster_lon
                },
                "disaster_type": record.disaster_type,
                "severity_score": record.severity_score,
                "distance_km": record.distance_km,
                "dispatch_time": record.dispatch_time,
                "estimated_arrival": record.estimated_arrival,
                "status": record.status
            })
    
    return result


@router.get("/{dispatch_id}")
def get_dispatch_record(
    dispatch_id: int,
    db: Session = Depends(get_db)
):
    """Get specific dispatch record"""
    record = db.query(DispatchRecord).filter(DispatchRecord.id == dispatch_id).first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Dispatch record not found")
    
    resource = db.query(Resource).filter(Resource.id == record.resource_id).first()
    
    return {
        "id": record.id,
        "resource_id": resource.id if resource else None,
        "resource_name": resource.name if resource else "Unknown",
        "disaster_lat": record.disaster_lat,
        "disaster_lon": record.disaster_lon,
        "disaster_type": record.disaster_type,
        "severity_score": record.severity_score,
        "distance_km": record.distance_km,
        "dispatch_time": record.dispatch_time,
        "estimated_arrival": record.estimated_arrival,
        "actual_arrival": record.actual_arrival,
        "status": record.status
    }


@router.put("/{dispatch_id}/status")
def update_dispatch_status(
    dispatch_id: int,
    new_status: str,
    db: Session = Depends(get_db)
):
    """Update dispatch status"""
    record = db.query(DispatchRecord).filter(DispatchRecord.id == dispatch_id).first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Dispatch record not found")
    
    old_status = record.status
    record.status = new_status
    
    if new_status == "completed" and record.actual_arrival is None:
        from datetime import datetime
        record.actual_arrival = datetime.utcnow()
        
        # Mark resource as available again
        resource = db.query(Resource).filter(Resource.id == record.resource_id).first()
        if resource:
            resource.status = ResourceStatus.AVAILABLE
            db.add(resource)
    
    db.add(record)
    db.commit()
    db.refresh(record)
    
    return {
        "dispatch_id": record.id,
        "old_status": old_status,
        "new_status": record.status,
        "updated_at": record.actual_arrival or record.dispatch_time
    }
