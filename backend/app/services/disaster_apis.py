import os
import requests
from typing import Dict, List, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class WeatherService:
    """Service for fetching real-time weather data"""

    def __init__(self):
        from app.config import settings
        self.api_key = settings.openweather_api_key
        self.base_url = "https://api.openweathermap.org/data/2.5"

    def get_weather_alerts(self, lat: float, lon: float, radius_km: int = 50) -> List[Dict]:
        """
        Get weather alerts for a location
        Returns severe weather warnings
        """
        if not self.api_key:
            logger.warning("OpenWeather API key not configured")
            return []

        try:
            # Get current weather
            weather_url = f"{self.base_url}/weather"
            params = {
                "lat": lat,
                "lon": lon,
                "appid": self.api_key,
                "units": "metric"
            }

            response = requests.get(weather_url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            alerts = []

            # Check for severe weather conditions
            weather_main = data.get("weather", [{}])[0].get("main", "").lower()
            weather_desc = data.get("weather", [{}])[0].get("description", "").lower()
            temp = data.get("main", {}).get("temp", 20)
            wind_speed = data.get("wind", {}).get("speed", 0)
            humidity = data.get("main", {}).get("humidity", 50)

            # Severe weather detection
            if any(keyword in weather_desc for keyword in ["thunderstorm", "tornado", "hurricane"]):
                alerts.append({
                    "type": "severe_weather",
                    "severity": "high",
                    "description": f"Severe weather: {weather_desc.title()}",
                    "location": f"{lat:.4f}, {lon:.4f}",
                    "timestamp": datetime.utcnow().isoformat(),
                    "source": "OpenWeatherMap"
                })

            if temp > 35:  # Heat wave
                alerts.append({
                    "type": "heat_wave",
                    "severity": "moderate",
                    "description": f"High temperature: {temp}°C",
                    "location": f"{lat:.4f}, {lon:.4f}",
                    "timestamp": datetime.utcnow().isoformat(),
                    "source": "OpenWeatherMap"
                })

            if wind_speed > 20:  # High winds
                alerts.append({
                    "type": "high_winds",
                    "severity": "moderate",
                    "description": f"High winds: {wind_speed} m/s",
                    "location": f"{lat:.4f}, {lon:.4f}",
                    "timestamp": datetime.utcnow().isoformat(),
                    "source": "OpenWeatherMap"
                })

            return alerts

        except Exception as e:
            logger.error(f"Error fetching weather data: {e}")
            return []

class FloodService:
    """Service for flood monitoring data"""

    def __init__(self):
        # Using a free flood API or mock for demo
        # In production, use services like NOAA, ECMWF, or local flood services
        pass

    def get_flood_alerts(self, lat: float, lon: float) -> List[Dict]:
        """
        Get flood alerts for a location
        Note: Using simulated data - replace with real API
        """
        # Keep deterministic and avoid synthetic random alerts.
        # Integrate a real flood source here when key/endpoints are available.
        return []

class WildfireService:
    """Service for wildfire monitoring"""

    def __init__(self):
        from app.config import settings
        self.api_key = settings.nasa_firms_api_key

    def get_wildfire_alerts(self, lat: float, lon: float, radius_km: int = 100) -> List[Dict]:
        """
        Get wildfire alerts from NASA FIRMS
        Note: Requires API key and proper implementation
        """
        if not self.api_key:
            logger.warning("NASA FIRMS API key not configured")
            return []

        # Placeholder for FIRMS query implementation.
        # Return empty until key + query endpoint mapping are configured.
        return []

# Global instances
weather_service = WeatherService()
flood_service = FloodService()
wildfire_service = WildfireService()

def get_all_disaster_alerts(lat: float, lon: float) -> List[Dict]:
    """
    Get all disaster alerts from integrated APIs
    """
    alerts = []

    alerts.extend(weather_service.get_weather_alerts(lat, lon))
    alerts.extend(flood_service.get_flood_alerts(lat, lon))
    alerts.extend(wildfire_service.get_wildfire_alerts(lat, lon))

    return alerts
