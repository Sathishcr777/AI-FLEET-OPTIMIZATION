import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.models.driver import Driver
from backend.app.models.telemetry import Telemetry
from backend.app.models.vehicle import Vehicle
from backend.app.schemas.analytics import (
    AnomalyListResponse,
    DriverAnalyticsResponse,
    MaintenancePredictionResponse,
    SafetyScoreResponse,
    VehicleHealthResponse,
)
from backend.app.services.analytics import (
    analyze_driver_behavior,
    assess_vehicle_health,
    detect_telemetry_anomalies,
    load_latest_telemetry_for_driver,
    load_latest_telemetry_for_vehicle,
    persist_anomaly_records,
    persist_driver_behavior_analysis,
    persist_prediction_record,
    predict_maintenance,
)

router = APIRouter()


@router.get("/drivers/{driver_id}", response_model=DriverAnalyticsResponse, summary="Get Driver Behavior Analytics")
async def get_driver_analytics(driver_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    driver = await db.get(Driver, driver_id)
    if not driver:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Driver {driver_id} not found")

    telemetry = await load_latest_telemetry_for_driver(db, driver_id)
    analysis = analyze_driver_behavior(driver_id, telemetry)
    if telemetry:
        await persist_driver_behavior_analysis(db, driver_id, analysis)
        await db.commit()
    return DriverAnalyticsResponse(**analysis)


@router.get("/drivers/{driver_id}/safety", response_model=SafetyScoreResponse, summary="Get Driver Safety Score")
async def get_driver_safety_score(driver_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    driver = await db.get(Driver, driver_id)
    if not driver:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Driver {driver_id} not found")

    telemetry = await load_latest_telemetry_for_driver(db, driver_id)
    analysis = analyze_driver_behavior(driver_id, telemetry)
    if telemetry:
        await persist_driver_behavior_analysis(db, driver_id, analysis)
        await db.commit()
    return SafetyScoreResponse(
        driver_id=analysis["driver_id"],
        safety_score=analysis["safety_score"],
        risk_level=analysis["risk_level"],
        summary=analysis["summary"],
    )


@router.get("/telemetry/anomalies", response_model=AnomalyListResponse, summary="List Telemetry Anomalies")
async def get_telemetry_anomalies(
    vehicle_id: Optional[uuid.UUID] = Query(None, description="Filter anomalies for a specific vehicle"),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    from backend.app.services.ingestion import ingestion_service

    if vehicle_id:
        vehicle = await db.get(Vehicle, vehicle_id)
        if not vehicle:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Vehicle {vehicle_id} not found")
        telemetry = await load_latest_telemetry_for_vehicle(db, vehicle_id)
    else:
        telemetry = []
        try:
            result = await db.execute(select(Telemetry).order_by(Telemetry.time.desc()).limit(limit))
            telemetry = list(result.scalars().all())
        except Exception:
            telemetry = []

        cached_map = ingestion_service.get_all_latest()
        if cached_map:
            existing_keys = {
                (
                    t.time.replace(tzinfo=timezone.utc) if getattr(t, "time", None) and getattr(t, "time").tzinfo is None else getattr(t, "time", None),
                    getattr(t, "vehicle_id", None),
                )
                for t in telemetry if hasattr(t, "vehicle_id")
            }
            for cached_payload in cached_map.values():
                c_time = cached_payload.time.replace(tzinfo=timezone.utc) if cached_payload.time.tzinfo is None else cached_payload.time
                if (c_time, cached_payload.vehicle_id) not in existing_keys:
                    telemetry.append(cached_payload)

    anomalies = detect_telemetry_anomalies(telemetry)
    if anomalies:
        try:
            await persist_anomaly_records(db, anomalies[:limit])
            await db.commit()
        except Exception:
            await db.rollback()

    return AnomalyListResponse(
        vehicle_id=str(vehicle_id) if vehicle_id else None,
        anomalies=anomalies[:limit],
    )


@router.get("/vehicles/{vehicle_id}/health", response_model=VehicleHealthResponse, summary="Get Vehicle Health Metric")
async def get_vehicle_health(vehicle_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    vehicle = await db.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Vehicle {vehicle_id} not found")

    telemetry = await load_latest_telemetry_for_vehicle(db, vehicle_id)
    if not telemetry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No telemetry found for vehicle {vehicle_id}")

    health = assess_vehicle_health(vehicle_id, telemetry)
    return VehicleHealthResponse(**health)


@router.get("/vehicles/{vehicle_id}/maintenance", response_model=MaintenancePredictionResponse, summary="Get Predictive Maintenance Risk")
async def get_vehicle_maintenance_prediction(vehicle_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    vehicle = await db.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Vehicle {vehicle_id} not found")

    telemetry = await load_latest_telemetry_for_vehicle(db, vehicle_id)
    if not telemetry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No telemetry found for vehicle {vehicle_id}")

    prediction = predict_maintenance(vehicle_id, telemetry)
    await persist_prediction_record(db, vehicle_id, prediction)
    await db.commit()
    return MaintenancePredictionResponse(**prediction)
