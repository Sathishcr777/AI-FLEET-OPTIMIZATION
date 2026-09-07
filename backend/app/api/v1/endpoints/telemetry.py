import uuid
import logging
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.models.telemetry import Telemetry
from backend.app.models.vehicle import Vehicle
from backend.app.schemas.telemetry import (
    TelemetryPayload,
    TelemetryRead,
    TelemetryHistoryResponse,
    LatestTelemetryMap,
)
from backend.app.services.ingestion import ingestion_service
from backend.app.simulator.simulator_manager import simulator_manager

logger = logging.getLogger("fleetiq.telemetry_api")
router = APIRouter()


@router.get("/latest", response_model=List[LatestTelemetryMap], summary="Get Latest Telemetry Map For All Vehicles")
async def get_latest_fleet_telemetry(db: AsyncSession = Depends(get_db)):
    """
    Returns the real-time location, speed, fuel, temperature, and health indicators
    for all vehicles. Combines vehicle metadata with sub-second in-memory telemetry stream.
    Gracefully falls back to simulated vehicle pool if database is offline.
    """
    fleet_map = []
    latest_cache = ingestion_service.get_all_latest()
    vehicles = []

    try:
        query = select(Vehicle).options(selectinload(Vehicle.assigned_driver))
        result = await db.execute(query)
        vehicles = result.scalars().all()
    except Exception as exc:
        logger.debug(f"Database query in telemetry/latest deferred (falling back to simulator pool): {exc}")
        vehicles = []

    if vehicles:
        for v in vehicles:
            cached_packet = latest_cache.get(v.id)
            if cached_packet:
                fleet_map.append(
                    LatestTelemetryMap(
                        vehicle_id=v.id,
                        vehicle_name=v.name,
                        vehicle_type=v.vehicle_type,
                        license_plate=v.license_plate,
                        status=v.status,
                        health_status=v.health_status,
                        driver_name=v.assigned_driver.name if v.assigned_driver else None,
                        latitude=cached_packet.latitude,
                        longitude=cached_packet.longitude,
                        speed=cached_packet.speed,
                        rpm=cached_packet.rpm,
                        fuel_level_pct=cached_packet.fuel_level_pct,
                        engine_temp_c=cached_packet.engine_temp_c,
                        oil_pressure_psi=cached_packet.oil_pressure_psi,
                        tire_pressure_psi=cached_packet.tire_pressure_psi,
                        battery_voltage=cached_packet.battery_voltage,
                        odometer_km=cached_packet.odometer_km,
                        is_anomaly=cached_packet.is_anomaly,
                        last_updated=cached_packet.time,
                    )
                )
            else:
                fleet_map.append(
                    LatestTelemetryMap(
                        vehicle_id=v.id,
                        vehicle_name=v.name,
                        vehicle_type=v.vehicle_type,
                        license_plate=v.license_plate,
                        status=v.status,
                        health_status=v.health_status,
                        driver_name=v.assigned_driver.name if v.assigned_driver else None,
                        latitude=37.7749,
                        longitude=-122.4194,
                        speed=0.0,
                        rpm=0.0,
                        fuel_level_pct=80.0,
                        engine_temp_c=90.0,
                        oil_pressure_psi=45.0,
                        tire_pressure_psi=34.0,
                        battery_voltage=12.6,
                        odometer_km=v.total_mileage_km,
                        is_anomaly=False,
                        last_updated=datetime.now(timezone.utc),
                    )
                )
    else:
        # Fallback to simulated vehicle pool
        sim_status = simulator_manager.get_status()
        for v_state in sim_status.active_vehicles:
            cached_packet = latest_cache.get(v_state.vehicle_id)
            if cached_packet:
                fleet_map.append(
                    LatestTelemetryMap(
                        vehicle_id=v_state.vehicle_id,
                        vehicle_name=v_state.vehicle_name,
                        vehicle_type="TRUCK",
                        license_plate="SIM-FL",
                        status="ACTIVE",
                        health_status="GOOD",
                        driver_name=None,
                        latitude=cached_packet.latitude,
                        longitude=cached_packet.longitude,
                        speed=cached_packet.speed,
                        rpm=cached_packet.rpm,
                        fuel_level_pct=cached_packet.fuel_level_pct,
                        engine_temp_c=cached_packet.engine_temp_c,
                        oil_pressure_psi=cached_packet.oil_pressure_psi,
                        tire_pressure_psi=cached_packet.tire_pressure_psi,
                        battery_voltage=cached_packet.battery_voltage,
                        odometer_km=cached_packet.odometer_km,
                        is_anomaly=cached_packet.is_anomaly,
                        last_updated=cached_packet.time,
                    )
                )

    return fleet_map


@router.get("/latest/{vehicle_id}", response_model=TelemetryRead, summary="Get Latest Telemetry For Single Vehicle")
async def get_latest_vehicle_telemetry(vehicle_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Retrieve the most recent telemetry packet for a specific vehicle."""
    cached = ingestion_service.get_latest_for_vehicle(vehicle_id)
    if cached:
        return cached

    # Query latest from database if DB is online
    try:
        query = (
            select(Telemetry)
            .where(Telemetry.vehicle_id == vehicle_id)
            .order_by(Telemetry.time.desc())
            .limit(1)
        )
        result = await db.execute(query)
        record = result.scalars().first()
        if record:
            return record
    except Exception as exc:
        logger.debug(f"Database query failed in telemetry/latest/{vehicle_id}: {exc}")

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"No telemetry records found for vehicle {vehicle_id}",
    )


@router.get("/history/{vehicle_id}", response_model=TelemetryHistoryResponse, summary="Query Telemetry Time-Series History")
async def get_telemetry_history(
    vehicle_id: uuid.UUID,
    limit: int = Query(100, ge=1, le=1000, description="Max number of historical points"),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve historical time-series telemetry records for charts and playback."""
    records = []
    try:
        query = (
            select(Telemetry)
            .where(Telemetry.vehicle_id == vehicle_id)
            .order_by(Telemetry.time.desc())
            .limit(limit)
        )
        result = await db.execute(query)
        records = result.scalars().all()
    except Exception as exc:
        logger.debug(f"Database query failed in telemetry/history: {exc}")

    # The ingestion service keeps a bounded real-time history ring buffer in memory.
    # Use it as a fallback when PostgreSQL has not accumulated records yet (or is offline),
    # so analytics and vehicle inspection render full time-series data while the live stream is healthy.
    if not records:
        mem_history = ingestion_service.get_history_for_vehicle(vehicle_id, limit)
        if mem_history:
            return TelemetryHistoryResponse(
                vehicle_id=vehicle_id,
                total_records=len(mem_history),
                data=mem_history,
            )
        cached = ingestion_service.get_latest_for_vehicle(vehicle_id)
        if cached:
            return TelemetryHistoryResponse(
                vehicle_id=vehicle_id,
                total_records=1,
                data=[cached],
            )

    return TelemetryHistoryResponse(
        vehicle_id=vehicle_id,
        total_records=len(records),
        data=list(reversed(records)),  # Chronological order
    )


@router.post("/ingest", status_code=status.HTTP_202_ACCEPTED, summary="HTTP Telemetry Ingestion Endpoint")
async def ingest_telemetry_http(payload: TelemetryPayload):
    """
    Direct HTTP ingestion endpoint for telemetry packets (supports HTTP gateways or fallback testing).
    """
    await ingestion_service.process_telemetry(payload.model_dump(mode="json"))
    return {"status": "accepted", "vehicle_id": str(payload.vehicle_id), "timestamp": payload.time}
