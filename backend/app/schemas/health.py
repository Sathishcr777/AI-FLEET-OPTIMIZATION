from datetime import datetime
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field


class ServiceStatus(BaseModel):
    status: str = Field(..., description="Service status: healthy, degraded, or unreachable")
    latency_ms: Optional[float] = Field(None, description="Latency in milliseconds")
    details: Optional[str] = Field(None, description="Detailed diagnostic status message")


class HealthResponse(BaseModel):
    status: str = Field("healthy", description="Overall platform status")
    project: str = Field(..., description="Project name")
    version: str = Field("1.0.0", description="API version")
    environment: str = Field("development", description="Current deployment environment")
    timestamp: datetime = Field(..., description="Current server UTC timestamp")
    services: Dict[str, ServiceStatus] = Field(
        default_factory=dict,
        description="Individual status of core infrastructure services (Database, MQTT, etc.)",
    )
