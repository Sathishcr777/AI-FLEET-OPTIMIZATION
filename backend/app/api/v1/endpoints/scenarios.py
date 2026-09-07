from fastapi import APIRouter, HTTPException, status

from backend.app.schemas.scenario import (
    ScenarioTriggerRequest,
    ScenarioStatusResponse,
)
from backend.app.simulator.simulator_manager import simulator_manager
from backend.app.core.websocket_manager import ws_manager

router = APIRouter()


@router.get("", response_model=ScenarioStatusResponse, summary="List Simulation Scenarios & Vehicle States")
async def get_simulation_status():
    """
    Retrieve all 10 available simulation scenarios alongside active vehicle states
    and remaining scenario durations.
    """
    return simulator_manager.get_status()


@router.post("/trigger", summary="Trigger Scenario on Target Vehicle")
async def trigger_scenario(request: ScenarioTriggerRequest):
    """
    Inject an operational or abnormal scenario (e.g. ENGINE_OVERHEAT, HARSH_BRAKE, OVERSPEEDING)
    into a target vehicle's live telemetry stream.
    """
    success = simulator_manager.trigger_scenario(
        vehicle_id=request.vehicle_id,
        scenario_type=request.scenario,
        duration_seconds=request.duration_seconds or 30,
        custom_params=request.custom_params,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Simulated vehicle with ID {request.vehicle_id} not found in simulator pool",
        )

    # Broadcast scenario event to WebSocket clients
    await ws_manager.broadcast_scenario_event({
        "event": "SCENARIO_TRIGGERED",
        "vehicle_id": str(request.vehicle_id),
        "scenario": request.scenario.value,
        "duration_seconds": request.duration_seconds,
    })

    return {
        "status": "success",
        "message": f"Scenario '{request.scenario.value}' activated on vehicle {request.vehicle_id} for {request.duration_seconds}s",
        "vehicle_id": str(request.vehicle_id),
        "scenario": request.scenario.value,
        "duration_seconds": request.duration_seconds,
    }


@router.post("/reset", summary="Reset All Vehicles to Normal State")
async def reset_scenarios():
    """Reset all active vehicles back to normal operating cruising conditions."""
    simulator_manager.reset_all()

    # Broadcast reset to WebSocket clients
    await ws_manager.broadcast_scenario_event({
        "event": "SCENARIOS_RESET",
        "message": "All vehicles reset to normal operating baseline",
    })

    return {
        "status": "success",
        "message": "All simulated vehicles reset to normal highway/urban baseline",
    }
