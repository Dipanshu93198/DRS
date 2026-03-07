from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

try:
    from app.database import get_db
    from app.schemas import (
        ShelterCreate, ShelterResponse,
        HospitalCreate, HospitalResponse,
        EvacuationRouteCreate, EvacuationRouteResponse,
        DisasterZoneCreate, DisasterZoneResponse
    )
    from app.models import Shelter, Hospital, EvacuationRoute, DisasterZone
except ImportError:
    from database import get_db
    from schemas import (
        ShelterCreate, ShelterResponse,
        HospitalCreate, HospitalResponse,
        EvacuationRouteCreate, EvacuationRouteResponse,
        DisasterZoneCreate, DisasterZoneResponse
    )
    from models import Shelter, Hospital, EvacuationRoute, DisasterZone

router = APIRouter(prefix="/infrastructure", tags=["infrastructure"])

# Shelter endpoints
@router.post("/shelters", response_model=ShelterResponse)
def create_shelter(
    request: ShelterCreate,
    db: Session = Depends(get_db)
):
    """Create a new emergency shelter"""
    try:
        shelter = Shelter(
            name=request.name,
            address=request.address,
            latitude=request.latitude,
            longitude=request.longitude,
            max_capacity=request.max_capacity,
            available_capacity=request.max_capacity,  # Initially available = max
            shelter_type=request.shelter_type,
            facilities=request.facilities,
            contact_phone=request.contact_phone,
            contact_email=request.contact_email
        )

        db.add(shelter)
        db.commit()
        db.refresh(shelter)
        return shelter
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Creation error: {str(e)}")

@router.get("/shelters", response_model=List[ShelterResponse])
def list_shelters(
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """List all shelters"""
    query = db.query(Shelter)
    if active_only:
        query = query.filter(Shelter.is_active == 1)
    return query.all()

@router.get("/shelters/{shelter_id}", response_model=ShelterResponse)
def get_shelter(
    shelter_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific shelter"""
    shelter = db.query(Shelter).filter(Shelter.id == shelter_id).first()
    if not shelter:
        raise HTTPException(status_code=404, detail="Shelter not found")
    return shelter

@router.put("/shelters/{shelter_id}/occupancy")
def update_shelter_occupancy(
    shelter_id: int,
    current_occupancy: int,
    db: Session = Depends(get_db)
):
    """Update shelter occupancy"""
    shelter = db.query(Shelter).filter(Shelter.id == shelter_id).first()
    if not shelter:
        raise HTTPException(status_code=404, detail="Shelter not found")

    if current_occupancy > shelter.max_capacity:
        raise HTTPException(status_code=400, detail="Occupancy cannot exceed capacity")

    shelter.current_occupancy = current_occupancy
    shelter.available_capacity = shelter.max_capacity - current_occupancy
    shelter.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(shelter)
    return shelter

# Hospital endpoints
@router.post("/hospitals", response_model=HospitalResponse)
def create_hospital(
    request: HospitalCreate,
    db: Session = Depends(get_db)
):
    """Create a new hospital"""
    try:
        hospital = Hospital(
            name=request.name,
            address=request.address,
            latitude=request.latitude,
            longitude=request.longitude,
            bed_capacity=request.bed_capacity,
            available_beds=request.bed_capacity,  # Initially available = capacity
            hospital_type=request.hospital_type,
            emergency_services=request.emergency_services,
            specialties=request.specialties,
            contact_phone=request.contact_phone,
            contact_email=request.contact_email
        )

        db.add(hospital)
        db.commit()
        db.refresh(hospital)
        return hospital
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Creation error: {str(e)}")

@router.get("/hospitals", response_model=List[HospitalResponse])
def list_hospitals(
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """List all hospitals"""
    query = db.query(Hospital)
    if active_only:
        query = query.filter(Hospital.is_active == 1)
    return query.all()

# Evacuation routes endpoints
@router.post("/routes", response_model=EvacuationRouteResponse)
def create_evacuation_route(
    request: EvacuationRouteCreate,
    db: Session = Depends(get_db)
):
    """Create a new evacuation route"""
    try:
        route = EvacuationRoute(
            name=request.name,
            description=request.description,
            route_type=request.route_type,
            priority_level=request.priority_level,
            estimated_duration_minutes=request.estimated_duration_minutes,
            max_capacity_per_hour=request.max_capacity_per_hour,
            start_point_lat=request.start_point_lat,
            start_point_lon=request.start_point_lon,
            end_point_lat=request.end_point_lat,
            end_point_lon=request.end_point_lon
        )

        db.add(route)
        db.commit()
        db.refresh(route)
        return route
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Creation error: {str(e)}")

@router.get("/routes", response_model=List[EvacuationRouteResponse])
def list_evacuation_routes(
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """List all evacuation routes"""
    query = db.query(EvacuationRoute)
    if active_only:
        query = query.filter(EvacuationRoute.is_active == 1)
    return query.all()

# Disaster zones endpoints
@router.post("/zones", response_model=DisasterZoneResponse)
def create_disaster_zone(
    request: DisasterZoneCreate,
    db: Session = Depends(get_db)
):
    """Create a new disaster zone"""
    try:
        zone = DisasterZone(
            name=request.name,
            zone_type=request.zone_type,
            risk_level=request.risk_level,
            population_density=request.population_density,
            vulnerability_score=request.vulnerability_score,
            area_sq_km=request.area_sq_km,
            estimated_population=request.estimated_population,
            infrastructure_risk=request.infrastructure_risk,
            evacuation_priority=request.evacuation_priority,
            nearest_shelters=request.nearest_shelters,
            emergency_contacts=request.emergency_contacts
        )

        db.add(zone)
        db.commit()
        db.refresh(zone)
        return zone
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Creation error: {str(e)}")

@router.get("/zones", response_model=List[DisasterZoneResponse])
def list_disaster_zones(
    db: Session = Depends(get_db)
):
    """List all disaster zones"""
    return db.query(DisasterZone).all()