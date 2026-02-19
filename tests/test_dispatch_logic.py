import pytest
from datetime import datetime
from app.services.dispatch import haversine_distance, estimate_arrival_time
from app.models import ResourceType


class TestDistanceCalculation:
    """Test Haversine distance calculation"""
    
    def test_same_coordinates(self):
        """Distance between same coordinates should be 0"""
        distance = haversine_distance(28.7041, 77.1025, 28.7041, 77.1025)
        assert distance == pytest.approx(0, abs=0.01)
    
    def test_known_distance(self):
        """Test with known distance"""
        # Delhi to Mumbai distance is approximately 1380 km
        delhi_lat, delhi_lon = 28.7041, 77.1025
        mumbai_lat, mumbai_lon = 19.0760, 72.8777
        
        distance = haversine_distance(delhi_lat, delhi_lon, mumbai_lat, mumbai_lon)
        
        # Should be approximately 1380 km
        assert 1300 < distance < 1450
    
    def test_symmetry(self):
        """Distance should be symmetric"""
        lat1, lon1 = 28.7041, 77.1025
        lat2, lon2 = 19.0760, 72.8777
        
        dist1 = haversine_distance(lat1, lon1, lat2, lon2)
        dist2 = haversine_distance(lat2, lon2, lat1, lon1)
        
        assert dist1 == pytest.approx(dist2, abs=0.01)
    
    def test_opposite_ends_of_earth(self):
        """Distance from North Pole to South Pole"""
        distance = haversine_distance(90, 0, -90, 0)
        # Half Earth's circumference ≈ 20,000 km
        assert 19500 < distance < 20500
    
    def test_nearby_coordinates(self):
        """Test small distance calculation"""
        lat1, lon1 = 28.7041, 77.1025
        lat2, lon2 = 28.7050, 77.1030  # About 1 km away
        
        distance = haversine_distance(lat1, lon1, lat2, lon2)
        assert 0.5 < distance < 2  # Should be roughly 1 km


class TestArrivalTimeEstimation:
    """Test arrival time estimation"""
    
    def test_ambulance_speed(self):
        """Ambulance should travel at ~60 km/h"""
        arrival = estimate_arrival_time(60, ResourceType.AMBULANCE)
        # 60 km at 60 km/h should take 1 hour
        assert arrival.total_seconds() == pytest.approx(3600, abs=60)
    
    def test_drone_speed(self):
        """Drone should travel at ~50 km/h"""
        arrival = estimate_arrival_time(50, ResourceType.DRONE)
        # 50 km at 50 km/h should take 1 hour
        assert arrival.total_seconds() == pytest.approx(3600, abs=60)
    
    def test_rescue_speed(self):
        """Rescue team should travel at ~40 km/h"""
        arrival = estimate_arrival_time(40, ResourceType.RESCUE)
        # 40 km at 40 km/h should take 1 hour
        assert arrival.total_seconds() == pytest.approx(3600, abs=60)
    
    def test_zero_distance(self):
        """Zero distance should result in minimal arrival time"""
        arrival = estimate_arrival_time(0, ResourceType.AMBULANCE)
        assert arrival.total_seconds() == 0
    
    def test_long_distance(self):
        """Test longer distance"""
        arrival = estimate_arrival_time(100, ResourceType.AMBULANCE)
        # 100 km at 60 km/h should take ~100 minutes
        total_minutes = arrival.total_seconds() / 60
        assert 95 < total_minutes < 105
