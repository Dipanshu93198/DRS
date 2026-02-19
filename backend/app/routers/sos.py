"""
SOS Endpoints - Citizen emergency reporting and alert broadcasting
Phase 5: Citizen SOS + Real-Time Alerts
"""

import json
from typing import List, Optional, Set
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import SOSReport, CrowdAssistance
from app.schemas import (
    SOSReportCreate, SOSReportUpdate, SOSReportResponse,
    CrowdAssistanceOffer, CrowdAssistanceResponse,
    ClusteredSOSLocation, AlertBroadcastRequest, AlertBroadcastResponse,
    SOSAnalytics,
)
from app import services
from app.websockets.manager import ConnectionManager

router = APIRouter(prefix="/sos", tags=["sos"])


@router.post("/report", response_model=SOSReportResponse)
def create_sos_report(
    request: SOSReportCreate,
    db: Session = Depends(get_db),
):
    """
    Create a new SOS report (citizen emergency notification)
    
    **Parameters:**
    - `reporter_name`: Person reporting the emergency
    - `reporter_phone`: Contact phone number
    - `reporter_email`: Optional email
    - `latitude`, `longitude`: Emergency location (WGS84)
    - `emergency_type`: Type of emergency (medical, accident, fire, flooding, trapped, missing, other)
    - `description`: Detailed description of the emergency
    - `severity_score`: 0-10 severity rating
    - `num_people_affected`: How many people affected
    - `has_injuries`: Number of injured people
    - `requires_evacuation`: Number of people needing evacuation
    - `is_urgent`: Is this life-threatening
    - `metadata`: Additional context (vulnerable groups, hazards, access info, etc)
    - `crowd_assistance_enabled`: Allow volunteers to help
    
    **Returns:** Created SOS report with ID
    """
    try:
        sos = services.sos.create_sos_report(
            db=db,
            reporter_name=request.reporter_name,
            reporter_phone=request.reporter_phone,
            reporter_email=request.reporter_email,
            latitude=request.latitude,
            longitude=request.longitude,
            emergency_type=str(request.emergency_type),
            description=request.description,
            severity_score=request.severity_score,
            num_people_affected=request.num_people_affected,
            has_injuries=request.has_injuries,
            requires_evacuation=request.requires_evacuation,
            is_urgent=request.is_urgent,
            incident_metadata=request.metadata,
            crowd_assistance_enabled=request.crowd_assistance_enabled,
        )
        
        # Broadcast alert about new SOS
        services.sos.broadcast_alert(
            db=db,
            sos_report_id=sos.id,
            alert_type="new_sos",
            message=f"New {request.emergency_type} emergency reported near ({request.latitude:.4f}, {request.longitude:.4f}). Severity: {request.severity_score:.1f}/10",
            broadcast_scope="immediate" if request.severity_score < 5 else "district",
            broadcaster_type="citizen",
        )
        
        return sos
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/report/{sos_id}", response_model=SOSReportResponse)
def get_sos_report(
    sos_id: int,
    db: Session = Depends(get_db),
):
    """Get a specific SOS report"""
    sos = services.sos.get_sos_report(db, sos_id)
    if not sos:
        raise HTTPException(status_code=404, detail=f"SOS report {sos_id} not found")
    
    return sos


@router.get("/reports/active", response_model=List[SOSReportResponse])
def get_active_sos_reports(
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """Get all active SOS reports (pending, acknowledged, in-progress)"""
    return services.sos.get_all_active_sos(db, limit=limit)


@router.get("/reports/nearby", response_model=List[SOSReportResponse])
def get_nearby_sos_reports(
    latitude: float,
    longitude: float,
    radius_km: float = 5.0,
    status_filter: Optional[str] = None,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    """
    Find SOS reports near a location
    
    **Parameters:**
    - `latitude`, `longitude`: Center point for search
    - `radius_km`: Search radius in kilometers (default: 5 km)
    - `status_filter`: Optional status filter (pending, acknowledged, in_progress, all)
    - `limit`: Maximum results (default: 20)
    """
    nearby = services.sos.find_nearby_sos_reports(
        db, latitude, longitude, radius_km, status_filter, limit
    )
    return [report for report, _ in nearby]


@router.get("/reports/type/{emergency_type}", response_model=List[SOSReportResponse])
def get_sos_by_type(
    emergency_type: str,
    active_only: bool = True,
    db: Session = Depends(get_db),
):
    """Get SOS reports filtered by emergency type"""
    return services.sos.search_sos_by_type(db, emergency_type, active_only)


@router.patch("/report/{sos_id}", response_model=SOSReportResponse)
def update_sos_report(
    sos_id: int,
    request: SOSReportUpdate,
    db: Session = Depends(get_db),
):
    """Update SOS report status or details"""
    sos = services.sos.update_sos_report(
        db, sos_id, status=request.status.value if request.status else None
    )
    if not sos:
        raise HTTPException(status_code=404, detail=f"SOS report {sos_id} not found")
    
    return sos


@router.post("/report/{sos_id}/acknowledge", response_model=SOSReportResponse)
def acknowledge_sos_report(
    sos_id: int,
    db: Session = Depends(get_db),
):
    """
    Emergency personnel acknowledges SOS report
    Sets status to 'acknowledged' with timestamp
    """
    sos = services.sos.acknowledge_sos(db, sos_id)
    if not sos:
        raise HTTPException(status_code=404, detail=f"SOS report {sos_id} not found")
    
    # Broadcast status update
    services.sos.broadcast_alert(
        db=db,
        sos_report_id=sos_id,
        alert_type="status_update",
        message=f"SOS report acknowledged. Emergency response initiated.",
        broadcast_scope="immediate",
        broadcaster_type="emergency_official",
    )
    
    return sos


@router.post("/report/{sos_id}/resolve", response_model=SOSReportResponse)
def resolve_sos_report(
    sos_id: int,
    db: Session = Depends(get_db),
):
    """
    Mark SOS report as resolved
    """
    sos = services.sos.resolve_sos(db, sos_id)
    if not sos:
        raise HTTPException(status_code=404, detail=f"SOS report {sos_id} not found")
    
    # Broadcast resolution
    services.sos.broadcast_alert(
        db=db,
        sos_report_id=sos_id,
        alert_type="resolved",
        message=f"Emergency resolved. Response completed.",
        broadcast_scope="immediate",
        broadcaster_type="emergency_official",
    )
    
    return sos


@router.get("/reports/clustered", response_model=List[ClusteredSOSLocation])
def get_clustered_sos_reports(
    cluster_radius_km: float = 2.0,
    db: Session = Depends(get_db),
):
    """
    Get SOS reports clustered by geographic location
    Useful for map display with aggregated markers
    
    **Parameters:**
    - `cluster_radius_km`: Radius for clustering (default: 2 km)
    
    **Returns:** List of clusters with aggregated statistics
    """
    clusters = services.sos.cluster_sos_reports(db, cluster_radius_km)
    return [
        {
            "cluster_id": c["cluster_id"],
            "center_latitude": c["center_latitude"],
            "center_longitude": c["center_longitude"],
            "num_incidents": c["num_incidents"],
            "severity_average": c["severity_average"],
            "incident_types": c["incident_types"],
            "most_recent_incident": c["most_recent_incident"],
            "nearby_resources": c["nearby_resources"],
        }
        for c in clusters
    ]


@router.post("/assistance/offer", response_model=CrowdAssistanceResponse)
def offer_assistance(
    request: CrowdAssistanceOffer,
    db: Session = Depends(get_db),
):
    """
    Citizen offers to help with SOS report
    
    **Parameters:**
    - `sos_report_id`: Which SOS to help with
    - `helper_name`: Who is offering help
    - `helper_phone`: Contact phone
    - `latitude`, `longitude`: Helper's current location
    - `assistance_type`: Type of help (medical_knowledge, transportation, shelter, supplies, etc)
    - `description`: Details about the help they can provide
    """
    try:
        # Check if SOS exists and allows crowd assistance
        sos = services.sos.get_sos_report(db, request.sos_report_id)
        if not sos:
            raise HTTPException(
                status_code=404,
                detail=f"SOS report {request.sos_report_id} not found"
            )
        
        if not sos.crowd_assistance_enabled:
            raise HTTPException(
                status_code=400,
                detail="Crowd assistance is disabled for this SOS"
            )
        
        assistance = services.sos.offer_crowd_assistance(
            db=db,
            sos_report_id=request.sos_report_id,
            helper_name=request.helper_name,
            helper_phone=request.helper_phone,
            latitude=request.latitude,
            longitude=request.longitude,
            assistance_type=request.assistance_type,
            description=request.description,
        )
        
        return assistance
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/assistance/offers/{sos_id}", response_model=List[CrowdAssistanceResponse])
def get_assistance_offers(
    sos_id: int,
    available_only: bool = True,
    db: Session = Depends(get_db),
):
    """Get all crowd assistance offers for a specific SOS"""
    offers = services.sos.get_crowd_assistance_for_sos(db, sos_id, available_only)
    return offers


@router.post("/assistance/{assistance_id}/accept", response_model=CrowdAssistanceResponse)
def accept_assistance(
    assistance_id: int,
    db: Session = Depends(get_db),
):
    """Accept a crowd assistance offer"""
    assistance = services.sos.accept_crowd_assistance(db, assistance_id)
    if not assistance:
        raise HTTPException(status_code=404, detail=f"Assistance offer {assistance_id} not found")
    
    return assistance


@router.post("/alert/broadcast", response_model=AlertBroadcastResponse)
def broadcast_alert(
    request: AlertBroadcastRequest,
    db: Session = Depends(get_db),
):
    """
    Broadcast an alert about SOS report
    
    **Parameters:**
    - `sos_report_id`: Related SOS report
    - `alert_type`: Type (new_sos, status_update, resource_assigned, resolved)
    - `message`: Alert message to broadcast
    - `broadcast_scope`: Geographic scope (immediate, district, state, national)
    """
    try:
        broadcast = services.sos.broadcast_alert(
            db=db,
            sos_report_id=request.sos_report_id,
            alert_type=request.alert_type,
            message=request.message,
            broadcast_scope=request.broadcast_scope,
            broadcaster_type="emergency_official",
        )
        
        return broadcast
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/analytics", response_model=SOSAnalytics)
def get_sos_analytics(db: Session = Depends(get_db)):
    """
    Get real-time analytics about SOS reports
    
    **Returns:**
    - `total_active_sos`: Number of active emergency reports
    - `total_resolved_today`: Resolved cases in last 24 hours
    - `average_response_time_minutes`: Avg time to acknowledge
    - `most_common_emergency_type`: Most frequent emergency type
    - `urgent_cases`: Life-threatening cases currently active
    - `crowd_assistance_available`: Volunteers available to help
    - `nearby_resources_count`: Emergency resources near active SOS
    """
    return services.sos.get_sos_analytics(db)


@router.get("/nearby-resources/{sos_id}")
def get_resources_for_sos(
    sos_id: int,
    radius_km: float = 10.0,
    db: Session = Depends(get_db),
):
    """
    Get emergency resources near a specific SOS report
    
    **Parameters:**
    - `sos_id`: SOS report ID
    - `radius_km`: Search radius (default: 10 km)
    """
    sos = services.sos.get_sos_report(db, sos_id)
    if not sos:
        raise HTTPException(status_code=404, detail=f"SOS report {sos_id} not found")
    
    resources = services.sos.find_nearby_resources(
        db, sos.latitude, sos.longitude, radius_km
    )
    
    return [
        {
            "id": resource.id,
            "name": resource.name,
            "type": resource.type,
            "distance_km": round(distance, 2),
            "latitude": resource.latitude,
            "longitude": resource.longitude,
            "status": resource.status,
        }
        for resource, distance in resources
    ]


# Health check endpoint
@router.get("/health")
def health_check():
    """Health check for SOS service"""
    return {"status": "ok", "service": "sos"}


# WebSocket endpoint for real-time SOS alerts
from fastapi import WebSocket, WebSocketDisconnect
from app.websockets.manager import ConnectionManager
from typing import Set

# Global SOS alert connection manager
sos_manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_sos_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time SOS alerts
    
    **Connection:**
    Connect to ws://localhost:8000/sos/ws
    
    **Message Types:**
    
    1. Subscribe to SOS alerts in a geographic area:
    ```json
    {
      "type": "subscribe_location",
      "latitude": 28.7041,
      "longitude": 77.1025,
      "radius_km": 5.0
    }
    ```
    
    2. Subscribe to specific SOS report:
    ```json
    {
      "type": "subscribe_sos",
      "sos_id": 1
    }
    ```
    
    3. Unsubscribe:
    ```json
    {
      "type": "unsubscribe",
      "channel": "location:28.7041:77.1025:5.0"
    }
    ```
    
    **Incoming Alert Types:**
    - `new_sos`: New emergency reported
    - `status_update`: SOS status changed
    - `crowd_assistance_offer`: Volunteer offered help
    - `assistance_accepted`: Volunteer accepted and helping
    - `sos_resolved`: Emergency resolved
    """
    await sos_manager.connect(websocket)
    client_subscriptions: Set[str] = set()
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            message_type = message.get("type")
            
            if message_type == "subscribe_location":
                # Subscribe to location-based alerts
                lat = message.get("latitude")
                lon = message.get("longitude")
                radius = message.get("radius_km", 5.0)
                channel = f"location:{lat}:{lon}:{radius}"
                
                await sos_manager.subscribe(websocket, channel)
                client_subscriptions.add(channel)
                
                await websocket.send_json({
                    "type": "subscription_confirmed",
                    "channel": channel,
                    "latitude": lat,
                    "longitude": lon,
                    "radius_km": radius
                })
            
            elif message_type == "subscribe_sos":
                # Subscribe to specific SOS report updates
                sos_id = message.get("sos_id")
                channel = f"sos:{sos_id}"
                
                await sos_manager.subscribe(websocket, channel)
                client_subscriptions.add(channel)
                
                await websocket.send_json({
                    "type": "subscription_confirmed",
                    "channel": channel,
                    "sos_id": sos_id
                })
            
            elif message_type == "unsubscribe":
                # Unsubscribe from channel
                channel = message.get("channel")
                
                await sos_manager.unsubscribe(websocket, channel)
                if channel in client_subscriptions:
                    client_subscriptions.remove(channel)
                
                await websocket.send_json({
                    "type": "unsubscription_confirmed",
                    "channel": channel
                })
            
            elif message_type == "ping":
                # Keep-alive ping
                await websocket.send_json({"type": "pong"})
    
    except WebSocketDisconnect:
        await sos_manager.disconnect(websocket)
    except Exception as e:
        print(f"SOS WebSocket error: {e}")
        await sos_manager.disconnect(websocket)


# Broadcast helper functions for services to use
async def broadcast_sos_alert(
    alert_type: str,
    sos_id: int,
    latitude: float,
    longitude: float,
    radius_km: float = 5.0,
    data: dict = None
):
    """
    Broadcast SOS alert to all subscribed clients
    
    Called from services when SOS status changes or new SOS created
    """
    message = {
        "type": "sos_alert",
        "alert_type": alert_type,
        "sos_id": sos_id,
        "latitude": latitude,
        "longitude": longitude,
        "timestamp": datetime.utcnow().isoformat(),
        **(data or {})
    }
    
    # Broadcast to location-based subscribers
    location_channel = f"location:{latitude}:{longitude}:{radius_km}"
    await sos_manager.broadcast_to_resource(location_channel, message)
    
    # Broadcast to specific SOS subscribers
    sos_channel = f"sos:{sos_id}"
    await sos_manager.broadcast_to_resource(sos_channel, message)
