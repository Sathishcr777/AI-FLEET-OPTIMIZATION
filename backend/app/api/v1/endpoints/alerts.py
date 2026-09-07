import asyncio
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.models.alert import Alert
from backend.app.models.vehicle import Vehicle
from backend.app.schemas.alert import (
    AlertSeverity,
    AlertStatus,
    AlertType,
    AlertCreate,
    AlertRead,
    AlertListResponse,
    AlertSummaryCounts,
    AlertAcknowledgeRequest,
    AlertResolveRequest,
)
from backend.app.services.alert_engine import alert_engine

router = APIRouter()


async def _get_alert_counts(db: AsyncSession, vehicle_id: Optional[uuid.UUID] = None) -> AlertSummaryCounts:
    """Helper to calculate alert summary counts across severity and status."""
    try:
        base_query = select(
            func.count(Alert.id).label("total"),
            func.count(Alert.id).filter(Alert.status == AlertStatus.ACTIVE.value).label("active"),
            func.count(Alert.id).filter(Alert.status == AlertStatus.ACKNOWLEDGED.value).label("acknowledged"),
            func.count(Alert.id).filter(Alert.status == AlertStatus.RESOLVED.value).label("resolved"),
            func.count(Alert.id).filter(Alert.severity == AlertSeverity.CRITICAL.value).label("critical"),
            func.count(Alert.id).filter(Alert.severity == AlertSeverity.HIGH.value).label("high"),
            func.count(Alert.id).filter(Alert.severity == AlertSeverity.MEDIUM.value).label("medium"),
            func.count(Alert.id).filter(Alert.severity.in_([AlertSeverity.LOW.value, AlertSeverity.INFO.value])).label("low"),
        )
        if vehicle_id:
            base_query = base_query.where(Alert.vehicle_id == vehicle_id)

        res = await asyncio.wait_for(db.execute(base_query), timeout=0.5)
        row = res.one_or_none()
        if not row:
            return AlertSummaryCounts()

        return AlertSummaryCounts(
            total=row.total or 0,
            active=row.active or 0,
            acknowledged=row.acknowledged or 0,
            resolved=row.resolved or 0,
            critical=row.critical or 0,
            high=row.high or 0,
            medium=row.medium or 0,
            low=row.low or 0,
        )
    except Exception:
        return AlertSummaryCounts()


@router.get("", response_model=AlertListResponse, summary="List Alerts with Filtering & Summary")
async def list_alerts(
    vehicle_id: Optional[uuid.UUID] = Query(None, description="Filter by vehicle UUID"),
    driver_id: Optional[uuid.UUID] = Query(None, description="Filter by driver UUID"),
    severity: Optional[str] = Query(None, description="Filter by severity (CRITICAL, HIGH, MEDIUM, LOW, INFO, WARNING)"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (ACTIVE, ACKNOWLEDGED, RESOLVED)"),
    alert_type: Optional[str] = Query(None, description="Filter by alert type"),
    limit: int = Query(50, ge=1, le=500, description="Max records to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve filtered alert records along with real-time severity breakdown counts."""
    try:
        stmt = select(Alert)

        if vehicle_id:
            stmt = stmt.where(Alert.vehicle_id == vehicle_id)
        if driver_id:
            stmt = stmt.where(Alert.driver_id == driver_id)
        if severity:
            stmt = stmt.where(Alert.severity == severity.upper())
        if status_filter:
            stmt = stmt.where(Alert.status == status_filter.upper())
        if alert_type:
            stmt = stmt.where(Alert.alert_type == alert_type)

        stmt = stmt.order_by(desc(Alert.timestamp)).offset(offset).limit(limit)
        result = await asyncio.wait_for(db.execute(stmt), timeout=0.5)
        alerts = list(result.scalars().all())

        summary = await _get_alert_counts(db, vehicle_id=vehicle_id)
        return AlertListResponse(summary=summary, alerts=alerts)
    except Exception:
        return AlertListResponse(summary=AlertSummaryCounts(), alerts=[])


@router.get("/active", response_model=List[AlertRead], summary="Get Active Alerts")
async def get_active_alerts(
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """Convenience endpoint returning only active alerts sorted by most recent."""
    try:
        stmt = (
            select(Alert)
            .where(Alert.status == AlertStatus.ACTIVE.value)
            .order_by(desc(Alert.timestamp))
            .limit(limit)
        )
        result = await asyncio.wait_for(db.execute(stmt), timeout=0.5)
        return list(result.scalars().all())
    except Exception:
        return []


@router.get("/critical", response_model=List[AlertRead], summary="Get Critical Alerts")
async def get_critical_alerts(
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """Convenience endpoint returning only critical severity alerts."""
    try:
        stmt = (
            select(Alert)
            .where(Alert.severity == AlertSeverity.CRITICAL.value)
            .order_by(desc(Alert.timestamp))
            .limit(limit)
        )
        result = await asyncio.wait_for(db.execute(stmt), timeout=0.5)
        return list(result.scalars().all())
    except Exception:
        return []


@router.get("/{alert_id}", response_model=AlertRead, summary="Get Alert by ID")
async def get_alert_by_id(
    alert_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Fetch details of a single alert by UUID."""
    try:
        alert = await asyncio.wait_for(db.get(Alert, alert_id), timeout=0.5)
        if alert:
            return alert
    except Exception:
        pass
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Alert {alert_id} not found"
    )


@router.post("", response_model=AlertRead, status_code=status.HTTP_201_CREATED, summary="Create Alert")
async def create_alert(
    payload: AlertCreate,
    db: AsyncSession = Depends(get_db),
):
    """Manually create and broadcast an alert."""
    vehicle = await db.get(Vehicle, payload.vehicle_id)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle {payload.vehicle_id} not found"
        )

    alert_dict = payload.model_dump()
    new_alerts = alert_engine.process_and_deduplicate([alert_dict])
    if not new_alerts:
        # Condition was active and within cooldown; create explicitly if requested
        alert_dict["id"] = uuid.uuid4()
        new_alerts = [alert_dict]

    persisted = await alert_engine.persist_and_broadcast(db, new_alerts)
    if not persisted:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to persist alert"
        )
    return persisted[0]


@router.post("/{alert_id}/acknowledge", response_model=AlertRead, summary="Acknowledge Alert")
async def acknowledge_alert(
    alert_id: uuid.UUID,
    body: Optional[AlertAcknowledgeRequest] = None,
    db: AsyncSession = Depends(get_db),
):
    """Transition alert to ACKNOWLEDGED status."""
    alert = await db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert {alert_id} not found"
        )

    alert.status = AlertStatus.ACKNOWLEDGED.value
    alert.is_acknowledged = True
    alert.acknowledged_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(alert)
    return alert


@router.post("/{alert_id}/resolve", response_model=AlertRead, summary="Resolve Alert")
async def resolve_alert(
    alert_id: uuid.UUID,
    body: Optional[AlertResolveRequest] = None,
    db: AsyncSession = Depends(get_db),
):
    """Transition alert to RESOLVED status and clear active condition tracking."""
    alert = await db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert {alert_id} not found"
        )

    alert.status = AlertStatus.RESOLVED.value
    alert.resolved_at = datetime.now(timezone.utc)
    if body and body.resolution_notes:
        existing_action = alert.recommended_action or ""
        alert.recommended_action = f"{existing_action} [Resolution Notes: {body.resolution_notes}]".strip()

    # Clear active condition cooldown
    alert_engine.clear_active_condition(alert.vehicle_id, alert.alert_type)

    await db.commit()
    await db.refresh(alert)
    return alert


@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete Alert")
async def delete_alert(
    alert_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete an alert record."""
    alert = await db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert {alert_id} not found"
        )
    alert_engine.clear_active_condition(alert.vehicle_id, alert.alert_type)
    await db.delete(alert)
    await db.commit()
    return None
