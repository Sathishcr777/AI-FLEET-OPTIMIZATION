import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.core.config import settings
from backend.app.api.v1.api import api_router
from backend.app.simulator.simulator_manager import simulator_manager
from backend.app.services.mqtt_client import mqtt_service
from backend.app.services.ingestion import ingestion_service

logger = logging.getLogger("fleetiq.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan event handler for backend startup and graceful shutdown.
    Coordinates MQTT broker connection, ingestion batch workers, and telemetry simulation.
    """
    print(f">> Starting {settings.PROJECT_NAME} in [{settings.ENVIRONMENT}] mode...")
    print(f">> API Prefix: {settings.API_V1_STR}")
    print(f">> Database Target: {settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}")

    # 1. Wire Simulator outputs to MQTT publisher and Ingestion Service
    simulator_manager.register_listener(
        lambda payload: mqtt_service.publish_telemetry(str(payload["vehicle_id"]), payload)
    )
    simulator_manager.register_listener(ingestion_service.process_telemetry)

    # 2. Wire MQTT incoming messages to Ingestion Service
    mqtt_service.set_message_callback(
        lambda topic, data: ingestion_service.process_telemetry(data)
    )

    # 3. Start background services
    mqtt_service.start()
    ingestion_service.start()
    simulator_manager.start()

    yield

    # Shutdown actions
    print(f">> Shutting down {settings.PROJECT_NAME} background services...")
    simulator_manager.stop()
    ingestion_service.stop()
    mqtt_service.stop()
    print(">> All background services gracefully stopped.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    description=(
        "FleetIQ Backend API – AI-Powered Fleet Intelligence & Optimization Platform. "
        "Provides real-time telemetry streaming, predictive maintenance scoring, anomaly detection, "
        "driver safety analytics, and algorithmic route optimization."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# Configure Cross-Origin Resource Sharing (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include v1 API routes
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", summary="Root Platform Information")
async def root_info() -> JSONResponse:
    """Root platform metadata endpoint."""
    return JSONResponse(
        content={
            "platform": settings.PROJECT_NAME,
            "version": "1.0.0",
            "status": "online",
            "docs_url": f"{settings.API_V1_STR}/docs",
            "health_check_url": f"{settings.API_V1_STR}/health",
            "simulator_status_url": f"{settings.API_V1_STR}/scenarios",
            "telemetry_stream_ws": f"{settings.API_V1_STR}/ws/telemetry",
        }
    )
