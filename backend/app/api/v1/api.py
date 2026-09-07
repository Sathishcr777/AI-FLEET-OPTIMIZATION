from fastapi import APIRouter
from backend.app.api.v1.endpoints import (
    analytics,
    alerts,
    routes,
    health,
    vehicles,
    drivers,
    trips,
    telemetry,
    scenarios,
    ws,
)

api_router = APIRouter()

# Register core platform endpoints
api_router.include_router(health.router, prefix="/health", tags=["Health & System Status"])
api_router.include_router(vehicles.router, prefix="/vehicles", tags=["Fleet Vehicles"])
api_router.include_router(drivers.router, prefix="/drivers", tags=["Fleet Drivers"])
api_router.include_router(trips.router, prefix="/trips", tags=["Fleet Trips"])
api_router.include_router(telemetry.router, prefix="/telemetry", tags=["Real-Time Telemetry"])
api_router.include_router(scenarios.router, prefix="/scenarios", tags=["Telemetry Simulator & Scenarios"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["AI Analytics & Intelligence"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["Intelligent Alerts & Triage"])
api_router.include_router(routes.router, prefix="/routes", tags=["Route Optimization & TSP"])
api_router.include_router(ws.router, prefix="/ws", tags=["WebSocket Live Streaming"])

