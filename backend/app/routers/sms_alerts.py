from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_mission_roles
from app.database import get_db
from app.models import AlertSubscriber, SMSAlertLog, User
from app.services.sms_alerts import dispatch_evacuation_sms

router = APIRouter(prefix="/alerts/sms", tags=["sms-alerts"])


class SMSSubscribeRequest(BaseModel):
    phone: str = Field(..., min_length=8, max_length=20)
    name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    consent_sms: bool = True


class SMSUnsubscribeRequest(BaseModel):
    phone: str = Field(..., min_length=8, max_length=20)


class SMSEvacuationRequest(BaseModel):
    incident_title: str = Field(..., min_length=3, max_length=160)
    incident_latitude: float
    incident_longitude: float
    impact_radius_km: float = Field(5.0, ge=0.5, le=500.0)
    max_recipients: int = Field(200, ge=1, le=1000)


@router.post("/subscribe")
def subscribe_sms_alerts(request: SMSSubscribeRequest, db: Session = Depends(get_db)):
    phone = request.phone.strip()
    sub = db.query(AlertSubscriber).filter(AlertSubscriber.phone == phone).first()
    if not sub:
        sub = AlertSubscriber(phone=phone)

    sub.name = request.name
    sub.latitude = request.latitude
    sub.longitude = request.longitude
    sub.consent_sms = 1 if request.consent_sms else 0
    sub.is_active = 1
    sub.updated_at = datetime.utcnow()
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return {
        "id": sub.id,
        "phone": sub.phone,
        "is_active": bool(sub.is_active),
        "consent_sms": bool(sub.consent_sms),
    }


@router.post("/unsubscribe")
def unsubscribe_sms_alerts(request: SMSUnsubscribeRequest, db: Session = Depends(get_db)):
    phone = request.phone.strip()
    sub = db.query(AlertSubscriber).filter(AlertSubscriber.phone == phone).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscriber not found")

    sub.is_active = 0
    sub.updated_at = datetime.utcnow()
    db.add(sub)
    db.commit()
    return {"phone": phone, "is_active": False}


@router.post("/evacuate")
async def send_evacuation_sms(
    request: SMSEvacuationRequest,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
    _mission: str = Depends(require_mission_roles("admin", "field")),
):
    return await dispatch_evacuation_sms(
        db=db,
        incident_title=request.incident_title,
        incident_lat=request.incident_latitude,
        incident_lng=request.incident_longitude,
        impact_radius_km=request.impact_radius_km,
        max_recipients=request.max_recipients,
    )


@router.get("/logs")
def list_sms_logs(
    limit: int = 200,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
    _mission: str = Depends(require_mission_roles("admin", "analyst", "field")),
):
    query = db.query(SMSAlertLog)
    if status:
        query = query.filter(SMSAlertLog.status == status)
    rows = query.order_by(SMSAlertLog.created_at.desc()).limit(max(1, min(limit, 1000))).all()
    return [
        {
            "id": row.id,
            "incident_title": row.incident_title,
            "recipient_phone": row.recipient_phone,
            "status": row.status,
            "provider": row.provider,
            "error": row.error,
            "sent_at": row.sent_at.isoformat() if row.sent_at else None,
            "created_at": row.created_at.isoformat(),
        }
        for row in rows
    ]
