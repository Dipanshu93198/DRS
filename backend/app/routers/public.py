from datetime import datetime
from pathlib import Path
import shutil
import uuid
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

try:
    from app.database import get_db
    from app.models import Disaster, DisasterStatus, CitizenUpdate
except ImportError:
    from database import get_db
    from models import Disaster, DisasterStatus, CitizenUpdate


router = APIRouter(prefix="/public", tags=["public"])
UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads" / "citizen_updates"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def score_to_severity(score: float) -> str:
    if score >= 8.0:
        return "critical"
    if score >= 6.0:
        return "high"
    if score >= 3.5:
        return "moderate"
    return "low"


@router.get("/live-board")
def get_live_board(limit: int = 60, db: Session = Depends(get_db)):
    safe_limit = max(1, min(limit, 200))

    rows = (
        db.query(Disaster)
        .filter(Disaster.latitude.isnot(None), Disaster.longitude.isnot(None))
        .order_by(Disaster.reported_at.desc())
        .limit(safe_limit)
        .all()
    )

    incidents = []
    for disaster in rows:
        dtype = disaster.type.value if hasattr(disaster.type, "value") else str(disaster.type)
        dstatus = disaster.status.value if hasattr(disaster.status, "value") else str(disaster.status)
        incidents.append(
            {
                "id": f"db-{disaster.id}",
                "type": dtype,
                "title": disaster.description or f"{dtype.title()} Incident",
                "lat": float(disaster.latitude),
                "lng": float(disaster.longitude),
                "severity": score_to_severity(float(disaster.severity_score or 0)),
                "status": dstatus,
                "affected_population": int(disaster.estimated_affected_population or 0),
                "timestamp": (disaster.reported_at or datetime.utcnow()).isoformat(),
                "source": disaster.source or "drs",
                "severity_score": float(disaster.severity_score or 0),
                "validated": bool(disaster.is_validated),
            }
        )

    active_count = (
        db.query(Disaster)
        .filter(Disaster.status.in_([DisasterStatus.ACTIVE, DisasterStatus.CONTAINED]))
        .count()
    )
    monitoring_count = (
        db.query(Disaster)
        .filter(Disaster.status.in_([DisasterStatus.REPORTED, DisasterStatus.VALIDATED]))
        .count()
    )
    resolved_count = db.query(Disaster).filter(Disaster.status == DisasterStatus.RESOLVED).count()
    total_affected = sum(item["affected_population"] for item in incidents)

    return {
        "incidents": incidents,
        "stats": {
            "active": active_count,
            "monitoring": monitoring_count,
            "resolved": resolved_count,
            "affected_population": total_affected,
        },
        "last_updated": datetime.utcnow().isoformat(),
    }


@router.post("/citizen-updates")
def create_citizen_update(
    title: str = Form(...),
    description: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    category: str = Form("other"),
    reporter_name: str | None = Form(None),
    reporter_phone: str | None = Form(None),
    image: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    image_url: str | None = None
    if image and image.filename:
        if image.content_type and not image.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Only image uploads are allowed")
        suffix = Path(image.filename).suffix.lower() or ".jpg"
        filename = f"{uuid.uuid4().hex}{suffix}"
        target = UPLOAD_DIR / filename
        with target.open("wb") as out:
            shutil.copyfileobj(image.file, out)
        image_url = f"/uploads/citizen_updates/{filename}"

    item = CitizenUpdate(
        reporter_name=reporter_name,
        reporter_phone=reporter_phone,
        title=title.strip(),
        description=description.strip(),
        category=category.strip().lower() or "other",
        latitude=latitude,
        longitude=longitude,
        image_url=image_url,
    )

    db.add(item)
    db.commit()
    db.refresh(item)

    return {
        "id": item.id,
        "status": item.status,
        "message": "Citizen update submitted successfully",
    }


@router.get("/citizen-updates")
def list_citizen_updates(limit: int = 50, db: Session = Depends(get_db)):
    safe_limit = max(1, min(limit, 200))
    rows = (
        db.query(CitizenUpdate)
        .order_by(CitizenUpdate.created_at.desc())
        .limit(safe_limit)
        .all()
    )
    return [
        {
            "id": row.id,
            "reporter_name": row.reporter_name,
            "reporter_phone": row.reporter_phone,
            "title": row.title,
            "description": row.description,
            "category": row.category,
            "latitude": row.latitude,
            "longitude": row.longitude,
            "image_url": row.image_url,
            "status": row.status,
            "review_note": row.review_note,
            "reviewed_by_user_id": row.reviewed_by_user_id,
            "reviewed_at": row.reviewed_at.isoformat() if row.reviewed_at else None,
            "created_at": row.created_at.isoformat(),
        }
        for row in rows
    ]
