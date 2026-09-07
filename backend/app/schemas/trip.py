import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class TripBase(BaseModel):
    vehicle_id: uuid.UUID = Field(..., description="Operating vehicle UUID")
    driver_id: uuid.UUID = Field(..., description="Assigned driver UUID")
    start_location: str = Field(..., max_length=255, description="Trip departure origin")
    end_location: Optional[str] = Field(None, max_length=255, description="Trip destination")
    status: str = Field("IN_PROGRESS", description="PLANNED, IN_PROGRESS, COMPLETED, CANCELLED")


class TripCreate(TripBase):
    pass


class TripUpdate(BaseModel):
    end_location: Optional[str] = None
    end_time: Optional[datetime] = None
    distance_km: Optional[float] = None
    duration_minutes: Optional[float] = None
    avg_speed_kmh: Optional[float] = None
    fuel_consumed_liters: Optional[float] = None
    status: Optional[str] = None


class TripRead(TripBase):
    id: uuid.UUID
    start_time: datetime
    end_time: Optional[datetime] = None
    distance_km: float
    duration_minutes: float
    avg_speed_kmh: float
    fuel_consumed_liters: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
