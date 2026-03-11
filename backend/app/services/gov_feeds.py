from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Any, Dict, List, Tuple

import httpx

from app.config import settings


def _severity_from_score(score: float) -> str:
    if score >= 8.0:
        return "critical"
    if score >= 6.0:
        return "high"
    if score >= 3.5:
        return "moderate"
    return "low"


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except Exception:
        return default


US_STATE_CENTROIDS: Dict[str, Tuple[float, float]] = {
    "AL": (32.8067, -86.7911),
    "AK": (64.2008, -149.4937),
    "AZ": (34.0489, -111.0937),
    "AR": (34.9697, -92.3731),
    "CA": (36.7783, -119.4179),
    "CO": (39.5501, -105.7821),
    "CT": (41.6032, -73.0877),
    "DE": (38.9108, -75.5277),
    "FL": (27.6648, -81.5158),
    "GA": (32.1574, -82.9071),
    "HI": (19.8968, -155.5828),
    "ID": (44.0682, -114.7420),
    "IL": (40.6331, -89.3985),
    "IN": (39.7684, -86.1581),
    "IA": (41.8780, -93.0977),
    "KS": (39.0119, -98.4842),
    "KY": (37.8393, -84.2700),
    "LA": (30.9843, -91.9623),
    "ME": (45.2538, -69.4455),
    "MD": (39.0458, -76.6413),
    "MA": (42.4072, -71.3824),
    "MI": (44.3148, -85.6024),
    "MN": (46.7296, -94.6859),
    "MS": (32.3547, -89.3985),
    "MO": (37.9643, -91.8318),
    "MT": (46.8797, -110.3626),
    "NE": (41.4925, -99.9018),
    "NV": (38.8026, -116.4194),
    "NH": (43.1939, -71.5724),
    "NJ": (40.0583, -74.4057),
    "NM": (34.5199, -105.8701),
    "NY": (43.2994, -74.2179),
    "NC": (35.7596, -79.0193),
    "ND": (47.5515, -101.0020),
    "OH": (40.4173, -82.9071),
    "OK": (35.0078, -97.0929),
    "OR": (43.8041, -120.5542),
    "PA": (41.2033, -77.1945),
    "RI": (41.5801, -71.4774),
    "SC": (33.8361, -81.1637),
    "SD": (43.9695, -99.9018),
    "TN": (35.5175, -86.5804),
    "TX": (31.9686, -99.9018),
    "UT": (39.3210, -111.0937),
    "VT": (44.5588, -72.5778),
    "VA": (37.4316, -78.6569),
    "WA": (47.7511, -120.7401),
    "WV": (38.5976, -80.4549),
    "WI": (43.7844, -88.7879),
    "WY": (43.0760, -107.2903),
    "DC": (38.9072, -77.0369),
}


async def fetch_usgs(limit: int = 30) -> Tuple[List[Dict[str, Any]], str | None]:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(settings.usgs_geojson_feed_url)
        response.raise_for_status()
        payload = response.json()
        rows = payload.get("features", [])[:limit]
        incidents: List[Dict[str, Any]] = []
        for item in rows:
            props = item.get("properties", {})
            coords = (item.get("geometry") or {}).get("coordinates") or []
            if len(coords) < 2:
                continue
            lng, lat = coords[0], coords[1]
            magnitude = _safe_float(props.get("mag"), 0.0)
            incidents.append(
                {
                    "id": f"usgs-{item.get('id')}",
                    "type": "earthquake",
                    "title": props.get("place") or "USGS Earthquake",
                    "lat": lat,
                    "lng": lng,
                    "severity": _severity_from_score(max(0.0, min(10.0, magnitude * 1.2))),
                    "status": "active",
                    "affected_population": 0,
                    "timestamp": datetime.utcfromtimestamp((_safe_float(props.get("time"), 0.0)) / 1000).isoformat()
                    if props.get("time")
                    else datetime.utcnow().isoformat(),
                    "source": "usgs",
                }
            )
        return incidents, None
    except Exception as exc:
        return [], str(exc)


async def fetch_openfema(limit: int = 30) -> Tuple[List[Dict[str, Any]], str | None]:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(settings.openfema_disaster_feed_url)
        response.raise_for_status()
        payload = response.json()
        rows = payload.get("DisasterDeclarationsSummaries", [])[:limit]
        incidents: List[Dict[str, Any]] = []
        for row in rows:
            state = (row.get("state") or "").upper()
            lat, lng = US_STATE_CENTROIDS.get(state, (0.0, 0.0))
            incidents.append(
                {
                    "id": f"fema-{row.get('disasterNumber')}-{row.get('fipsStateCode')}",
                    "type": "other",
                    "title": row.get("declarationTitle") or "FEMA Declaration",
                    "lat": lat,
                    "lng": lng,
                    "severity": "moderate",
                    "status": "monitoring",
                    "affected_population": 0,
                    "timestamp": row.get("declarationDate") or datetime.utcnow().isoformat(),
                    "source": "openfema",
                    "meta": {
                        "state": row.get("state"),
                        "incidentType": row.get("incidentType"),
                    },
                }
            )
        # Remove entries without usable coordinates
        incidents = [i for i in incidents if i["lat"] != 0.0 or i["lng"] != 0.0]
        return incidents, None
    except Exception as exc:
        return [], str(exc)


async def fetch_data_gov_in(limit: int = 30) -> Tuple[List[Dict[str, Any]], str | None]:
    if not settings.data_gov_in_api_key or not settings.data_gov_in_resource_id:
        return [], "data.gov.in key/resource id not configured"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                "https://api.data.gov.in/resource/"
                f"{settings.data_gov_in_resource_id}",
                params={
                    "api-key": settings.data_gov_in_api_key,
                    "format": "json",
                    "limit": limit,
                },
            )
        response.raise_for_status()
        payload = response.json()
        rows = payload.get("records", [])[:limit]
        incidents: List[Dict[str, Any]] = []
        for idx, row in enumerate(rows):
            # data.gov.in datasets vary; use robust key fallbacks.
            lat = _safe_float(row.get("latitude") or row.get("lat"), 0.0)
            lng = _safe_float(row.get("longitude") or row.get("lng") or row.get("lon"), 0.0)
            if lat == 0.0 and lng == 0.0:
                continue
            incidents.append(
                {
                    "id": f"ogd-{idx}",
                    "type": (row.get("type") or row.get("incident_type") or "other").lower(),
                    "title": row.get("title") or row.get("event") or "India OGD Incident",
                    "lat": lat,
                    "lng": lng,
                    "severity": "moderate",
                    "status": "active",
                    "affected_population": int(_safe_float(row.get("affected_population"), 0.0)),
                    "timestamp": row.get("timestamp") or row.get("date") or datetime.utcnow().isoformat(),
                    "source": "data.gov.in",
                }
            )
        return incidents, None
    except Exception as exc:
        return [], str(exc)


async def fetch_nasa_eonet(limit: int = 30) -> Tuple[List[Dict[str, Any]], str | None]:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(settings.nasa_eonet_feed_url)
        response.raise_for_status()
        payload = response.json()
        rows = payload.get("events", [])[:limit]
        incidents: List[Dict[str, Any]] = []
        for row in rows:
            geom = row.get("geometry") or []
            if not geom:
                continue
            latest = geom[-1]
            coords = latest.get("coordinates") or []
            if len(coords) < 2:
                continue
            lng, lat = coords[0], coords[1]
            categories = row.get("categories") or []
            cat = categories[0]["title"].lower() if categories else "other"
            incidents.append(
                {
                    "id": f"eonet-{row.get('id')}",
                    "type": cat,
                    "title": row.get("title") or "NASA EONET Event",
                    "lat": lat,
                    "lng": lng,
                    "severity": "moderate",
                    "status": "active",
                    "affected_population": 0,
                    "timestamp": latest.get("date") or datetime.utcnow().isoformat(),
                    "source": "nasa-eonet",
                }
            )
        return incidents, None
    except Exception as exc:
        return [], str(exc)


def provider_requirements() -> Dict[str, Dict[str, Any]]:
    return {
        "usgs": {
            "requires_keys": [],
            "configured": True,
            "docs": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php",
        },
        "openfema": {
            "requires_keys": [],
            "configured": True,
            "docs": "https://www.fema.gov/openfema-data-page/openfema-api",
        },
        "nasa-eonet": {
            "requires_keys": [],
            "configured": True,
            "docs": "https://eonet.gsfc.nasa.gov/docs/v3",
        },
        "data.gov.in": {
            "requires_keys": ["data_gov_in_api_key", "data_gov_in_resource_id"],
            "configured": bool(settings.data_gov_in_api_key and settings.data_gov_in_resource_id),
            "docs": "https://data.gov.in/",
        },
        "nasa-firms": {
            "requires_keys": ["nasa_firms_api_key"],
            "configured": bool(settings.nasa_firms_api_key),
            "docs": "https://firms.modaps.eosdis.nasa.gov/",
        },
        "openweather": {
            "requires_keys": ["openweather_api_key"],
            "configured": bool(settings.openweather_api_key),
            "docs": "https://openweathermap.org/api",
        },
        "noaa-cdo": {
            "requires_keys": ["noaa_api_token", "noaa_dataset_id", "noaa_location_id"],
            "configured": bool(settings.noaa_api_token and settings.noaa_dataset_id and settings.noaa_location_id),
            "docs": "https://www.ncei.noaa.gov/cdo-web/webservices/v2",
        },
        "imd": {
            "requires_keys": ["imd_api_key"],
            "configured": bool(settings.imd_api_key),
            "docs": "https://mausam.imd.gov.in/",
        },
        "ndma": {
            "requires_keys": ["ndma_api_key"],
            "configured": bool(settings.ndma_api_key),
            "docs": "https://sachet.ndma.gov.in/",
        },
    }


async def aggregate_government_feeds(limit: int = 30) -> Dict[str, Any]:
    usgs_task = fetch_usgs(limit=limit)
    fema_task = fetch_openfema(limit=limit)
    ogd_task = fetch_data_gov_in(limit=limit)
    eonet_task = fetch_nasa_eonet(limit=limit)

    usgs_rows, fema_rows, ogd_rows, eonet_rows = await asyncio.gather(
        usgs_task, fema_task, ogd_task, eonet_task
    )
    usgs_rows, usgs_err = usgs_rows
    fema_rows, fema_err = fema_rows
    ogd_rows, ogd_err = ogd_rows
    eonet_rows, eonet_err = eonet_rows

    incidents = (usgs_rows + fema_rows + ogd_rows + eonet_rows)[: limit * 4]
    return {
        "incidents": incidents,
        "sources": {
            "usgs": {"count": len(usgs_rows), "error": usgs_err},
            "openfema": {"count": len(fema_rows), "error": fema_err},
            "data.gov.in": {"count": len(ogd_rows), "error": ogd_err},
            "nasa-eonet": {"count": len(eonet_rows), "error": eonet_err},
        },
        "providers": provider_requirements(),
        "last_updated": datetime.utcnow().isoformat(),
    }
