import uuid
from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel, Field, ConfigDict


class VehicleBase(BaseModel):
    vin: str = Field(..., min_length=17, max_length=17, description="Vehicle Identification Number")
    name: str = Field(..., max_length=100, description="Vehicle display name")
    vehicle_type: str = Field("TRUCK", description="TRUCK, VAN, SUV, SEDAN, ELECTRIC_VAN")
    license_plate: str = Field(..., max_length=20, description="License plate number")
    fuel_capacity_liters: float = Field(80.0, ge=10.0, le=500.0, description="Total fuel tank capacity")
    health_status: str = Field("GOOD", description="GOOD, WARNING, CRITICAL")


class VehicleCreate(VehicleBase):
    assigned_driver_id: Optional[uuid.UUID] = Field(None, description="Assigned driver UUID")


class VehicleUpdate(BaseModel):
    name: Optional[str] = None
    vehicle_type: Optional[str] = None
    license_plate: Optional[str] = None
    status: Optional[str] = None
    fuel_capacity_liters: Optional[float] = None
    total_mileage_km: Optional[float] = None
    health_status: Optional[str] = None
    assigned_driver_id: Optional[uuid.UUID] = None


class VehicleRead(VehicleBase):
    id: uuid.UUID
    status: str
    total_mileage_km: float
    assigned_driver_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class VehicleStatusSummary(BaseModel):
    total_vehicles: int
    active_vehicles: int
    idle_vehicles: int
    maintenance_vehicles: int
    good_health_count: int
    warning_health_count: int
    critical_health_count: int
