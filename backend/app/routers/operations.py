from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.auth import get_current_user, oauth2_scheme, get_token_payload, require_mission_roles
from app.database import get_db
from app.models import AuditEvent, IncidentAssignment, User, CitizenUpdate
from app.schemas import (
    IncidentAssignmentUpsert,
    IncidentAssignmentResponse,
    AuditEventCreate,
    AuditEventResponse,
)

router = APIRouter(prefix="/operations", tags=["operations"])


class CitizenUpdateReviewRequest(BaseModel):
    status: str  # verified | rejected
    review_note: str | None = None


@router.get("/assignments", response_model=List[IncidentAssignmentResponse])
def list_assignments(
    limit: int = 200,
    db: Session = Depends(get_db),
    _mission: str = Depends(require_mission_roles("admin", "field", "analyst")),
):
    return (
        db.query(IncidentAssignment)
        .order_by(IncidentAssignment.last_updated.desc())
        .limit(limit)
        .all()
    )


@router.put("/assignments/{disaster_key}", response_model=IncidentAssignmentResponse)
def upsert_assignment(
    disaster_key: str,
    request: IncidentAssignmentUpsert,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _mission: str = Depends(require_mission_roles("admin", "field")),
):
    if request.disaster_key != disaster_key:
        raise HTTPException(status_code=400, detail="Payload disaster_key mismatch")

    assignment = (
        db.query(IncidentAssignment)
        .filter(IncidentAssignment.disaster_key == disaster_key)
        .first()
    )

    if not assignment:
        assignment = IncidentAssignment(disaster_key=disaster_key)

    assignment.owner = request.owner
    assignment.status = request.status
    assignment.eta_minutes = request.eta_minutes
    assignment.sla_minutes = request.sla_minutes
    assignment.notes = request.notes
    assignment.updated_by_user_id = current_user.id
    assignment.updated_by_name = current_user.name

    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


@router.get("/audit", response_model=List[AuditEventResponse])
def list_audit_events(
    limit: int = 300,
    severity: Optional[str] = None,
    db: Session = Depends(get_db),
    _mission: str = Depends(require_mission_roles("admin", "analyst", "field")),
):
    query = db.query(AuditEvent)
    if severity:
        query = query.filter(AuditEvent.severity == severity)
    return query.order_by(AuditEvent.created_at.desc()).limit(limit).all()


@router.post("/audit", response_model=AuditEventResponse)
def create_audit_event(
    request: AuditEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    token: str = Depends(oauth2_scheme),
    _mission: str = Depends(require_mission_roles("admin", "analyst", "field")),
):
    payload = get_token_payload(token)
    mission_role = payload.get("mission_role", "analyst")

    event = AuditEvent(
        actor_name=current_user.name,
        actor_user_id=current_user.id,
        mission_role=mission_role,
        action=request.action,
        target=request.target,
        severity=request.severity,
        details=request.details,
        event_metadata=request.event_metadata,
    )

    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.patch("/citizen-updates/{update_id}")
def review_citizen_update(
    update_id: int,
    request: CitizenUpdateReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _mission: str = Depends(require_mission_roles("admin")),
):
    if request.status not in {"verified", "rejected"}:
        raise HTTPException(status_code=400, detail="Invalid status. Use 'verified' or 'rejected'")

    row = db.query(CitizenUpdate).filter(CitizenUpdate.id == update_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Citizen update not found")

    row.status = request.status
    row.review_note = request.review_note
    row.reviewed_by_user_id = current_user.id
    row.reviewed_at = datetime.utcnow()
    db.add(row)
    db.commit()
    db.refresh(row)

    return {
        "id": row.id,
        "status": row.status,
        "review_note": row.review_note,
        "reviewed_by_user_id": row.reviewed_by_user_id,
        "reviewed_at": row.reviewed_at.isoformat() if row.reviewed_at else None,
    }
