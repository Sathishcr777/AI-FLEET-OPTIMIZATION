import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.models.trip import Trip
from backend.app.models.vehicle import Vehicle
from backend.app.models.driver import Driver
from backend.app.schemas.trip import (
    TripCreate,
    TripRead,
    TripUpdate,
)

router = APIRouter()


@router.get("", response_model=List[TripRead], summary="List Trips")
async def list_trips(
    vehicle_id: Optional[uuid.UUID] = Query(None, description="Filter by vehicle UUID"),
    driver_id: Optional[uuid.UUID] = Query(None, description="Filter by driver UUID"),
    status: Optional[str] = Query(None, description="Filter by status (IN_PROGRESS, COMPLETED)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve fleet trips with optional filtering."""
    query = select(Trip)
    if vehicle_id:
        query = query.where(Trip.vehicle_id == vehicle_id)
    if driver_id:
        query = query.where(Trip.driver_id == driver_id)
    if status:
        query = query.where(Trip.status == status)

    query = query.offset(skip).limit(limit).order_by(Trip.start_time.desc())
    result = await db.execute(query)
    trips = result.scalars().all()
    return trips


@router.get("/{trip_id}", response_model=TripRead, summary="Get Trip Details")
async def get_trip(trip_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Retrieve details for a single trip."""
    trip = await db.get(Trip, trip_id)
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trip with ID {trip_id} not found",
        )
    return trip


@router.post("", response_model=TripRead, status_code=status.HTTP_201_CREATED, summary="Start New Trip")
async def start_trip(trip_in: TripCreate, db: AsyncSession = Depends(get_db)):
    """Create and start a new trip for a vehicle and driver."""
    # Verify vehicle and driver exist
    vehicle = await db.get(Vehicle, trip_in.vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail=f"Vehicle {trip_in.vehicle_id} not found")
    driver = await db.get(Driver, trip_in.driver_id)
    if not driver:
        raise HTTPException(status_code=404, detail=f"Driver {trip_in.driver_id} not found")

    trip = Trip(**trip_in.model_dump())
    db.add(trip)
    # Mark vehicle as active
    vehicle.status = "ACTIVE"
    await db.commit()
    await db.refresh(trip)
    return trip


@router.patch("/{trip_id}", response_model=TripRead, summary="Update Trip")
async def update_trip(
    trip_id: uuid.UUID,
    trip_update: TripUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update trip metrics."""
    trip = await db.get(Trip, trip_id)
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trip with ID {trip_id} not found",
        )

    update_data = trip_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(trip, field, value)

    await db.commit()
    await db.refresh(trip)
    return trip


@router.post("/{trip_id}/complete", response_model=TripRead, summary="Complete Trip")
async def complete_trip(
    trip_id: uuid.UUID,
    end_location: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Mark an active trip as completed."""
    trip = await db.get(Trip, trip_id)
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trip with ID {trip_id} not found",
        )

    trip.status = "COMPLETED"
    trip.end_time = datetime.now(timezone.utc)
    if end_location:
        trip.end_location = end_location

    await db.commit()
    await db.refresh(trip)
    return trip
