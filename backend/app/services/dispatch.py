import math
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from geoalchemy2.functions import ST_DWithin, ST_Distance
from app.models import Resource, ResourceStatus, ResourceType, DispatchRecord
from app.schemas import DispatchRequest, DispatchRecommendation


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two coordinates using Haversine formula
    Returns distance in kilometers
    """
    R = 6371  # Earth's radius in kilometers
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = math.sin(delta_lat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))
    
    return R * c


def estimate_arrival_time(distance_km: float, resource_type: ResourceType) -> timedelta:
    """
    Estimate arrival time based on distance and resource type typical speeds
    """
    # Average speeds in km/h
    speeds = {
        ResourceType.AMBULANCE: 60,
        ResourceType.DRONE: 50,
        ResourceType.RESCUE: 40
    }
    
    speed = speeds.get(resource_type, 50)
    hours = distance_km / speed if speed > 0 else float('inf')
    return timedelta(hours=hours)


def get_nearby_resources(
    db: Session,
    latitude: float,
    longitude: float,
    radius_km: float = 50.0,
    status_filter: ResourceStatus = None
) -> list[dict]:
    """
    Find resources within a given radius
    """
    query = db.query(Resource)
    
    if status_filter:
        query = query.filter(Resource.status == status_filter)
    else:
        query = query.filter(Resource.status == ResourceStatus.AVAILABLE)
    
    nearby = []
    
    for resource in query.all():
        distance = haversine_distance(latitude, longitude, resource.latitude, resource.longitude)
        
        if distance <= radius_km:
            arrival_time = estimate_arrival_time(distance, ResourceType(resource.type))
            nearby.append({
                "resource": resource,
                "distance_km": round(distance, 2),
                "estimated_arrival_minutes": round(arrival_time.total_seconds() / 60, 1)
            })
    
    # Sort by distance
    nearby.sort(key=lambda x: x["distance_km"])
    return nearby


def auto_dispatch(
    db: Session,
    dispatch_request: DispatchRequest
) -> DispatchRecommendation:
    """
    Automatically select the best resource for dispatch based on:
    - Availability
    - Distance
    - Resource type priority
    - Current severity
    """
    
    # Build query
    query = db.query(Resource).filter(
        Resource.status == ResourceStatus.AVAILABLE
    )
    
    # Filter by resource type priority if specified
    if dispatch_request.resource_type_priority:
        priority_types = [rt.value for rt in dispatch_request.resource_type_priority]
        query = query.filter(Resource.type.in_(priority_types))
    
    resources = query.all()
    
    if not resources:
        raise ValueError("No available resources for dispatch")
    
    # Calculate distances and score each resource
    candidates = []
    
    for resource in resources:
        distance = haversine_distance(
            dispatch_request.disaster_lat,
            dispatch_request.disaster_lon,
            resource.latitude,
            resource.longitude
        )
        
        arrival_time = estimate_arrival_time(distance, ResourceType(resource.type))
        
        # Scoring logic: prioritize by distance + type + severity
        type_priority_score = 0
        if dispatch_request.resource_type_priority:
            priority_values = [rt.value for rt in dispatch_request.resource_type_priority]
            if resource.type in priority_values:
                type_priority_score = (len(priority_values) - priority_values.index(resource.type)) * 100
        
        # Main score: lower distance is better (negate distance)
        # Higher priority type is better
        score = type_priority_score - distance
        
        candidates.append({
            "resource": resource,
            "distance": distance,
            "arrival_time": arrival_time,
            "score": score
        })
    
    # Select best candidate
    best = max(candidates, key=lambda x: x["score"])
    
    # Create dispatch record
    dispatch_record = DispatchRecord(
        resource_id=best["resource"].id,
        disaster_lat=dispatch_request.disaster_lat,
        disaster_lon=dispatch_request.disaster_lon,
        disaster_type=dispatch_request.disaster_type,
        severity_score=dispatch_request.severity_score,
        distance_km=best["distance"],
        estimated_arrival=datetime.utcnow() + best["arrival_time"],
        status="dispatched"
    )
    
    db.add(dispatch_record)
    
    # Update resource status to busy
    best["resource"].status = ResourceStatus.BUSY
    db.add(best["resource"])
    db.commit()
    
    return DispatchRecommendation(
        resource_id=best["resource"].id,
        resource_name=best["resource"].name,
        resource_type=ResourceType(best["resource"].type),
        distance_km=round(best["distance"], 2),
        current_location={
            "latitude": best["resource"].latitude,
            "longitude": best["resource"].longitude
        },
        estimated_arrival_minutes=round(best["arrival_time"].total_seconds() / 60, 1),
        reason=f"Best match: {best['distance']:.1f}km away, Type: {best['resource'].type}"
    )


def update_resource_location(
    db: Session,
    resource_id: int,
    latitude: float,
    longitude: float,
    speed: float = 0.0,
    heading: float = 0.0
) -> Resource:
    """Update resource location"""
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    
    if not resource:
        raise ValueError(f"Resource {resource_id} not found")
    
    resource.latitude = latitude
    resource.longitude = longitude
    resource.speed = speed
    resource.heading = heading
    resource.last_updated = datetime.utcnow()
    
    db.add(resource)
    db.commit()
    db.refresh(resource)
    
    return resource
