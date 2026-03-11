from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import List, Tuple

import httpx
from sqlalchemy.orm import Session

from app.config import settings
from app.models import AlertSubscriber, Shelter, SMSAlertLog, SOSReport
from app.services.dispatch import haversine_distance


@dataclass
class SMSResult:
    success: bool
    provider_message_id: str | None = None
    error: str | None = None


async def send_sms(phone: str, message: str) -> SMSResult:
    provider = (settings.sms_provider or "mock").strip().lower()
    if provider == "twilio":
        if not (settings.twilio_account_sid and settings.twilio_auth_token and settings.twilio_from_number):
            return SMSResult(success=False, error="Twilio configuration missing")
        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                response = await client.post(
                    f"https://api.twilio.com/2010-04-01/Accounts/{settings.twilio_account_sid}/Messages.json",
                    auth=(settings.twilio_account_sid, settings.twilio_auth_token),
                    data={
                        "To": phone,
                        "From": settings.twilio_from_number,
                        "Body": message,
                    },
                )
            data = response.json() if response.content else {}
            if 200 <= response.status_code < 300:
                return SMSResult(success=True, provider_message_id=data.get("sid"))
            return SMSResult(success=False, error=data.get("message") or response.text[:180])
        except Exception as exc:
            return SMSResult(success=False, error=str(exc))

    # Default mock provider: simulate success for local development.
    return SMSResult(success=True, provider_message_id=f"mock-{int(datetime.utcnow().timestamp())}")


def pick_safe_shelters(
    db: Session,
    recipient_lat: float,
    recipient_lng: float,
    incident_lat: float,
    incident_lng: float,
    impact_radius_km: float,
    limit: int = 2,
) -> List[Tuple[Shelter, float]]:
    shelters = (
        db.query(Shelter)
        .filter(Shelter.is_active == 1, Shelter.available_capacity > 0)
        .all()
    )

    ranked: List[Tuple[Shelter, float]] = []
    for shelter in shelters:
        impact_dist = haversine_distance(incident_lat, incident_lng, shelter.latitude, shelter.longitude)
        if impact_dist <= impact_radius_km:
            continue
        dist_to_user = haversine_distance(recipient_lat, recipient_lng, shelter.latitude, shelter.longitude)
        ranked.append((shelter, dist_to_user))

    ranked.sort(key=lambda x: x[1])
    return ranked[:limit]


def get_target_recipients(
    db: Session,
    incident_lat: float,
    incident_lng: float,
    radius_km: float,
) -> List[Tuple[str, float, float]]:
    recipients: List[Tuple[str, float, float]] = []
    seen = set()

    subs = (
        db.query(AlertSubscriber)
        .filter(AlertSubscriber.is_active == 1, AlertSubscriber.consent_sms == 1)
        .all()
    )
    for sub in subs:
        if sub.latitude is None or sub.longitude is None:
            continue
        d = haversine_distance(incident_lat, incident_lng, sub.latitude, sub.longitude)
        if d <= radius_km and sub.phone not in seen:
            seen.add(sub.phone)
            recipients.append((sub.phone, float(sub.latitude), float(sub.longitude)))

    # Add SOS reporters as emergency fallback recipients if phone exists and coordinates are nearby.
    reports = db.query(SOSReport).filter(SOSReport.reporter_phone.isnot(None)).order_by(SOSReport.reported_at.desc()).limit(200).all()
    for report in reports:
        if report.latitude is None or report.longitude is None:
            continue
        d = haversine_distance(incident_lat, incident_lng, report.latitude, report.longitude)
        phone = (report.reporter_phone or "").strip()
        if d <= radius_km and phone and phone not in seen:
            seen.add(phone)
            recipients.append((phone, float(report.latitude), float(report.longitude)))

    return recipients


def build_evacuation_message(
    incident_title: str,
    incident_lat: float,
    incident_lng: float,
    impact_radius_km: float,
    shelters: List[Tuple[Shelter, float]],
) -> str:
    base = (
        f"ALERT: {incident_title}. Risk zone ~{impact_radius_km:.0f}km around "
        f"{incident_lat:.4f},{incident_lng:.4f}. Evacuate now."
    )
    if not shelters:
        return f"{base} Move to nearest official shelter and await instructions."

    options = []
    for shelter, dist in shelters:
        options.append(f"{shelter.name} ({dist:.1f}km)")
    return f"{base} Safe shelters: " + "; ".join(options[:2])


async def dispatch_evacuation_sms(
    db: Session,
    incident_title: str,
    incident_lat: float,
    incident_lng: float,
    impact_radius_km: float,
    max_recipients: int = 200,
) -> dict:
    recipients = get_target_recipients(db, incident_lat, incident_lng, impact_radius_km)[: max(1, min(max_recipients, 1000))]
    sent = 0
    failed = 0
    rows = []

    for phone, rlat, rlng in recipients:
        safe = pick_safe_shelters(db, rlat, rlng, incident_lat, incident_lng, impact_radius_km, limit=2)
        text = build_evacuation_message(incident_title, incident_lat, incident_lng, impact_radius_km, safe)
        result = await send_sms(phone, text)

        log = SMSAlertLog(
            incident_title=incident_title,
            incident_latitude=incident_lat,
            incident_longitude=incident_lng,
            impact_radius_km=impact_radius_km,
            recipient_phone=phone,
            message=text,
            status="sent" if result.success else "failed",
            provider=(settings.sms_provider or "mock").lower(),
            provider_message_id=result.provider_message_id,
            error=result.error,
            sent_at=datetime.utcnow() if result.success else None,
        )
        db.add(log)
        rows.append(log)
        if result.success:
            sent += 1
        else:
            failed += 1

    db.commit()
    return {
        "incident_title": incident_title,
        "total_targeted": len(recipients),
        "sent": sent,
        "failed": failed,
        "provider": (settings.sms_provider or "mock").lower(),
        "timestamp": datetime.utcnow().isoformat(),
    }
