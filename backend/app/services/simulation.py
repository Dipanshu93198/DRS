from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import random
import math
from dataclasses import dataclass
from enum import Enum

class SimulationType(str, Enum):
    EARLY_EVACUATION = "early_evacuation"
    DELAYED_EVACUATION = "delayed_evacuation"
    RESOURCE_SHORTAGE = "resource_shortage"
    MULTIPLE_DISASTERS = "multiple_disasters"
    CASCADE_FAILURE = "cascade_failure"

@dataclass
class SimulationResult:
    """Results from a disaster simulation"""
    simulation_id: str
    simulation_type: SimulationType
    duration_hours: int
    total_casualties: int
    evacuation_efficiency: float  # 0-100%
    resource_utilization: float  # 0-100%
    response_time_avg: float  # minutes
    bottlenecks: List[str]
    recommendations: List[str]
    timeline: List[Dict[str, Any]]

class DisasterSimulator:
    """Engine for simulating disaster response scenarios"""

    def __init__(self):
        self.simulation_history: Dict[str, SimulationResult] = {}

    def simulate_scenario(
        self,
        disaster_type: str,
        severity: float,  # 0-10
        population_affected: int,
        available_resources: int,
        evacuation_routes: int,
        shelters_capacity: int,
        simulation_type: SimulationType = SimulationType.EARLY_EVACUATION
    ) -> SimulationResult:
        """
        Run a disaster response simulation
        """
        simulation_id = f"sim_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{random.randint(1000, 9999)}"

        # Base parameters
        base_response_time = 30  # minutes
        base_evacuation_rate = 1000  # people per hour per route

        # Adjust based on simulation type
        if simulation_type == SimulationType.EARLY_EVACUATION:
            response_modifier = 0.7  # Faster response
            evacuation_modifier = 1.2  # More efficient
            casualty_modifier = 0.5  # Fewer casualties
        elif simulation_type == SimulationType.DELAYED_EVACUATION:
            response_modifier = 1.5
            evacuation_modifier = 0.8
            casualty_modifier = 2.0
        elif simulation_type == SimulationType.RESOURCE_SHORTAGE:
            response_modifier = 1.2
            evacuation_modifier = 0.6
            casualty_modifier = 1.8
        elif simulation_type == SimulationType.CASCADE_FAILURE:
            response_modifier = 2.0
            evacuation_modifier = 0.4
            casualty_modifier = 3.0
        else:  # MULTIPLE_DISASTERS
            response_modifier = 1.8
            evacuation_modifier = 0.7
            casualty_modifier = 2.5

        # Calculate metrics
        response_time = base_response_time * response_modifier * (severity / 5.0)
        evacuation_rate = base_evacuation_rate * evacuation_modifier * evacuation_routes
        total_evacuation_capacity = evacuation_rate * 24  # 24 hours

        # Calculate casualties
        base_casualties = population_affected * (severity / 10.0) * 0.05  # 5% base casualty rate
        total_casualties = int(base_casualties * casualty_modifier)

        # Calculate evacuation efficiency
        evacuation_efficiency = min(100, (total_evacuation_capacity / population_affected) * 100)
        if evacuation_efficiency < 50:
            evacuation_efficiency *= 0.8  # Penalty for low efficiency

        # Resource utilization
        resource_utilization = min(100, (population_affected / (available_resources * 50)) * 100)

        # Generate timeline
        timeline = self._generate_timeline(
            disaster_type, severity, response_time, evacuation_efficiency, simulation_type
        )

        # Identify bottlenecks
        bottlenecks = []
        if response_time > 60:
            bottlenecks.append("Slow initial response time")
        if evacuation_efficiency < 70:
            bottlenecks.append("Insufficient evacuation capacity")
        if resource_utilization > 90:
            bottlenecks.append("Resource overload")
        if shelters_capacity < population_affected * 0.3:
            bottlenecks.append("Inadequate shelter capacity")

        # Generate recommendations
        recommendations = self._generate_recommendations(bottlenecks, simulation_type)

        result = SimulationResult(
            simulation_id=simulation_id,
            simulation_type=simulation_type,
            duration_hours=24,  # Standard 24-hour simulation
            total_casualties=total_casualties,
            evacuation_efficiency=round(evacuation_efficiency, 1),
            resource_utilization=round(resource_utilization, 1),
            response_time_avg=round(response_time, 1),
            bottlenecks=bottlenecks,
            recommendations=recommendations,
            timeline=timeline
        )

        self.simulation_history[simulation_id] = result
        return result

    def _generate_timeline(
        self,
        disaster_type: str,
        severity: float,
        response_time: float,
        evacuation_efficiency: float,
        simulation_type: SimulationType
    ) -> List[Dict[str, Any]]:
        """Generate a timeline of simulation events"""
        timeline = []

        # Initial detection
        timeline.append({
            "time": "T+0",
            "event": f"{disaster_type.title()} detected",
            "description": f"Severity {severity}/10 disaster reported",
            "impact": "Alert triggered"
        })

        # Response initiation
        response_hour = response_time / 60
        timeline.append({
            "time": f"T+{response_hour:.1f}h",
            "event": "Emergency response initiated",
            "description": "Resources dispatched to affected area",
            "impact": f"Response time: {response_time:.0f} minutes"
        })

        # Evacuation progress
        if evacuation_efficiency > 80:
            timeline.append({
                "time": "T+2h",
                "event": "Evacuation proceeding efficiently",
                "description": "High evacuation efficiency achieved",
                "impact": "Most vulnerable populations evacuated"
            })
        elif evacuation_efficiency > 50:
            timeline.append({
                "time": "T+4h",
                "event": "Evacuation in progress",
                "description": "Moderate evacuation efficiency",
                "impact": "Partial evacuation completed"
            })
        else:
            timeline.append({
                "time": "T+6h",
                "event": "Evacuation bottleneck",
                "description": "Low evacuation efficiency causing delays",
                "impact": "Increased risk to population"
            })

        # Peak impact
        peak_time = 6 if simulation_type == SimulationType.EARLY_EVACUATION else 12
        timeline.append({
            "time": f"T+{peak_time}h",
            "event": "Peak disaster impact",
            "description": "Maximum damage and risk period",
            "impact": "Critical response window"
        })

        # Recovery phase
        timeline.append({
            "time": "T+18h",
            "event": "Recovery operations begin",
            "description": "Transition to recovery and assessment",
            "impact": "Long-term support activated"
        })

        return timeline

    def _generate_recommendations(
        self,
        bottlenecks: List[str],
        simulation_type: SimulationType
    ) -> List[str]:
        """Generate recommendations based on simulation results"""
        recommendations = []

        if "Slow initial response time" in bottlenecks:
            recommendations.append("Increase rapid response teams and improve alert systems")
            recommendations.append("Implement automated alert triggers for high-severity events")

        if "Insufficient evacuation capacity" in bottlenecks:
            recommendations.append("Develop additional evacuation routes and transportation options")
            recommendations.append("Create neighborhood evacuation plans with designated assembly points")

        if "Resource overload" in bottlenecks:
            recommendations.append("Expand resource pool with mutual aid agreements")
            recommendations.append("Implement resource prioritization algorithms")

        if "Inadequate shelter capacity" in bottlenecks:
            recommendations.append("Map and certify additional shelter facilities")
            recommendations.append("Develop shelter capacity expansion protocols")

        # Type-specific recommendations
        if simulation_type == SimulationType.EARLY_EVACUATION:
            recommendations.append("Maintain current early warning systems - they are effective")
        elif simulation_type == SimulationType.DELAYED_EVACUATION:
            recommendations.append("Invest in redundant communication systems to prevent delays")
        elif simulation_type == SimulationType.CASCADE_FAILURE:
            recommendations.append("Develop contingency plans for infrastructure cascade failures")

        return recommendations

    def get_simulation_history(self) -> List[Dict[str, Any]]:
        """Get list of all simulation results"""
        return [
            {
                "simulation_id": sim.simulation_id,
                "type": sim.simulation_type.value,
                "casualties": sim.total_casualties,
                "efficiency": sim.evacuation_efficiency,
                "timestamp": sim.simulation_id.split('_')[1]  # Extract timestamp from ID
            }
            for sim in self.simulation_history.values()
        ]

    def get_simulation_details(self, simulation_id: str) -> Optional[SimulationResult]:
        """Get detailed results for a specific simulation"""
        return self.simulation_history.get(simulation_id)

# Global simulator instance
simulator = DisasterSimulator()