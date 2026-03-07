from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from app.services.simulation import simulator, SimulationType

router = APIRouter(prefix="/simulation", tags=["simulation"])

@router.post("/run")
def run_simulation(
    disaster_type: str,
    severity: float,
    population_affected: int,
    available_resources: int,
    evacuation_routes: int,
    shelters_capacity: int,
    simulation_type: SimulationType = SimulationType.EARLY_EVACUATION
):
    """
    Run a disaster response simulation
    """
    try:
        result = simulator.simulate_scenario(
            disaster_type=disaster_type,
            severity=severity,
            population_affected=population_affected,
            available_resources=available_resources,
            evacuation_routes=evacuation_routes,
            shelters_capacity=shelters_capacity,
            simulation_type=simulation_type
        )

        return {
            "simulation_id": result.simulation_id,
            "simulation_type": result.simulation_type.value,
            "duration_hours": result.duration_hours,
            "total_casualties": result.total_casualties,
            "evacuation_efficiency": result.evacuation_efficiency,
            "resource_utilization": result.resource_utilization,
            "response_time_avg": result.response_time_avg,
            "bottlenecks": result.bottlenecks,
            "recommendations": result.recommendations,
            "timeline": result.timeline
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation error: {str(e)}")

@router.get("/history")
def get_simulation_history():
    """
    Get history of all simulations
    """
    return {"simulations": simulator.get_simulation_history()}

@router.get("/details/{simulation_id}")
def get_simulation_details(simulation_id: str):
    """
    Get detailed results for a specific simulation
    """
    result = simulator.get_simulation_details(simulation_id)
    if not result:
        raise HTTPException(status_code=404, detail="Simulation not found")

    return {
        "simulation_id": result.simulation_id,
        "simulation_type": result.simulation_type.value,
        "duration_hours": result.duration_hours,
        "total_casualties": result.total_casualties,
        "evacuation_efficiency": result.evacuation_efficiency,
        "resource_utilization": result.resource_utilization,
        "response_time_avg": result.response_time_avg,
        "bottlenecks": result.bottlenecks,
        "recommendations": result.recommendations,
        "timeline": result.timeline
    }