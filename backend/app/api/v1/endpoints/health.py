import asyncio
import time
import socket
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.schemas.health import HealthResponse, ServiceStatus

router = APIRouter()


def check_tcp_port(host: str, port: int, timeout_sec: float = 0.5) -> tuple[bool, float, str]:
    """Test TCP socket reachability for dependent services (e.g. MQTT Broker)."""
    start_time = time.perf_counter()
    try:
        with socket.create_connection((host, port), timeout=timeout_sec):
            elapsed_ms = (time.perf_counter() - start_time) * 1000.0
            return True, elapsed_ms, "Connected successfully"
    except Exception as exc:
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        return False, elapsed_ms, f"Unreachable: {str(exc)}"


@router.get("", response_model=HealthResponse, summary="System Health & Connectivity Check")
async def get_health_status(db: AsyncSession = Depends(get_db)) -> HealthResponse:
    """
    Comprehensive system health check endpoint.
    Verifies API server readiness, database connectivity, and MQTT broker reachability.
    """
    services_status = {}
    overall_healthy = True

    # 1. Check PostgreSQL / TimescaleDB
    db_start = time.perf_counter()
    try:
        result = await asyncio.wait_for(db.execute(text("SELECT 1")), timeout=0.5)
        result.scalar()
        db_latency = (time.perf_counter() - db_start) * 1000.0
        services_status["database"] = ServiceStatus(
            status="healthy",
            latency_ms=round(db_latency, 2),
            details="PostgreSQL / TimescaleDB query executed successfully",
        )
    except Exception as exc:
        overall_healthy = False
        db_latency = (time.perf_counter() - db_start) * 1000.0
        services_status["database"] = ServiceStatus(
            status="unreachable",
            latency_ms=round(db_latency, 2),
            details=f"Database connection failed: {str(exc)}",
        )

    # 2. Check MQTT Mosquitto Broker TCP Port
    mqtt_reachable, mqtt_latency, mqtt_msg = check_tcp_port(
        settings.MQTT_BROKER_HOST,
        settings.MQTT_BROKER_PORT,
    )
    if mqtt_reachable:
        services_status["mqtt_broker"] = ServiceStatus(
            status="healthy",
            latency_ms=round(mqtt_latency, 2),
            details=f"Mosquitto broker reachable on port {settings.MQTT_BROKER_PORT}",
        )
    else:
        # For local testing before docker-compose is started, report as degraded/offline
        services_status["mqtt_broker"] = ServiceStatus(
            status="offline",
            latency_ms=round(mqtt_latency, 2),
            details=mqtt_msg,
        )

    return HealthResponse(
        status="healthy" if overall_healthy else "degraded",
        project=settings.PROJECT_NAME,
        version="1.0.0",
        environment=settings.ENVIRONMENT,
        timestamp=datetime.now(timezone.utc),
        services=services_status,
    )
