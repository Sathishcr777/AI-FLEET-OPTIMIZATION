import asyncio
import logging
import uuid
from typing import Dict, List, Optional, Callable, Any

from backend.app.core.config import settings
from backend.app.schemas.scenario import (
    ScenarioType,
    ScenarioStatusResponse,
    VehicleScenarioState,
)
from backend.app.simulator.scenarios import SCENARIO_DEFINITIONS
from backend.app.simulator.vehicle_sim import SimulatedVehicle

logger = logging.getLogger("fleetiq.simulator")

# Seed Vehicles corresponding to init_db.sql
SEED_VEHICLE_CONFIGS = [
    {
        "id": uuid.UUID("22222222-2222-2222-2222-222222222201"),
        "name": "Alpha Fleet-01 (Freight Truck)",
        "type": "TRUCK",
        "mileage": 48250.0,
        "driver_id": uuid.UUID("11111111-1111-1111-1111-111111111101"),
        "route_offset": 0,
    },
    {
        "id": uuid.UUID("22222222-2222-2222-2222-222222222202"),
        "name": "Beta Fleet-02 (Cargo Van)",
        "type": "VAN",
        "mileage": 31400.0,
        "driver_id": uuid.UUID("11111111-1111-1111-1111-111111111102"),
        "route_offset": 2,
    },
    {
        "id": uuid.UUID("22222222-2222-2222-2222-222222222203"),
        "name": "Gamma Fleet-03 (Delivery Van)",
        "type": "VAN",
        "mileage": 19800.0,
        "driver_id": uuid.UUID("11111111-1111-1111-1111-111111111103"),
        "route_offset": 4,
    },
    {
        "id": uuid.UUID("22222222-2222-2222-2222-222222222204"),
        "name": "Delta Fleet-04 (Heavy Hauler)",
        "type": "TRUCK",
        "mileage": 89400.0,
        "driver_id": uuid.UUID("11111111-1111-1111-1111-111111111104"),
        "route_offset": 6,
    },
    {
        "id": uuid.UUID("22222222-2222-2222-2222-222222222205"),
        "name": "Epsilon Fleet-05 (Eco Transit)",
        "type": "ELECTRIC_VAN",
        "mileage": 12500.0,
        "driver_id": uuid.UUID("11111111-1111-1111-1111-111111111105"),
        "route_offset": 8,
    },
]


class SimulatorManager:
    """
    Orchestrates multiple simulated vehicles and coordinates real-time telemetry emission.
    """

    def __init__(self):
        self.vehicles: Dict[uuid.UUID, SimulatedVehicle] = {}
        self._is_running: bool = False
        self._task: Optional[asyncio.Task] = None
        self._listeners: List[Callable[[dict], Any]] = []

        # Initialize simulated vehicle pool
        self._init_vehicles()

    def _init_vehicles(self):
        self.vehicles.clear()
        for cfg in SEED_VEHICLE_CONFIGS:
            sim_v = SimulatedVehicle(
                vehicle_id=cfg["id"],
                name=cfg["name"],
                vehicle_type=cfg["type"],
                initial_mileage_km=cfg["mileage"],
                assigned_driver_id=cfg["driver_id"],
                route_offset=cfg["route_offset"],
            )
            self.vehicles[cfg["id"]] = sim_v

    def register_listener(self, callback: Callable[[dict], Any]):
        """Register a callback for generated telemetry packets."""
        self._listeners.append(callback)

    def trigger_scenario(
        self,
        vehicle_id: uuid.UUID,
        scenario_type: ScenarioType,
        duration_seconds: int = 30,
        custom_params: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """Trigger an operational or abnormal scenario on a target vehicle."""
        if vehicle_id in self.vehicles:
            self.vehicles[vehicle_id].trigger_scenario(
                scenario_type=scenario_type,
                duration_seconds=duration_seconds,
                custom_params=custom_params,
            )
            logger.info(f"Triggered scenario [{scenario_type.value}] on vehicle [{vehicle_id}] for {duration_seconds}s")
            return True
        return False

    def reset_all(self):
        """Reset all simulated vehicles to normal baseline operations."""
        for v in self.vehicles.values():
            v.reset_to_normal()
        logger.info("All simulated vehicles reset to normal operating baseline.")

    def get_status(self) -> ScenarioStatusResponse:
        """Retrieve current simulation state and active vehicle statuses."""
        active_list = []
        for v in self.vehicles.values():
            active_list.append(
                VehicleScenarioState(
                    vehicle_id=v.vehicle_id,
                    vehicle_name=v.name,
                    current_scenario=v.current_scenario,
                    is_active=v.is_scenario_active,
                    remaining_seconds=v.scenario_remaining_seconds,
                    current_speed=v.speed_kmh,
                    current_temp=v.engine_temp_c,
                    current_oil_pressure=v.oil_pressure_psi,
                )
            )

        return ScenarioStatusResponse(
            available_scenarios=list(SCENARIO_DEFINITIONS.values()),
            active_vehicles=active_list,
        )

    async def _simulation_loop(self):
        """Asynchronous background loop advancing physical vehicle states and emitting telemetry."""
        logger.info("Telemetry Simulator background loop started.")
        dt = settings.SIMULATOR_UPDATE_INTERVAL_SEC

        while self._is_running:
            try:
                for vehicle in list(self.vehicles.values()):
                    payload = vehicle.step(dt_seconds=dt)
                    payload_dict = payload.model_dump(mode="json")

                    # Dispatch packet to registered listeners (MQTT Publisher & Ingestion Pipeline)
                    for listener in self._listeners:
                        try:
                            if asyncio.iscoroutinefunction(listener):
                                await listener(payload_dict)
                            else:
                                listener(payload_dict)
                        except Exception as exc:
                            logger.error(f"Error dispatching telemetry listener: {exc}")

                await asyncio.sleep(dt)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Unexpected error in simulation loop: {e}")
                await asyncio.sleep(1.0)

        logger.info("Telemetry Simulator background loop terminated.")

    def start(self):
        """Start the background simulation task."""
        if not self._is_running:
            self._is_running = True
            self._task = asyncio.create_task(self._simulation_loop())

    def stop(self):
        """Stop the background simulation task."""
        self._is_running = False
        if self._task and not self._task.done():
            self._task.cancel()


# Global singleton instance
simulator_manager = SimulatorManager()
