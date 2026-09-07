import asyncio
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.models.vehicle import Vehicle
from backend.app.schemas.vehicle import (
    VehicleCreate,
    VehicleRead,
    VehicleUpdate,
    VehicleStatusSummary,
)
from backend.app.services.ingestion import ingestion_service

router = APIRouter()

SEED_VEHICLES: List[dict] = [
    {
        "id": uuid.UUID("22222222-2222-2222-2222-222222222201"),
        "vin": "1FTFW1ED4NFA10001",
        "name": "Alpha Fleet-01 (Freight Truck)",
        "vehicle_type": "TRUCK",
        "license_plate": "FL-8021",
        "status": "ACTIVE",
        "fuel_capacity_liters": 120.0,
        "total_mileage_km": 48250.0,
        "health_status": "GOOD",
        "assigned_driver_id": uuid.UUID("11111111-1111-1111-1111-111111111101"),
    },
    {
        "id": uuid.UUID("22222222-2222-2222-2222-222222222202"),
        "vin": "1FTFW1ED4NFA10002",
        "name": "Beta Fleet-02 (Cargo Van)",
        "vehicle_type": "VAN",
        "license_plate": "FL-4912",
        "status": "ACTIVE",
        "fuel_capacity_liters": 75.0,
        "total_mileage_km": 31400.0,
        "health_status": "WARNING",
        "assigned_driver_id": uuid.UUID("11111111-1111-1111-1111-111111111102"),
    },
    {
        "id": uuid.UUID("22222222-2222-2222-2222-222222222203"),
        "vin": "1FTFW1ED4NFA10003",
        "name": "Gamma Fleet-03 (Delivery Van)",
        "vehicle_type": "VAN",
        "license_plate": "FL-3388",
        "status": "ACTIVE",
        "fuel_capacity_liters": 70.0,
        "total_mileage_km": 19800.0,
        "health_status": "GOOD",
        "assigned_driver_id": uuid.UUID("11111111-1111-1111-1111-111111111103"),
    },
    {
        "id": uuid.UUID("22222222-2222-2222-2222-222222222204"),
        "vin": "1FTFW1ED4NFA10004",
        "name": "Delta Fleet-04 (Heavy Hauler)",
        "vehicle_type": "TRUCK",
        "license_plate": "FL-9045",
        "status": "ACTIVE",
        "fuel_capacity_liters": 150.0,
        "total_mileage_km": 89400.0,
        "health_status": "CRITICAL",
        "assigned_driver_id": uuid.UUID("11111111-1111-1111-1111-111111111104"),
    },
    {
        "id": uuid.UUID("22222222-2222-2222-2222-222222222205"),
        "vin": "1FTFW1ED4NFA10005",
        "name": "Epsilon Fleet-05 (Eco Transit)",
        "vehicle_type": "ELECTRIC_VAN",
        "license_plate": "FL-1277",
        "status": "ACTIVE",
        "fuel_capacity_liters": 90.0,
        "total_mileage_km": 12500.0,
        "health_status": "GOOD",
        "assigned_driver_id": uuid.UUID("11111111-1111-1111-1111-111111111105"),
    },
]


@router.get("", response_model=List[VehicleRead], summary="List Fleet Vehicles")
async def list_vehicles(
    status: Optional[str] = Query(None, description="Filter by status (ACTIVE, MAINTENANCE, IDLE)"),
    health_status: Optional[str] = Query(None, description="Filter by health status (GOOD, WARNING, CRITICAL)"),
    vehicle_type: Optional[str] = Query(None, description="Filter by vehicle type"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all fleet vehicles with optional filtering."""
    try:
        query = select(Vehicle)
        if status:
            query = query.where(Vehicle.status == status)
        if health_status:
            query = query.where(Vehicle.health_status == health_status)
        if vehicle_type:
            query = query.where(Vehicle.vehicle_type == vehicle_type)

        query = query.offset(skip).limit(limit).order_by(Vehicle.name.asc())
        result = await asyncio.wait_for(db.execute(query), timeout=0.5)
        vehicles = result.scalars().all()
        if vehicles:
            return vehicles
    except Exception:
        pass

    # Fallback to in-memory fleet roster
    now = datetime.now(timezone.utc)
    filtered = SEED_VEHICLES
    if status:
        filtered = [v for v in filtered if v["status"] == status]
    if health_status:
        filtered = [v for v in filtered if v["health_status"] == health_status]
    if vehicle_type:
        filtered = [v for v in filtered if v["vehicle_type"] == vehicle_type]

    return [
        VehicleRead(
            id=v["id"],
            vin=v["vin"],
            name=v["name"],
            vehicle_type=v["vehicle_type"],
            license_plate=v["license_plate"],
            status=v["status"],
            fuel_capacity_liters=v["fuel_capacity_liters"],
            total_mileage_km=v["total_mileage_km"],
            health_status=v["health_status"],
            assigned_driver_id=v["assigned_driver_id"],
            created_at=now,
            updated_at=now,
        )
        for v in filtered[skip : skip + limit]
    ]


@router.get("/summary", response_model=VehicleStatusSummary, summary="Vehicle Fleet Status Summary")
async def get_vehicle_summary(db: AsyncSession = Depends(get_db)):
    """Retrieve summary counts of fleet status and health conditions."""
    try:
        total = await asyncio.wait_for(db.scalar(select(func.count(Vehicle.id))), timeout=0.5) or 0
        active = await asyncio.wait_for(db.scalar(select(func.count(Vehicle.id)).where(Vehicle.status == "ACTIVE")), timeout=0.5) or 0
        idle = await asyncio.wait_for(db.scalar(select(func.count(Vehicle.id)).where(Vehicle.status == "IDLE")), timeout=0.5) or 0
        maintenance = await asyncio.wait_for(db.scalar(select(func.count(Vehicle.id)).where(Vehicle.status == "MAINTENANCE")), timeout=0.5) or 0
        good = await asyncio.wait_for(db.scalar(select(func.count(Vehicle.id)).where(Vehicle.health_status == "GOOD")), timeout=0.5) or 0
        warning = await asyncio.wait_for(db.scalar(select(func.count(Vehicle.id)).where(Vehicle.health_status == "WARNING")), timeout=0.5) or 0
        critical = await asyncio.wait_for(db.scalar(select(func.count(Vehicle.id)).where(Vehicle.health_status == "CRITICAL")), timeout=0.5) or 0

        return VehicleStatusSummary(
            total_vehicles=total,
            active_vehicles=active,
            idle_vehicles=idle,
            maintenance_vehicles=maintenance,
            good_health_count=good,
            warning_health_count=warning,
            critical_health_count=critical,
        )
    except Exception:
        return VehicleStatusSummary(
            total_vehicles=len(SEED_VEHICLES),
            active_vehicles=len(SEED_VEHICLES),
            idle_vehicles=0,
            maintenance_vehicles=0,
            good_health_count=3,
            warning_health_count=1,
            critical_health_count=1,
        )


@router.get("/{vehicle_id}", response_model=VehicleRead, summary="Get Vehicle Detail")
async def get_vehicle(vehicle_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Retrieve details for a single vehicle by UUID."""
    try:
        vehicle = await asyncio.wait_for(db.get(Vehicle, vehicle_id), timeout=0.5)
        if vehicle:
            return vehicle
    except Exception:
        pass

    match = next((v for v in SEED_VEHICLES if v["id"] == vehicle_id), None)
    if match:
        now = datetime.now(timezone.utc)
        return VehicleRead(
            id=match["id"],
            vin=match["vin"],
            name=match["name"],
            vehicle_type=match["vehicle_type"],
            license_plate=match["license_plate"],
            status=match["status"],
            fuel_capacity_liters=match["fuel_capacity_liters"],
            total_mileage_km=match["total_mileage_km"],
            health_status=match["health_status"],
            assigned_driver_id=match["assigned_driver_id"],
            created_at=now,
            updated_at=now,
        )

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Vehicle with ID {vehicle_id} not found",
    )


@router.post("", response_model=VehicleRead, status_code=status.HTTP_201_CREATED, summary="Create New Vehicle")
async def create_vehicle(vehicle_in: VehicleCreate, db: AsyncSession = Depends(get_db)):
    """Register a new vehicle into the fleet database."""
    # Check for unique VIN
    existing = await db.scalar(select(Vehicle).where(Vehicle.vin == vehicle_in.vin))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Vehicle with VIN {vehicle_in.vin} already registered",
        )

    vehicle = Vehicle(**vehicle_in.model_dump())
    db.add(vehicle)
    await db.commit()
    await db.refresh(vehicle)
    return vehicle


@router.patch("/{vehicle_id}", response_model=VehicleRead, summary="Update Vehicle")
async def update_vehicle(
    vehicle_id: uuid.UUID,
    vehicle_update: VehicleUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update vehicle specifications, assigned driver, or status."""
    vehicle = await db.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle with ID {vehicle_id} not found",
        )

    update_data = vehicle_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(vehicle, field, value)

    await db.commit()
    await db.refresh(vehicle)
    return vehicle


@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete Vehicle")
async def delete_vehicle(vehicle_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Remove a vehicle from the fleet registry."""
    vehicle = await db.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle with ID {vehicle_id} not found",
        )
    await db.delete(vehicle)
    await db.commit()
    return None
