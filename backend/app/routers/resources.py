from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.database import get_db
from app.schemas import (
    ResourceCreate, ResourceUpdate, ResourceResponse, 
    LocationUpdateRequest, NearbyResource, DispatchRequest,
    DispatchRecommendation, StatusFilter
)
from app.models import Resource, ResourceStatus
from app.services.dispatch import (
    get_nearby_resources, auto_dispatch, update_resource_location,
    haversine_distance, estimate_arrival_time
)

router = APIRouter(prefix="/resources", tags=["resources"])


@router.post("/", response_model=ResourceResponse)
def create_resource(
    resource: ResourceCreate,
    db: Session = Depends(get_db)
):
    """Create a new resource"""
    db_resource = Resource(
        name=resource.name,
        type=resource.type,
        latitude=resource.latitude,
        longitude=resource.longitude,
        status=resource.status,
        resource_metadata=resource.resource_metadata
    )
    db.add(db_resource)
    db.commit()
    db.refresh(db_resource)
    return db_resource


@router.get("/{resource_id}", response_model=ResourceResponse)
def get_resource(
    resource_id: int,
    db: Session = Depends(get_db)
):
    """Get resource by ID"""
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    return resource


@router.get("/", response_model=list[ResourceResponse])
def list_resources(
    status: StatusFilter = Query(StatusFilter.ALL),
    resource_type: str = Query(None),
    db: Session = Depends(get_db)
):
    """List all resources with optional filtering"""
    query = db.query(Resource)
    
    if status != StatusFilter.ALL:
        query = query.filter(Resource.status == status.value)
    
    if resource_type:
        query = query.filter(Resource.type == resource_type)
    
    return query.all()


@router.put("/{resource_id}", response_model=ResourceResponse)
def update_resource(
    resource_id: int,
    resource_update: ResourceUpdate,
    db: Session = Depends(get_db)
):
    """Update resource details"""
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    update_data = resource_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(resource, field, value)
    
    resource.last_updated = datetime.utcnow()
    db.add(resource)
    db.commit()
    db.refresh(resource)
    return resource


@router.post("/update-location")
def update_location(
    request: LocationUpdateRequest,
    db: Session = Depends(get_db)
):
    """Update resource GPS location"""
    try:
        resource = update_resource_location(
            db,
            request.resource_id,
            request.latitude,
            request.longitude,
            request.speed,
            request.heading
        )
        return {
            "status": "success",
            "resource_id": resource.id,
            "updated_at": resource.last_updated
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/nearby")
def get_nearby(
    latitude: float = Query(...),
    longitude: float = Query(...),
    radius_km: float = Query(50.0),
    status: StatusFilter = Query(StatusFilter.AVAILABLE),
    db: Session = Depends(get_db)
):
    """Get nearby resources within a radius"""
    try:
        status_filter = None if status == StatusFilter.ALL else ResourceStatus(status.value)
        nearby = get_nearby_resources(
            db,
            latitude,
            longitude,
            radius_km,
            status_filter
        )
        
        result = []
        for item in nearby:
            result.append({
                "id": item["resource"].id,
                "name": item["resource"].name,
                "type": item["resource"].type,
                "status": item["resource"].status,
                "latitude": item["resource"].latitude,
                "longitude": item["resource"].longitude,
                "distance_km": item["distance_km"],
                "estimated_arrival_minutes": item["estimated_arrival_minutes"]
            })
        
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
