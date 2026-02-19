"""
SOS Service - Citizen emergency reporting and alert broadcasting
Phase 5: Citizen SOS + Real-Time Alerts
"""

from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from math import radians, cos, sin, asin, sqrt
from sqlalchemy.orm import Session
from app.models import (
    SOSReport, CrowdAssistance, AlertBroadcast, Resource,
    SOSStatus, ResourceStatus, EmergencyType
)
from app.services.dispatch import haversine_distance


def create_sos_report(
    db: Session,
    reporter_name: str,
    reporter_phone: str,
    latitude: float,
    longitude: float,
    emergency_type: str,
    description: str,
    severity_score: float,
    num_people_affected: int = 1,
    has_injuries: int = 0,
    requires_evacuation: int = 0,
    is_urgent: bool = False,
    metadata: Optional[Dict] = None,
    crowd_assistance_enabled: bool = True,
    reporter_email: Optional[str] = None,
) -> SOSReport:
    """
    Create a new SOS report from citizen
    
    Args:
        db: Database session
        reporter_name: Person's name
        reporter_phone: Contact phone
        latitude: Emergency location latitude
        longitude: Emergency location longitude
        emergency_type: Type of emergency
        description: Detailed description
        severity_score: 0-10 severity rating
        num_people_affected: How many people affected
        has_injuries: Number of injured
        requires_evacuation: Number needing evacuation
        is_urgent: Urgent flag
        metadata: Additional metadata
        crowd_assistance_enabled: Allow crowd help
        reporter_email: Optional email
        
    Returns:
        SOSReport: Created report
    """
    sos_report = SOSReport(
        reporter_name=reporter_name,
        reporter_phone=reporter_phone,
        reporter_email=reporter_email,
        latitude=latitude,
        longitude=longitude,
        emergency_type=emergency_type,
        description=description,
        severity_score=severity_score,
        num_people_affected=num_people_affected,
        has_injuries=has_injuries,
        requires_evacuation=requires_evacuation,
        is_urgent=1 if is_urgent else 0,
        metadata=metadata or {},
        crowd_assistance_enabled=1 if crowd_assistance_enabled else 0,
        status=SOSStatus.PENDING,
    )
    
    # Set PostGIS point
    sos_report.geom = f"POINT({longitude} {latitude})"
    
    db.add(sos_report)
    db.commit()
    db.refresh(sos_report)
    
    return sos_report


def update_sos_report(
    db: Session,
    sos_id: int,
    status: Optional[str] = None,
    describe: Optional[str] = None,
    nearest_resource_id: Optional[int] = None,
) -> Optional[SOSReport]:
    """Update SOS report status and details"""
    sos = db.query(SOSReport).filter(SOSReport.id == sos_id).first()
    if not sos:
        return None
    
    if status:
        sos.status = status
        if status == "acknowledged":
            sos.acknowledged_at = datetime.utcnow()
        elif status == "resolved":
            sos.resolved_at = datetime.utcnow()
    
    if describe:
        sos.description = describe
    
    if nearest_resource_id:
        sos.nearest_resource_id = nearest_resource_id
    
    sos.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(sos)
    
    return sos


def acknowledge_sos(db: Session, sos_id: int) -> Optional[SOSReport]:
    """Acknowledge an SOS report (emergency official action)"""
    return update_sos_report(db, sos_id, status="acknowledged")


def resolve_sos(db: Session, sos_id: int) -> Optional[SOSReport]:
    """Mark SOS as resolved"""
    return update_sos_report(db, sos_id, status="resolved")


def find_nearby_sos_reports(
    db: Session,
    latitude: float,
    longitude: float,
    radius_km: float = 5.0,
    status_filter: Optional[str] = None,
    limit: int = 20,
) -> List[Tuple[SOSReport, float]]:
    """
    Find nearby SOS reports within radius
    
    Returns:
        List of (SOSReport, distance_km) tuples sorted by distance
    """
    # Get all SOS reports with specified status
    query = db.query(SOSReport)
    
    if status_filter and status_filter != "all":
        query = query.filter(SOSReport.status == status_filter)
    else:
        # Exclude resolved/cancelled by default
        query = query.filter(
            SOSReport.status.in_([SOSStatus.PENDING, SOSStatus.ACKNOWLEDGED, SOSStatus.IN_PROGRESS])
        )
    
    reports = query.all()
    
    # Calculate distances
    nearby = []
    for report in reports:
        distance = haversine_distance(
            latitude, longitude,
            report.latitude, report.longitude
        )
        if distance <= radius_km:
            nearby.append((report, distance))
    
    # Sort by distance
    nearby.sort(key=lambda x: x[1])
    
    return nearby[:limit]


def find_nearby_resources(
    db: Session,
    sos_latitude: float,
    sos_longitude: float,
    radius_km: float = 10.0,
    resource_types: Optional[List[str]] = None,
) -> List[Tuple[Resource, float]]:
    """
    Find nearby resources for SOS report
    
    Returns:
        List of (Resource, distance_km) tuples
    """
    query = db.query(Resource).filter(
        Resource.status == ResourceStatus.AVAILABLE
    )
    
    if resource_types:
        query = query.filter(Resource.type.in_(resource_types))
    
    resources = query.all()
    
    nearby = []
    for resource in resources:
        distance = haversine_distance(
            sos_latitude, sos_longitude,
            resource.latitude, resource.longitude
        )
        if distance <= radius_km:
            nearby.append((resource, distance))
    
    nearby.sort(key=lambda x: x[1])
    
    return nearby


def cluster_sos_reports(
    db: Session,
    cluster_radius_km: float = 2.0,
) -> List[Dict]:
    """
    Cluster nearby SOS reports by location
    
    Returns:
        List of cluster dictionaries with aggregated info
    """
    # Get all active SOS reports
    active_reports = db.query(SOSReport).filter(
        SOSReport.status.in_([SOSStatus.PENDING, SOSStatus.ACKNOWLEDGED, SOSStatus.IN_PROGRESS])
    ).all()
    
    clusters = []
    processed = set()
    
    for i, report in enumerate(active_reports):
        if i in processed:
            continue
        
        # Start new cluster
        cluster_reports = [report]
        processed.add(i)
        
        # Find nearby reports
        for j in range(i + 1, len(active_reports)):
            if j in processed:
                continue
            
            distance = haversine_distance(
                report.latitude, report.longitude,
                active_reports[j].latitude, active_reports[j].longitude
            )
            
            if distance <= cluster_radius_km:
                cluster_reports.append(active_reports[j])
                processed.add(j)
        
        # Calculate cluster stats
        if cluster_reports:
            avg_lat = sum(r.latitude for r in cluster_reports) / len(cluster_reports)
            avg_lon = sum(r.longitude for r in cluster_reports) / len(cluster_reports)
            
            emergency_types = [r.emergency_type for r in cluster_reports]
            most_recent = max(r.reported_at for r in cluster_reports)
            
            # Count nearby resources
            nearby_resources = find_nearby_resources(
                db, avg_lat, avg_lon, radius_km=5.0
            )
            
            clusters.append({
                "cluster_id": f"cluster_{len(clusters)}",
                "center_latitude": avg_lat,
                "center_longitude": avg_lon,
                "num_incidents": len(cluster_reports),
                "severity_average": sum(r.severity_score for r in cluster_reports) / len(cluster_reports),
                "incident_types": list(set(emergency_types)),
                "most_recent_incident": most_recent,
                "nearby_resources": len(nearby_resources),
                "incidents": cluster_reports,
            })
    
    return clusters


def offer_crowd_assistance(
    db: Session,
    sos_report_id: int,
    helper_name: str,
    helper_phone: str,
    latitude: float,
    longitude: float,
    assistance_type: str,
    description: str,
) -> CrowdAssistance:
    """
    Record citizen offering assistance
    
    Args:
        db: Database session
        sos_report_id: SOS report being helped
        helper_name: Helper's name
        helper_phone: Helper's phone
        latitude: Helper's location latitude
        longitude: Helper's location longitude
        assistance_type: Type of help (medical, transportation, shelter, supplies, etc)
        description: What help they can provide
        
    Returns:
        CrowdAssistance: Created record
    """
    # Get SOS report to calculate distance
    sos_report = db.query(SOSReport).filter(SOSReport.id == sos_report_id).first()
    if not sos_report:
        raise ValueError(f"SOS report {sos_report_id} not found")
    
    distance = haversine_distance(
        latitude, longitude,
        sos_report.latitude, sos_report.longitude
    )
    
    # Estimate arrival time (assume 40 km/h average speed for civilians)
    estimated_arrival = int(distance / 40 * 60) if distance > 0 else 5
    
    assistance = CrowdAssistance(
        sos_report_id=sos_report_id,
        helper_name=helper_name,
        helper_phone=helper_phone,
        latitude=latitude,
        longitude=longitude,
        geom=f"POINT({longitude} {latitude})",
        assistance_type=assistance_type,
        description=description,
        distance_km=distance,
        estimated_arrival_min=estimated_arrival,
        availability_status="available",
    )
    
    db.add(assistance)
    db.commit()
    db.refresh(assistance)
    
    return assistance


def get_crowd_assistance_for_sos(
    db: Session,
    sos_report_id: int,
    available_only: bool = True,
) -> List[CrowdAssistance]:
    """Get all crowd assistance offers for a specific SOS"""
    query = db.query(CrowdAssistance).filter(
        CrowdAssistance.sos_report_id == sos_report_id
    )
    
    if available_only:
        query = query.filter(CrowdAssistance.availability_status == "available")
    
    # Sort by distance (closest first)
    assistance_offers = query.all()
    assistance_offers.sort(key=lambda x: x.distance_km)
    
    return assistance_offers


def accept_crowd_assistance(
    db: Session,
    assistance_id: int,
) -> Optional[CrowdAssistance]:
    """Accept a crowd assistance offer"""
    assistance = db.query(CrowdAssistance).filter(
        CrowdAssistance.id == assistance_id
    ).first()
    
    if assistance:
        assistance.accepted_at = datetime.utcnow()
        assistance.availability_status = "helping"
        db.commit()
        db.refresh(assistance)
    
    return assistance


def broadcast_alert(
    db: Session,
    sos_report_id: int,
    alert_type: str,  # new_sos, status_update, resource_assigned, resolved
    message: str,
    broadcast_scope: str = "immediate",  # immediate, district, state, national
    broadcaster_type: str = "citizen",
) -> AlertBroadcast:
    """
    Broadcast an alert about SOS report
    
    Args:
        db: Database session
        sos_report_id: Related SOS report
        alert_type: Type of alert
        message: Alert message
        broadcast_scope: Geographic scope
        broadcaster_type: Who is broadcasting
        
    Returns:
        AlertBroadcast: Created broadcast record
    """
    sos_report = db.query(SOSReport).filter(SOSReport.id == sos_report_id).first()
    if not sos_report:
        raise ValueError(f"SOS report {sos_report_id} not found")
    
    # Calculate recipients based on scope and location
    recipients_reached = simulate_broadcasting(
        sos_report.latitude,
        sos_report.longitude,
        broadcast_scope
    )
    
    broadcast = AlertBroadcast(
        sos_report_id=sos_report_id,
        alert_type=alert_type,
        message=message,
        broadcast_scope=broadcast_scope,
        latitude=sos_report.latitude,
        longitude=sos_report.longitude,
        broadcaster_type=broadcaster_type,
        recipients_reached=recipients_reached,
    )
    
    db.add(broadcast)
    db.commit()
    db.refresh(broadcast)
    
    return broadcast


def simulate_broadcasting(
    latitude: float,
    longitude: float,
    scope: str = "immediate"
) -> int:
    """
    Simulate number of people reached by alert
    This is a mock function - real implementation would use actual broadcast systems
    """
    # Mock estimates for different scopes
    scope_multipliers = {
        "immediate": 500,      # 500 people in immediate area
        "district": 50000,     # 50k in district
        "state": 500000,       # 500k in state
        "national": 5000000,   # 5M nationally
    }
    
    base_recipients = scope_multipliers.get(scope, 500)
    # Add some randomness
    import random
    return int(base_recipients * (0.8 + random.random() * 0.4))


def get_sos_analytics(db: Session) -> Dict:
    """
    Get analytics about SOS reports
    
    Returns:
        Dictionary with various metrics
    """
    # Active SOS count
    active_sos = db.query(SOSReport).filter(
        SOSReport.status.in_([SOSStatus.PENDING, SOSStatus.ACKNOWLEDGED, SOSStatus.IN_PROGRESS])
    ).count()
    
    # Resolved today
    today = datetime.utcnow().date()
    resolved_today = db.query(SOSReport).filter(
        SOSReport.status == SOSStatus.RESOLVED,
        SOSReport.resolved_at >= datetime.combine(today, datetime.min.time())
    ).count()
    
    # Average response time
    responded_sos = db.query(SOSReport).filter(
        SOSReport.acknowledged_at.isnot(None)
    ).all()
    
    avg_response_time = 0.0
    if responded_sos:
        response_times = [
            (sos.acknowledged_at - sos.reported_at).total_seconds() / 60
            for sos in responded_sos
        ]
        avg_response_time = sum(response_times) / len(response_times)
    
    # Most common emergency type
    all_sos = db.query(SOSReport).all()
    emergency_types = [sos.emergency_type for sos in all_sos]
    most_common = max(set(emergency_types), key=emergency_types.count) if emergency_types else "unknown"
    
    # Urgent cases
    urgent_count = db.query(SOSReport).filter(
        SOSReport.is_urgent == 1,
        SOSReport.status.in_([SOSStatus.PENDING, SOSStatus.ACKNOWLEDGED, SOSStatus.IN_PROGRESS])
    ).count()
    
    # Crowd assistance available
    available_helpers = db.query(CrowdAssistance).filter(
        CrowdAssistance.availability_status == "available"
    ).count()
    
    # Nearby resources (within 10km of any active SOS)
    active_sos_list = db.query(SOSReport).filter(
        SOSReport.status.in_([SOSStatus.PENDING, SOSStatus.ACKNOWLEDGED, SOSStatus.IN_PROGRESS])
    ).all()
    
    nearby_resources_count = 0
    for sos in active_sos_list:
        nearby = find_nearby_resources(db, sos.latitude, sos.longitude, radius_km=10.0)
        nearby_resources_count += len(nearby)
    
    return {
        "total_active_sos": active_sos,
        "total_resolved_today": resolved_today,
        "average_response_time_minutes": round(avg_response_time, 1),
        "most_common_emergency_type": most_common,
        "urgent_cases": urgent_count,
        "crowd_assistance_available": available_helpers,
        "nearby_resources_count": nearby_resources_count,
    }


def get_sos_report(db: Session, sos_id: int) -> Optional[SOSReport]:
    """Get a specific SOS report"""
    return db.query(SOSReport).filter(SOSReport.id == sos_id).first()


def get_all_active_sos(db: Session, limit: int = 50) -> List[SOSReport]:
    """Get all active SOS reports"""
    return db.query(SOSReport).filter(
        SOSReport.status.in_([SOSStatus.PENDING, SOSStatus.ACKNOWLEDGED, SOSStatus.IN_PROGRESS])
    ).order_by(SOSReport.reported_at.desc()).limit(limit).all()


def search_sos_by_type(
    db: Session,
    emergency_type: str,
    active_only: bool = True,
) -> List[SOSReport]:
    """Search SOS reports by emergency type"""
    query = db.query(SOSReport).filter(SOSReport.emergency_type == emergency_type)
    
    if active_only:
        query = query.filter(
            SOSReport.status.in_([SOSStatus.PENDING, SOSStatus.ACKNOWLEDGED, SOSStatus.IN_PROGRESS])
        )
    
    return query.all()
