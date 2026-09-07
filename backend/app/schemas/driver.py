import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class DriverBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Driver full name")
    license_number: str = Field(..., max_length=50, description="Driver commercial license number")
    phone: Optional[str] = Field(None, max_length=20, description="Contact phone number")
    status: str = Field("ACTIVE", description="ACTIVE, ON_LEAVE, INACTIVE")


class DriverCreate(DriverBase):
    pass


class DriverUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[str] = None
    overall_safety_score: Optional[float] = Field(None, ge=0.0, le=100.0)
    total_trips: Optional[int] = None
    total_distance_km: Optional[float] = None


class DriverRead(DriverBase):
    id: uuid.UUID
    overall_safety_score: float
    total_trips: int
    total_distance_km: float
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
