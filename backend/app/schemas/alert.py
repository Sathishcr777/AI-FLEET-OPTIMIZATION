import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class AlertSeverity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"
    WARNING = "WARNING"


class AlertStatus(str, Enum):
    ACTIVE = "ACTIVE"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    RESOLVED = "RESOLVED"


class AlertType(str, Enum):
    ENGINE_OVERHEAT = "ENGINE_OVERHEAT"
    LOW_OIL_PRESSURE = "LOW_OIL_PRESSURE"
    LOW_TIRE_PRESSURE = "LOW_TIRE_PRESSURE"
    BATTERY_VOLTAGE = "BATTERY_VOLTAGE"
    OVERSPEEDING = "OVERSPEEDING"
    HARSH_BRAKE = "HARSH_BRAKE"
    RAPID_ACCEL = "RAPID_ACCEL"
    EXCESSIVE_IDLE = "EXCESSIVE_IDLE"
    SENSOR_GLITCH = "SENSOR_GLITCH"
    TELEMETRY_ANOMALY = "TELEMETRY_ANOMALY"
    HIGH_VEHICLE_HEALTH_RISK = "HIGH_VEHICLE_HEALTH_RISK"
    HIGH_MAINTENANCE_RISK = "HIGH_MAINTENANCE_RISK"
    CRITICAL_MAINTENANCE_RISK = "CRITICAL_MAINTENANCE_RISK"
    MAINTENANCE_RISK = "MAINTENANCE_RISK"
    CRITICAL_HEALTH = "CRITICAL_HEALTH"
    DRIVER_SAFETY = "DRIVER_SAFETY"
    GENERAL = "GENERAL"


class AlertBase(BaseModel):
    vehicle_id: uuid.UUID
    driver_id: Optional[uuid.UUID] = None
    alert_type: str
    severity: str = "INFO"
    status: str = "ACTIVE"
    title: str = Field(..., max_length=200)
    message: str
    metric_name: Optional[str] = None
    metric_value: Optional[float] = None
    threshold_value: Optional[str] = None
    confidence_score: Optional[float] = None
    recommended_action: Optional[str] = None


class AlertCreate(AlertBase):
    timestamp: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))


class AlertUpdate(BaseModel):
    status: Optional[str] = None
    is_acknowledged: Optional[bool] = None
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    recommended_action: Optional[str] = None


class AlertAcknowledgeRequest(BaseModel):
    acknowledged_by: Optional[str] = "Fleet Manager"
    notes: Optional[str] = None


class AlertResolveRequest(BaseModel):
    resolution_notes: Optional[str] = None
    resolved_by: Optional[str] = "Fleet Technician"


class AlertRead(AlertBase):
    id: uuid.UUID
    timestamp: datetime
    is_acknowledged: bool
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AlertSummaryCounts(BaseModel):
    total: int = 0
    active: int = 0
    acknowledged: int = 0
    resolved: int = 0
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0


class AlertListResponse(BaseModel):
    summary: AlertSummaryCounts
    alerts: List[AlertRead]
