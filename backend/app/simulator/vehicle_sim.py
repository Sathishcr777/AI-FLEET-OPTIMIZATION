import math
import random
import uuid
from datetime import datetime, timezone
from typing import List, Tuple, Optional, Dict, Any

from backend.app.schemas.telemetry import TelemetryPayload
from backend.app.schemas.scenario import ScenarioType


# Standard delivery loop waypoints (San Francisco / Bay Area loop)
DEFAULT_ROUTE_WAYPOINTS: List[Tuple[float, float]] = [
    (37.7749, -122.4194),  # Downtown Hub
    (37.7833, -122.4167),  # North Market
    (37.7955, -122.3937),  # Embarcadero Port
    (37.8024, -122.4058),  # Fisherman's Wharf
    (37.7989, -122.4367),  # Marina District
    (37.7812, -122.4467),  # Presidio South
    (37.7699, -122.4469),  # Haight-Ashbury
    (37.7599, -122.4148),  # Mission District
    (37.7485, -122.3878),  # Bayview Industrial Hub
    (37.7600, -122.3900),  # Dogpatch Depot
]


class SimulatedVehicle:
    """
    Simulates the physical dynamics, GPS position, and sensor telemetry
    for a single fleet vehicle across normal and injected abnormal scenarios.
    """

    def __init__(
        self,
        vehicle_id: uuid.UUID,
        name: str,
        vehicle_type: str = "TRUCK",
        initial_mileage_km: float = 25000.0,
        assigned_driver_id: Optional[uuid.UUID] = None,
        active_trip_id: Optional[uuid.UUID] = None,
        route_offset: int = 0,
    ):
        self.vehicle_id = vehicle_id
        self.name = name
        self.vehicle_type = vehicle_type
        self.assigned_driver_id = assigned_driver_id
        self.active_trip_id = active_trip_id or uuid.uuid4()

        # GPS Route state
        self.waypoints = DEFAULT_ROUTE_WAYPOINTS
        self.wp_index = route_offset % len(self.waypoints)
        self.current_lat = self.waypoints[self.wp_index][0] + (random.random() - 0.5) * 0.002
        self.current_lon = self.waypoints[self.wp_index][1] + (random.random() - 0.5) * 0.002
        self.target_wp_index = (self.wp_index + 1) % len(self.waypoints)

        # Vehicle physical metrics
        self.speed_kmh: float = 65.0
        self.target_speed_kmh: float = 65.0
        self.rpm: float = 2000.0
        self.fuel_level_pct: float = 85.0 - (route_offset * 4.0)
        self.engine_temp_c: float = 90.0
        self.oil_pressure_psi: float = 45.0
        self.tire_pressure_psi: float = 34.0
        self.battery_voltage: float = 12.6
        self.odometer_km: float = initial_mileage_km

        # Scenario Management
        self.current_scenario: ScenarioType = ScenarioType.NORMAL_URBAN if (route_offset % 2 == 0) else ScenarioType.NORMAL_HIGHWAY
        self.scenario_remaining_seconds: int = 0
        self.is_scenario_active: bool = False
        self.scenario_params: Dict[str, Any] = {}

    def trigger_scenario(self, scenario_type: ScenarioType, duration_seconds: int = 30, custom_params: Optional[Dict[str, Any]] = None):
        """Inject an operational or abnormal scenario into the vehicle state."""
        self.current_scenario = scenario_type
        self.scenario_remaining_seconds = duration_seconds
        self.is_scenario_active = True
        self.scenario_params = custom_params or {}

        # Reset unrealistic sensor glitch values when switching to another scenario
        if scenario_type != ScenarioType.SENSOR_GLITCH:
            if self.engine_temp_c < 60.0 or self.engine_temp_c > 140.0:
                self.engine_temp_c = 91.5
            if self.rpm < 600.0 or self.rpm > 6500.0:
                self.rpm = 2200.0
            if scenario_type == ScenarioType.NORMAL_HIGHWAY and self.speed_kmh < 70.0:
                self.speed_kmh = 76.0

    def reset_to_normal(self):
        """Reset vehicle back to standard normal operating behavior."""
        self.current_scenario = ScenarioType.NORMAL_HIGHWAY
        self.scenario_remaining_seconds = 0
        self.is_scenario_active = False
        self.scenario_params = {}
        self.engine_temp_c = 90.0
        self.oil_pressure_psi = 45.0
        self.tire_pressure_psi = 34.0

    def step(self, dt_seconds: float = 1.0) -> TelemetryPayload:
        """
        Advance vehicle physics by dt_seconds and return a validated TelemetryPayload.
        """
        # 1. Update Scenario Countdown
        if self.is_scenario_active:
            self.scenario_remaining_seconds -= int(math.ceil(dt_seconds))
            if self.scenario_remaining_seconds <= 0:
                self.reset_to_normal()

        # 2. Compute Physical Metrics based on Current Scenario
        is_anomaly_flag = False

        if self.current_scenario == ScenarioType.NORMAL_HIGHWAY:
            self.target_speed_kmh = 88.0 + random.uniform(-4.0, 4.0)
            self.engine_temp_c += (90.0 - self.engine_temp_c) * 0.1
            self.oil_pressure_psi += (46.0 - self.oil_pressure_psi) * 0.1
            self.tire_pressure_psi = 34.0 + random.uniform(-0.2, 0.2)

        elif self.current_scenario == ScenarioType.NORMAL_URBAN:
            self.target_speed_kmh = 42.0 + random.uniform(-8.0, 8.0)
            self.engine_temp_c += (92.0 - self.engine_temp_c) * 0.1
            self.oil_pressure_psi += (42.0 - self.oil_pressure_psi) * 0.1
            self.tire_pressure_psi = 34.0

        elif self.current_scenario == ScenarioType.HARSH_BRAKE:
            # Immediate severe deceleration
            self.target_speed_kmh = 0.0
            self.speed_kmh = max(0.0, self.speed_kmh - 22.0 * dt_seconds)
            self.rpm = max(800.0, self.rpm - 800.0 * dt_seconds)
            is_anomaly_flag = False  # Driver behavior event, not mechanical anomaly

        elif self.current_scenario == ScenarioType.RAPID_ACCEL:
            # Violent acceleration surge
            self.target_speed_kmh = 105.0
            self.speed_kmh = min(120.0, self.speed_kmh + 18.0 * dt_seconds)
            self.rpm = 4400.0 + random.uniform(-100.0, 200.0)

        elif self.current_scenario == ScenarioType.OVERSPEEDING:
            # High speed in urban/highway
            self.target_speed_kmh = 125.0
            self.speed_kmh += (self.target_speed_kmh - self.speed_kmh) * 0.3
            self.rpm = 3200.0 + random.uniform(-50.0, 50.0)

        elif self.current_scenario == ScenarioType.EXCESSIVE_IDLE:
            # Stationary vehicle with idling engine
            self.target_speed_kmh = 0.0
            self.speed_kmh = 0.0
            self.rpm = 780.0 + random.uniform(-10.0, 10.0)
            self.fuel_level_pct = max(0.0, self.fuel_level_pct - 0.02 * dt_seconds)

        elif self.current_scenario == ScenarioType.ENGINE_OVERHEAT:
            # Coolant temperature runaway
            self.target_speed_kmh = 60.0
            self.engine_temp_c = min(124.0, self.engine_temp_c + 1.2 * dt_seconds)
            self.oil_pressure_psi = max(22.0, self.oil_pressure_psi - 0.5 * dt_seconds)
            is_anomaly_flag = True

        elif self.current_scenario == ScenarioType.LOW_OIL_PRESSURE:
            # Sudden oil pressure loss under load
            self.target_speed_kmh = 70.0
            self.oil_pressure_psi = max(14.0, self.oil_pressure_psi - 2.5 * dt_seconds)
            is_anomaly_flag = True

        elif self.current_scenario == ScenarioType.COMPONENT_WEAR:
            # Uneven tire pressure, elevated temp
            self.target_speed_kmh = 55.0
            self.tire_pressure_psi = max(22.0, self.tire_pressure_psi - 0.2 * dt_seconds)
            self.engine_temp_c = 96.5 + random.uniform(-0.5, 0.5)

        elif self.current_scenario == ScenarioType.SENSOR_GLITCH:
            # Impossible erratic sensor values
            self.engine_temp_c = random.choice([-40.0, 215.0, 195.0])
            self.rpm = random.choice([0.0, 7200.0, 6800.0])
            is_anomaly_flag = True

        elif self.current_scenario == ScenarioType.MIXED_ABNORMAL:
            # Multi-subsystem abnormal condition: elevated temp, low oil, and fluctuating throttle
            self.target_speed_kmh = 75.0 + random.uniform(-15.0, 15.0)
            self.engine_temp_c = min(122.0, self.engine_temp_c + 1.5 * dt_seconds)
            self.oil_pressure_psi = max(16.0, self.oil_pressure_psi - 1.8 * dt_seconds)
            self.tire_pressure_psi = max(26.0, self.tire_pressure_psi - 0.1 * dt_seconds)
            self.rpm = 3600.0 + random.uniform(-300.0, 300.0)
            is_anomaly_flag = True

        # 3. Smooth speed transition if not harsh brake
        if self.current_scenario != ScenarioType.HARSH_BRAKE and self.current_scenario != ScenarioType.EXCESSIVE_IDLE:
            self.speed_kmh += (self.target_speed_kmh - self.speed_kmh) * min(1.0, 0.25 * dt_seconds)

        # Compute RPM proportional to speed (unless overridden by scenario)
        if self.current_scenario not in (ScenarioType.EXCESSIVE_IDLE, ScenarioType.RAPID_ACCEL, ScenarioType.SENSOR_GLITCH, ScenarioType.MIXED_ABNORMAL):
            gear_ratio = 32.0
            self.rpm = max(750.0, min(6000.0, self.speed_kmh * gear_ratio + random.uniform(-30.0, 30.0)))

        # 4. Advance GPS along route waypoints
        distance_traveled_km = (self.speed_kmh / 3600.0) * dt_seconds
        self.odometer_km += distance_traveled_km

        # Fuel consumption modeling
        consumption_factor = 0.0003 * (1.0 + (self.rpm / 3000.0) * 0.5)
        self.fuel_level_pct = max(0.0, self.fuel_level_pct - distance_traveled_km * consumption_factor * 100.0)

        # Move coordinates towards target waypoint
        target_lat, target_lon = self.waypoints[self.target_wp_index]
        d_lat = target_lat - self.current_lat
        d_lon = target_lon - self.current_lon
        distance_to_target = math.sqrt(d_lat**2 + d_lon**2)

        # If close to target waypoint, switch to next waypoint
        if distance_to_target < 0.001:
            self.wp_index = self.target_wp_index
            self.target_wp_index = (self.wp_index + 1) % len(self.waypoints)
        else:
            step_fraction = min(1.0, (distance_traveled_km / 111.0) / max(0.0001, distance_to_target))
            self.current_lat += d_lat * step_fraction
            self.current_lon += d_lon * step_fraction

        # Jitter coordinates slightly for realism
        noise = random.gauss(0, 0.00002)
        reported_lat = round(self.current_lat + noise, 6)
        reported_lon = round(self.current_lon + noise, 6)

        return TelemetryPayload(
            vehicle_id=self.vehicle_id,
            trip_id=self.active_trip_id,
            time=datetime.now(timezone.utc),
            latitude=reported_lat,
            longitude=reported_lon,
            speed=round(self.speed_kmh, 1),
            rpm=round(self.rpm, 0),
            fuel_level_pct=round(self.fuel_level_pct, 2),
            engine_temp_c=round(self.engine_temp_c, 1),
            oil_pressure_psi=round(self.oil_pressure_psi, 1),
            tire_pressure_psi=round(self.tire_pressure_psi, 1),
            battery_voltage=round(self.battery_voltage + random.uniform(-0.1, 0.1), 2),
            odometer_km=round(self.odometer_km, 2),
            is_anomaly=is_anomaly_flag,
        )
