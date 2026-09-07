import uuid
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class ScenarioType(str, Enum):
    NORMAL_HIGHWAY = "NORMAL_HIGHWAY"
    NORMAL_URBAN = "NORMAL_URBAN"
    HARSH_BRAKE = "HARSH_BRAKE"
    RAPID_ACCEL = "RAPID_ACCEL"
    OVERSPEEDING = "OVERSPEEDING"
    EXCESSIVE_IDLE = "EXCESSIVE_IDLE"
    ENGINE_OVERHEAT = "ENGINE_OVERHEAT"
    LOW_OIL_PRESSURE = "LOW_OIL_PRESSURE"
    COMPONENT_WEAR = "COMPONENT_WEAR"
    SENSOR_GLITCH = "SENSOR_GLITCH"
    MIXED_ABNORMAL = "MIXED_ABNORMAL"


class ScenarioTriggerRequest(BaseModel):
    vehicle_id: uuid.UUID = Field(..., description="Target vehicle UUID to inject the scenario")
    scenario: ScenarioType = Field(..., description="Scenario type to activate")
    duration_seconds: Optional[int] = Field(30, ge=5, le=300, description="Duration in seconds before returning to normal")
    custom_params: Optional[Dict[str, Any]] = Field(default=None, description="Optional override parameters")


class ScenarioInfo(BaseModel):
    name: str
    scenario_type: ScenarioType
    description: str
    target_behavior: str
    expected_ai_output: str


class VehicleScenarioState(BaseModel):
    vehicle_id: uuid.UUID
    vehicle_name: str
    current_scenario: ScenarioType
    is_active: bool
    remaining_seconds: int
    current_speed: float
    current_temp: float
    current_oil_pressure: float


class ScenarioStatusResponse(BaseModel):
    available_scenarios: List[ScenarioInfo]
    active_vehicles: List[VehicleScenarioState]
