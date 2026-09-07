import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.models.route import Route
from backend.app.schemas.route import (
    RouteOptimizeRequest,
    RouteOptimizeResponse,
    RouteRead,
    RouteListResponse,
)
from backend.app.services.route_optimizer import route_optimizer

router = APIRouter()


@router.post("/optimize", response_model=RouteOptimizeResponse, summary="Optimize Multi-Stop Route")
async def optimize_route(
    payload: RouteOptimizeRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Computes an explainable, 2-Opt TSP optimized stop sequence from origin to destination.
    Returns comparative metrics including distance saved, time saved, fuel saved, and cost reduction.
    """
    try:
        response = route_optimizer.optimize_route(payload)
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(val_err)
        )
    except Exception as ex:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Route optimization failed: {str(ex)}"
        )

    if payload.save_to_database:
        route_model = Route(
            id=response.route_id or uuid.uuid4(),
            trip_id=payload.trip_id,
            name=payload.name or "Optimized Delivery Route",
            origin_lat=payload.origin.latitude,
            origin_lon=payload.origin.longitude,
            dest_lat=response.destination.latitude,
            dest_lon=response.destination.longitude,
            waypoints=[s.model_dump() for s in response.original_sequence],
            optimized_path=[s.model_dump() for s in response.optimized_sequence],
            original_distance_km=response.comparison.original_distance_km,
            optimized_distance_km=response.comparison.optimized_distance_km,
            distance_saved_pct=response.comparison.distance_saved_pct,
            original_time_min=int(round(response.comparison.original_time_min)),
            optimized_time_min=int(round(response.comparison.optimized_time_min)),
            time_saved_pct=response.comparison.time_saved_pct,
            estimated_fuel_saved_liters=response.comparison.fuel_saved_liters,
            estimated_cost_saved_usd=response.comparison.cost_saved_usd,
            status="OPTIMIZED",
        )
        db.add(route_model)
        await db.commit()
        await db.refresh(route_model)
        response.route_id = route_model.id

    return response


@router.get("", response_model=RouteListResponse, summary="List Saved Optimized Routes")
async def list_routes(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve saved route optimization history."""
    stmt = select(Route).order_by(desc(Route.created_at)).offset(offset).limit(limit)
    result = await db.execute(stmt)
    routes = list(result.scalars().all())
    return RouteListResponse(total=len(routes), routes=routes)


@router.get("/{route_id}", response_model=RouteRead, summary="Get Route by ID")
async def get_route(
    route_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve a specific saved route by UUID."""
    route = await db.get(Route, route_id)
    if not route:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Route {route_id} not found"
        )
    return route


@router.delete("/{route_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete Route")
async def delete_route(
    route_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete a saved route by UUID."""
    route = await db.get(Route, route_id)
    if not route:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Route {route_id} not found"
        )
    await db.delete(route)
    await db.commit()
    return None
