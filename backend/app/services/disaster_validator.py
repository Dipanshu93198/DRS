"""
Disaster Validation Service
Validates incoming disaster reports and assesses their credibility.
"""

try:
    from app.schemas import DisasterValidationRequest, DisasterValidationResponse
except ImportError:
    from schemas import DisasterValidationRequest, DisasterValidationResponse


def validate_disaster(request: DisasterValidationRequest) -> DisasterValidationResponse:
    """
    Validate a disaster report by checking multiple factors.
    Returns a validation response with score and recommended actions.
    """
    
    # Initialize validation factors (0-100 scale)
    validation_score = 50.0  # Start with baseline
    validation_details = {
        "source_credibility": 0,
        "severity_consistency": 0,
        "location_validity": 0,
        "description_quality": 0,
    }
    reasons = []
    
    # 1. Source Credibility Check
    source_lower = request.source.lower()
    if source_lower in ["usgs", "official", "government", "emergency_service"]:
        validation_details["source_credibility"] = 95
        validation_score += 20
        reasons.append("High credibility source (official)")
    elif source_lower in ["news", "media", "citizen_report", "social_media"]:
        validation_details["source_credibility"] = 60
        validation_score += 5
        reasons.append("Medium credibility source (citizen/media)")
    else:
        validation_details["source_credibility"] = 40
        reasons.append("Unknown source - requires verification")
    
    # 2. Severity Consistency Check
    severity = request.severity_score
    if 0 <= severity <= 10:
        if 7 <= severity <= 10:
            validation_details["severity_consistency"] = 90
            validation_score += 15
            reasons.append("High severity score is critical")
        elif 4 <= severity < 7:
            validation_details["severity_consistency"] = 75
            validation_score += 10
            reasons.append("Medium severity score")
        else:
            validation_details["severity_consistency"] = 60
            validation_score += 5
            reasons.append("Low severity score")
    
    # 3. Location Validity Check
    lat = request.latitude
    lon = request.longitude
    if -90 <= lat <= 90 and -180 <= lon <= 180:
        validation_details["location_validity"] = 85
        validation_score += 10
        reasons.append("Valid geographic coordinates")
    else:
        validation_details["location_validity"] = 0
        validation_score = 0
        reasons = ["Invalid geographic coordinates - disaster cannot be validated"]
        return DisasterValidationResponse(
            is_valid=False,
            validation_score=0,
            reason="Invalid location data",
            severity_level="Invalid",
            recommended_actions=[],
            validation_details=validation_details
        )
    
    # 4. Description Quality Check
    description = request.description.strip() if request.description else ""
    if len(description) >= 20:
        validation_details["description_quality"] = 80
        validation_score += 10
        reasons.append("Detailed description provided")
    elif len(description) >= 10:
        validation_details["description_quality"] = 50
        validation_score += 3
        reasons.append("Brief description provided")
    else:
        validation_details["description_quality"] = 20
        reasons.append("Missing or minimal description")
    
    # Ensure validation score is between 0-100
    validation_score = min(100, max(0, validation_score))
    
    # Determine validity threshold and severity level
    is_valid = validation_score >= 40  # Disasters with score >= 40 are considered valid
    
    if severity >= 8:
        severity_level = "Critical"
    elif severity >= 6:
        severity_level = "High"
    elif severity >= 4:
        severity_level = "Medium"
    else:
        severity_level = "Low"
    
    # Generate recommended actions based on validation
    recommended_actions = []
    if is_valid:
        recommended_actions.append("✅ Disaster report is VALID - activate response protocols")
        
        if severity >= 8:
            recommended_actions.append("🚨 Deploy maximum available resources immediately")
            recommended_actions.append("📢 Issue public alert and evacuation orders")
            recommended_actions.append("📱 Activate emergency communication systems")
        elif severity >= 6:
            recommended_actions.append("⚠️ Deploy adequate resources to affected area")
            recommended_actions.append("📊 Monitor situation closely for escalation")
        else:
            recommended_actions.append("👁️ Monitor situation and prepare resources")
        
        recommended_actions.append("🗺️ Establish command center at strategic location")
        recommended_actions.append("🚑 Activate medical and rescue teams")
        recommended_actions.append("📋 Begin damage assessment")
    else:
        recommended_actions.append("❌ Disaster report requires additional verification")
        recommended_actions.append("🔍 Collect more credible evidence")
        recommended_actions.append("📞 Contact source for confirmation")
        recommended_actions.append("⏳ Monitor for corroborating reports")
    
    validation_reason = f"Validation Score: {validation_score}%. " + " | ".join(reasons)
    
    return DisasterValidationResponse(
        is_valid=is_valid,
        validation_score=validation_score,
        reason=validation_reason,
        severity_level=severity_level,
        recommended_actions=recommended_actions,
        validation_details={
            **validation_details,
            "input_type": request.type.value,
            "input_severity": severity,
            "input_location": f"({round(lat, 4)}, {round(lon, 4)})",
            "description_length": len(description),
        }
    )
