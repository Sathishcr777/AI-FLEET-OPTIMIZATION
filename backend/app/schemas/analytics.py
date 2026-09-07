import uuid
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class DriverAnalyticsResponse(BaseModel):
    driver_id: str
    safety_score: float = Field(..., ge=0.0, le=100.0)
    risk_level: str
    harsh_braking_events: int = 0
    rapid_acceleration_events: int = 0
    speeding_events: int = 0
    excessive_idle_events: int = 0
    total_observations: int = 0
    summary: str

    model_config = ConfigDict(from_attributes=True)


class SafetyScoreResponse(BaseModel):
    driver_id: str
    safety_score: float = Field(..., ge=0.0, le=100.0)
    risk_level: str
    summary: str

    model_config = ConfigDict(from_attributes=True)


class AnomalyRecordResponse(BaseModel):
    vehicle_id: str
    timestamp: str
    metric_name: str
    metric_value: float
    expected_range: str
    anomaly_score: float
    anomaly_reason: str
    subsystem: str
    status: str


class AnomalyListResponse(BaseModel):
    vehicle_id: Optional[str] = None
    anomalies: List[AnomalyRecordResponse] = []


class VehicleHealthResponse(BaseModel):
    vehicle_id: str
    health_score: float = Field(..., ge=0.0, le=100.0)
    status: str
    risk_factors: List[str] = []
    summary: str


class MaintenancePredictionResponse(BaseModel):
    vehicle_id: str
    risk_score: float = Field(..., ge=0.0, le=100.0)
    risk_level: str
    recommendation: str
    estimated_rul_km: int
    contributing_factors: List[Dict[str, Any]] = []
