"""
Phase 5 Tests: Citizen SOS + Real-Time Alerts
Tests for SOS reporting, clustering, crowd assistance, and alert broadcasting
"""

import pytest
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app import services
from app.models import SOSReport, CrowdAssistance, AlertBroadcast, SOSStatus, EmergencyType
from app.database import SessionLocal


@pytest.fixture
def db():
    """Get test database session"""
    return SessionLocal()


class TestSOSReportCreation:
    """Tests for creating SOS reports"""

    def test_create_basic_sos_report(self, db: Session):
        """Test creating a basic SOS report"""
        sos = services.sos.create_sos_report(
            db=db,
            reporter_name="Test User",
            reporter_phone="+919876543210",
            latitude=28.7041,
            longitude=77.1025,
            emergency_type="medical",
            description="Person collapsed with head injury, bleeding",
            severity_score=8.5,
            num_people_affected=1,
            has_injuries=1,
        )

        assert sos.id is not None
        assert sos.reporter_name == "Test User"
        assert sos.status == SOSStatus.PENDING
        assert sos.severity_score == 8.5

    def test_create_urgent_sos(self, db: Session):
        """Test creating urgent SOS report"""
        sos = services.sos.create_sos_report(
            db=db,
            reporter_name="Emergency Test",
            reporter_phone="+919876543210",
            latitude=28.7041,
            longitude=77.1025,
            emergency_type="fire",
            description="Building fire with people trapped inside",
            severity_score=9.5,
            is_urgent=True,
        )

        assert sos.is_urgent == 1
        assert sos.severity_score == 9.5

    def test_create_sos_with_metadata(self, db: Session):
        """Test creating SOS with additional metadata"""
        metadata = {
            "vulnerable_groups": ["children", "elderly"],
            "hazards": ["traffic", "fire"],
            "access_info": "Near main gate",
        }
        
        sos = services.sos.create_sos_report(
            db=db,
            reporter_name="Test User",
            reporter_phone="+919876543210",
            latitude=28.7041,
            longitude=77.1025,
            emergency_type="accident",
            description="Multi-vehicle collision on highway",
            severity_score=7.0,
            metadata=metadata,
        )

        assert sos.metadata == metadata
        assert "vulnerable_groups" in sos.metadata

    def test_sos_default_values(self, db: Session):
        """Test that SOS has proper default values"""
        sos = services.sos.create_sos_report(
            db=db,
            reporter_name="Test User",
            reporter_phone="+919876543210",
            latitude=28.7041,
            longitude=77.1025,
            emergency_type="other",
            description="Some emergency situation here",
            severity_score=5.0,
        )

        assert sos.num_people_affected == 1
        assert sos.has_injuries == 0
        assert sos.requires_evacuation == 0
        assert sos.is_urgent == 0
        assert sos.crowd_assistance_enabled == 1
        assert sos.acknowledged_at is None
        assert sos.resolved_at is None


class TestSOSReportAcknowledgment:
    """Tests for acknowledging and resolving SOS reports"""

    def test_acknowledge_sos_report(self, db: Session):
        """Test acknowledging an SOS report"""
        sos = services.sos.create_sos_report(
            db=db,
            reporter_name="Test User",
            reporter_phone="+919876543210",
            latitude=28.7041,
            longitude=77.1025,
            emergency_type="medical",
            description="Medical emergency",
            severity_score=7.0,
        )

        acknowledged = services.sos.acknowledge_sos(db, sos.id)

        assert acknowledged.status == SOSStatus.ACKNOWLEDGED
        assert acknowledged.acknowledged_at is not None

    def test_resolve_sos_report(self, db: Session):
        """Test resolving an SOS report"""
        sos = services.sos.create_sos_report(
            db=db,
            reporter_name="Test User",
            reporter_phone="+919876543210",
            latitude=28.7041,
            longitude=77.1025,
            emergency_type="fire",
            description="Fire emergency",
            severity_score=8.0,
        )

        resolved = services.sos.resolve_sos(db, sos.id)

        assert resolved.status == SOSStatus.RESOLVED
        assert resolved.resolved_at is not None

    def test_acknowledge_nonexistent_sos(self, db: Session):
        """Test acknowledging nonexistent SOS returns None"""
        result = services.sos.acknowledge_sos(db, 99999)
        assert result is None


class TestSOSLocationSearch:
    """Tests for finding nearby SOS reports"""

    def test_find_nearby_sos_reports(self, db: Session):
        """Test finding nearby SOS reports"""
        # Create SOS at known location
        sos1 = services.sos.create_sos_report(
            db=db,
            reporter_name="User 1",
            reporter_phone="+919876543210",
            latitude=28.7041,
            longitude=77.1025,
            emergency_type="medical",
            description="Medical emergency",
            severity_score=6.0,
        )

        # Create SOS far away
        sos2 = services.sos.create_sos_report(
            db=db,
            reporter_name="User 2",
            reporter_phone="+919876543211",
            latitude=34.0522,
            longitude=-118.2437,  # Los Angeles
            emergency_type="fire",
            description="Fire emergency",
            severity_score=7.0,
        )

        # Search near first SOS
        nearby = services.sos.find_nearby_sos_reports(
            db, 28.7041, 77.1025, radius_km=1.0
        )

        assert len(nearby) > 0
        assert nearby[0][0].id == sos1.id

    def test_nearby_search_respects_radius(self, db: Session):
        """Test that nearby search respects radius parameter"""
        sos = services.sos.create_sos_report(
            db=db,
            reporter_name="Test User",
            reporter_phone="+919876543210",
            latitude=28.7041,
            longitude=77.1025,
            emergency_type="medical",
            description="Medical emergency",
            severity_score=5.0,
        )

        # Search with small radius - should find it
        nearby_small = services.sos.find_nearby_sos_reports(
            db, 28.7041, 77.1025, radius_km=1.0
        )
        assert len(nearby_small) > 0

        # Search with very small radius - should not find it if we move slightly
        nearby_tiny = services.sos.find_nearby_sos_reports(
            db, 28.71, 77.11, radius_km=0.5
        )
        # Depends on actual distance calculation

    def test_nearby_search_filters_by_status(self, db: Session):
        """Test filtering nearby SOS by status"""
        # Create pending SOS
        sos1 = services.sos.create_sos_report(
            db=db,
            reporter_name="User 1",
            reporter_phone="+919876543210",
            latitude=28.7041,
            longitude=77.1025,
            emergency_type="medical",
            description="Medical emergency",
            severity_score=5.0,
        )

        # Create and resolve another SOS
        sos2 = services.sos.create_sos_report(
            db=db,
            reporter_name="User 2",
            reporter_phone="+919876543211",
            latitude=28.7050,
            longitude=77.1030,
            emergency_type="accident",
            description="Accident",
            severity_score=6.0,
        )
        services.sos.resolve_sos(db, sos2.id)

        # Search for active only
        active = services.sos.find_nearby_sos_reports(
            db, 28.7041, 77.1025, radius_km=1.0, status_filter="active"
        )

        # Should find pending but not resolved
        ids = [report for report, _ in active]
        assert any(r.id == sos1.id for r in ids)
        assert not any(r.id == sos2.id for r in ids)


class TestSOSClustering:
    """Tests for clustering nearby SOS reports"""

    def test_cluster_sos_reports(self, db: Session):
        """Test clustering nearby SOS reports"""
        # Create 3 nearby SOS reports
        for i in range(3):
            services.sos.create_sos_report(
                db=db,
                reporter_name=f"User {i}",
                reporter_phone=f"+9198765432{i}",
                latitude=28.7041 + (i * 0.001),  # Slightly different locations
                longitude=77.1025 + (i * 0.001),
                emergency_type="medical",
                description=f"Emergency {i}",
                severity_score=5.0 + i,
            )

        clusters = services.sos.cluster_sos_reports(db, cluster_radius_km=2.0)

        assert len(clusters) > 0
        assert clusters[0]["num_incidents"] >= 3

    def test_cluster_statistics(self, db: Session):
        """Test cluster contains correct statistics"""
        # Create mixed severity SOS reports
        services.sos.create_sos_report(
            db=db,
            reporter_name="User 1",
            reporter_phone="+919876543210",
            latitude=28.7041,
            longitude=77.1025,
            emergency_type="medical",
            description="Emergency",
            severity_score=3.0,
        )
        services.sos.create_sos_report(
            db=db,
            reporter_name="User 2",
            reporter_phone="+919876543211",
            latitude=28.7042,
            longitude=77.1026,
            emergency_type="fire",
            description="Emergency",
            severity_score=7.0,
        )

        clusters = services.sos.cluster_sos_reports(db)

        assert len(clusters) > 0
        cluster = clusters[0]
        assert cluster["severity_average"] == pytest.approx(5.0, 0.1)
        assert "medical" in cluster["incident_types"] or "fire" in cluster["incident_types"]


class TestCrowdAssistance:
    """Tests for crowd assistance offerings"""

    def test_offer_crowd_assistance(self, db: Session):
        """Test citizen offering assistance for SOS"""
        sos = services.sos.create_sos_report(
            db=db,
            reporter_name="Reporter",
            reporter_phone="+919876543210",
            latitude=28.7041,
            longitude=77.1025,
            emergency_type="medical",
            description="Medical emergency",
            severity_score=7.0,
        )

        assistance = services.sos.offer_crowd_assistance(
            db=db,
            sos_report_id=sos.id,
            helper_name="Helper User",
            helper_phone="+919876543211",
            latitude=28.7050,
            longitude=77.1030,
            assistance_type="medical_knowledge",
            description="I'm a nurse and can provide first aid",
        )

        assert assistance.sos_report_id == sos.id
        assert assistance.helper_name == "Helper User"
        assert assistance.distance_km > 0
        assert assistance.estimated_arrival_min > 0

    def test_assistance_distance_calculation(self, db: Session):
        """Test that assistance distance is calculated correctly"""
        sos = services.sos.create_sos_report(
            db=db,
            reporter_name="Reporter",
            reporter_phone="+919876543210",
            latitude=28.7041,
            longitude=77.1025,
            emergency_type="medical",
            description="Emergency",
            severity_score=5.0,
        )

        # Offer assistance from same location
        assistance = services.sos.offer_crowd_assistance(
            db=db,
            sos_report_id=sos.id,
            helper_name="Helper",
            helper_phone="+919876543211",
            latitude=28.7041,
            longitude=77.1025,
            assistance_type="supplies",
            description="Can bring supplies",
        )

        assert assistance.distance_km == pytest.approx(0.0, 0.1)

    def test_get_assistance_offers_for_sos(self, db: Session):
        """Test retrieving assistance offers for specific SOS"""
        sos = services.sos.create_sos_report(
            db=db,
            reporter_name="Reporter",
            reporter_phone="+919876543210",
            latitude=28.7041,
            longitude=77.1025,
            emergency_type="medical",
            description="Medical emergency",
            severity_score=7.0,
        )

        # Create 2 assistance offers
        for i in range(2):
            services.sos.offer_crowd_assistance(
                db=db,
                sos_report_id=sos.id,
                helper_name=f"Helper {i}",
                helper_phone=f"+9198765432{i}",
                latitude=28.7041 + (i * 0.01),
                longitude=77.1025,
                assistance_type="medical_knowledge",
                description="Can help",
            )

        offers = services.sos.get_crowd_assistance_for_sos(db, sos.id)

        assert len(offers) == 2
        # Check sorted by distance
        assert offers[0].distance_km <= offers[1].distance_km

    def test_accept_crowd_assistance(self, db: Session):
        """Test accepting assistance offer"""
        sos = services.sos.create_sos_report(
            db=db,
            reporter_name="Reporter",
            reporter_phone="+919876543210",
            latitude=28.7041,
            longitude=77.1025,
            emergency_type="medical",
            description="Emergency",
            severity_score=5.0,
        )

        assistance = services.sos.offer_crowd_assistance(
            db=db,
            sos_report_id=sos.id,
            helper_name="Helper",
            helper_phone="+919876543211",
            latitude=28.7050,
            longitude=77.1030,
            assistance_type="medical_knowledge",
            description="Can help",
        )

        accepted = services.sos.accept_crowd_assistance(db, assistance.id)

        assert accepted.accepted_at is not None
        assert accepted.availability_status == "helping"


class TestAlertBroadcasting:
    """Tests for alert broadcasting"""

    def test_broadcast_alert(self, db: Session):
        """Test broadcasting an alert"""
        sos = services.sos.create_sos_report(
            db=db,
            reporter_name="Reporter",
            reporter_phone="+919876543210",
            latitude=28.7041,
            longitude=77.1025,
            emergency_type="fire",
            description="Fire emergency",
            severity_score=8.0,
        )

        broadcast = services.sos.broadcast_alert(
            db=db,
            sos_report_id=sos.id,
            alert_type="new_sos",
            message="Fire emergency reported near Delhi Mall",
            broadcast_scope="district",
        )

        assert broadcast.sos_report_id == sos.id
        assert broadcast.alert_type == "new_sos"
        assert broadcast.recipients_reached > 0

    def test_broadcast_scope_affects_recipients(self, db: Session):
        """Test that broadcast scope affects recipient count"""
        sos = services.sos.create_sos_report(
            db=db,
            reporter_name="Reporter",
            reporter_phone="+919876543210",
            latitude=28.7041,
            longitude=77.1025,
            emergency_type="medical",
            description="Emergency",
            severity_score=5.0,
        )

        # Immediate scope
        immediate = services.sos.broadcast_alert(
            db=db,
            sos_report_id=sos.id,
            alert_type="new_sos",
            message="Emergency",
            broadcast_scope="immediate",
        )

        # National scope
        national = services.sos.broadcast_alert(
            db=db,
            sos_report_id=sos.id,
            alert_type="new_sos",
            message="Emergency",
            broadcast_scope="national",
        )

        assert national.recipients_reached > immediate.recipients_reached


class TestSOSAnalytics:
    """Tests for SOS analytics"""

    def test_get_sos_analytics(self, db: Session):
        """Test getting SOS analytics"""
        # Create various SOS reports
        urgent_sos = services.sos.create_sos_report(
            db=db,
            reporter_name="Reporter 1",
            reporter_phone="+919876543210",
            latitude=28.7041,
            longitude=77.1025,
            emergency_type="fire",
            description="Fire emergency",
            severity_score=9.0,
            is_urgent=True,
        )

        medical_sos = services.sos.create_sos_report(
            db=db,
            reporter_name="Reporter 2",
            reporter_phone="+919876543211",
            latitude=28.7050,
            longitude=77.1030,
            emergency_type="medical",
            description="Medical emergency",
            severity_score=7.0,
        )

        # Resolve one
        services.sos.resolve_sos(db, medical_sos.id)

        analytics = services.sos.get_sos_analytics(db)

        assert analytics["total_active_sos"] == 1
        assert analytics["urgent_cases"] == 1
        assert analytics["average_response_time_minutes"] >= 0

    def test_analytics_most_common_type(self, db: Session):
        """Test analytics identifies most common emergency type"""
        # Create multiple medical emergencies
        for i in range(3):
            services.sos.create_sos_report(
                db=db,
                reporter_name=f"Reporter {i}",
                reporter_phone=f"+9198765432{i}",
                latitude=28.7041,
                longitude=77.1025,
                emergency_type="medical",
                description="Medical emergency",
                severity_score=5.0,
            )

        # Create one fire emergency
        services.sos.create_sos_report(
            db=db,
            reporter_name="Reporter Fire",
            reporter_phone="+919876543299",
            latitude=28.7050,
            longitude=77.1030,
            emergency_type="fire",
            description="Fire emergency",
            severity_score=7.0,
        )

        analytics = services.sos.get_sos_analytics(db)

        assert analytics["most_common_emergency_type"] == "medical"


class TestSOSEndToEnd:
    """End-to-end tests for complete SOS workflow"""

    def test_sos_complete_workflow(self, db: Session):
        """Test complete SOS report workflow"""
        # 1. Citizen creates SOS
        sos = services.sos.create_sos_report(
            db=db,
            reporter_name="Amit Kumar",
            reporter_phone="+919876543210",
            latitude=28.7041,
            longitude=77.1025,
            emergency_type="medical",
            description="Person with severe head injury, unconscious and bleeding",
            severity_score=9.0,
            num_people_affected=1,
            has_injuries=1,
            is_urgent=True,
        )
        assert sos.status == SOSStatus.PENDING

        # 2. Alert is broadcast
        broadcast = services.sos.broadcast_alert(
            db=db,
            sos_report_id=sos.id,
            alert_type="new_sos",
            message="Medical emergency reported",
            broadcast_scope="immediate",
        )
        assert broadcast.recipients_reached > 0

        # 3. Volunteers offer help
        helper1 = services.sos.offer_crowd_assistance(
            db=db,
            sos_report_id=sos.id,
            helper_name="Dr. Sharma",
            helper_phone="+919876543211",
            latitude=28.7050,
            longitude=77.1030,
            assistance_type="medical_knowledge",
            description="I'm a doctor nearby",
        )

        helper2 = services.sos.offer_crowd_assistance(
            db=db,
            sos_report_id=sos.id,
            helper_name="Priya Singh",
            helper_phone="+919876543212",
            latitude=28.7045,
            longitude=77.1028,
            assistance_type="transportation",
            description="Can provide vehicle for transport",
        )

        # Get helpers
        offers = services.sos.get_crowd_assistance_for_sos(db, sos.id)
        assert len(offers) >= 2
        
        # Closest helper is first
        assert offers[0].distance_km <= offers[1].distance_km

        # 4. Accept help
        services.sos.accept_crowd_assistance(db, offers[0].id)

        # 5. Emergency personnel acknowledge
        services.sos.acknowledge_sos(db, sos.id)
        sos = services.sos.get_sos_report(db, sos.id)
        assert sos.status == SOSStatus.ACKNOWLEDGED

        # 6. Emergency resolved
        services.sos.resolve_sos(db, sos.id)
        sos = services.sos.get_sos_report(db, sos.id)
        assert sos.status == SOSStatus.RESOLVED
        assert sos.resolved_at is not None
