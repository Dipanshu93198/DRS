from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

try:
    from app.database import get_db
    from app.schemas import OperationalLogResponse
    from app.models import OperationalLog
except ImportError:
    from database import get_db
    from schemas import OperationalLogResponse
    from models import OperationalLog

router = APIRouter(prefix="/logs", tags=["logs"])

@router.get("/", response_model=List[OperationalLogResponse])
def get_operational_logs(
    level: Optional[str] = None,
    category: Optional[str] = None,
    event_type: Optional[str] = None,
    limit: int = 100,
    hours_back: int = 24,
    db: Session = Depends(get_db)
):
    """
    Get operational logs with filtering
    """
    query = db.query(OperationalLog)

    # Time filter
    since = datetime.utcnow() - timedelta(hours=hours_back)
    query = query.filter(OperationalLog.timestamp >= since)

    # Other filters
    if level:
        query = query.filter(OperationalLog.level == level.upper())
    if category:
        query = query.filter(OperationalLog.category == category)
    if event_type:
        query = query.filter(OperationalLog.event_type == event_type)

    # Order by timestamp descending and limit
    logs = query.order_by(OperationalLog.timestamp.desc()).limit(limit).all()

    return logs

@router.get("/summary")
def get_logs_summary(
    hours_back: int = 24,
    db: Session = Depends(get_db)
):
    """
    Get summary statistics of operational logs
    """
    since = datetime.utcnow() - timedelta(hours=hours_back)

    # Count by level
    levels = db.query(
        OperationalLog.level,
        OperationalLog.level.count()
    ).filter(
        OperationalLog.timestamp >= since
    ).group_by(OperationalLog.level).all()

    level_counts = {level: count for level, count in levels}

    # Count by category
    categories = db.query(
        OperationalLog.category,
        OperationalLog.category.count()
    ).filter(
        OperationalLog.timestamp >= since
    ).group_by(OperationalLog.category).all()

    category_counts = {category: count for category, count in categories}

    # Recent critical events
    critical_events = db.query(OperationalLog).filter(
        OperationalLog.timestamp >= since,
        OperationalLog.level == "CRITICAL"
    ).order_by(OperationalLog.timestamp.desc()).limit(5).all()

    return {
        "time_range": f"Last {hours_back} hours",
        "total_events": sum(level_counts.values()),
        "by_level": level_counts,
        "by_category": category_counts,
        "recent_critical": [
            {
                "timestamp": event.timestamp.isoformat(),
                "message": event.message,
                "category": event.category
            }
            for event in critical_events
        ]
    }

@router.get("/timeline")
def get_logs_timeline(
    hours_back: int = 24,
    db: Session = Depends(get_db)
):
    """
    Get logs grouped by hour for timeline visualization
    """
    since = datetime.utcnow() - timedelta(hours=hours_back)

    # Group by hour and count events
    hourly_stats = db.query(
        OperationalLog.timestamp.hour.label('hour'),
        OperationalLog.level,
        OperationalLog.level.count()
    ).filter(
        OperationalLog.timestamp >= since
    ).group_by(
        OperationalLog.timestamp.hour,
        OperationalLog.level
    ).all()

    # Organize by hour
    timeline = {}
    for hour, level, count in hourly_stats:
        if hour not in timeline:
            timeline[hour] = {"INFO": 0, "WARNING": 0, "ERROR": 0, "CRITICAL": 0}
        timeline[hour][level] = count

    return {
        "timeline": timeline,
        "hours_back": hours_back
    }