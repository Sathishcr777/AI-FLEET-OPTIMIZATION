import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


class TelemetryPayload(BaseModel):
    vehicle_id: uuid.UUID = Field(..., description="Vehicle UUID")
    trip_id: Optional[uuid.UUID] = Field(None, description="Active trip UUID")
    time: datetime = Field(..., description="Timestamp of telemetry capture")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="GPS latitude")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="GPS longitude")
    speed: float = Field(..., ge=0.0, le=250.0, description="Current speed in km/h")
    rpm: float = Field(..., ge=0.0, le=9000.0, description="Engine revolutions per minute")
    fuel_level_pct: float = Field(..., ge=0.0, le=100.0, description="Fuel level percentage (0-100%)")
    engine_temp_c: float = Field(..., ge=-50.0, le=250.0, description="Engine coolant temperature in °C")
    oil_pressure_psi: float = Field(..., ge=0.0, le=120.0, description="Engine oil pressure in PSI")
    tire_pressure_psi: float = Field(..., ge=0.0, le=100.0, description="Average tire pressure in PSI")
    battery_voltage: float = Field(..., ge=6.0, le=24.0, description="Electrical battery voltage in Volts")
    odometer_km: float = Field(..., ge=0.0, description="Cumulative vehicle odometer in km")
    is_anomaly: bool = Field(False, description="Flag indicating detected sensor or physical anomaly")


class TelemetryRead(TelemetryPayload):
    model_config = ConfigDict(from_attributes=True)


class LatestTelemetryMap(BaseModel):
    vehicle_id: uuid.UUID
    vehicle_name: str
    vehicle_type: str
    license_plate: str
    status: str
    health_status: str
    driver_name: Optional[str] = None
    latitude: float
    longitude: float
    speed: float
    rpm: float
    fuel_level_pct: float
    engine_temp_c: float
    oil_pressure_psi: float
    tire_pressure_psi: float
    battery_voltage: float
    odometer_km: float
    is_anomaly: bool
    last_updated: datetime


class TelemetryHistoryResponse(BaseModel):
    vehicle_id: uuid.UUID
    total_records: int
    data: List[TelemetryRead]
