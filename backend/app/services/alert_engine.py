import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy import select, func, desc, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.alert import Alert
from backend.app.models.vehicle import Vehicle
from backend.app.models.driver import Driver
from backend.app.schemas.alert import (
    AlertSeverity,
    AlertStatus,
    AlertType,
    AlertSummaryCounts,
    AlertRead,
)
from backend.app.core.websocket_manager import websocket_manager

logger = logging.getLogger("fleetiq.alert_engine")


class AlertConditionState:
    """Tracks active condition state for per-vehicle cooldown deduplication."""
    def __init__(self, alert_id: uuid.UUID, alert_type: str, severity: str, first_seen: datetime, last_seen: datetime):
        self.alert_id = alert_id
        self.alert_type = alert_type
        self.severity = severity
        self.first_seen = first_seen
        self.last_seen = last_seen


class AlertEngine:
    """
    Intelligent Alert Engine for FleetIQ.
    
    Consumes live telemetry streams, driver behavior analytics, anomaly detection events,
    vehicle health assessments, and predictive maintenance risks to generate explainable,
    prioritized alerts with per-vehicle/driver deduplication, cooldown suppression, triage
    state management, database persistence, and WebSocket real-time delivery.
    """

    def __init__(self, cooldown_seconds: int = 180):
        self.cooldown_seconds = cooldown_seconds
        # Map: (entity_id, alert_type) -> AlertConditionState
        self._active_conditions: Dict[Tuple[uuid.UUID, str], AlertConditionState] = {}

    def _get_val(self, obj: Any, key: str, default: Any = None) -> Any:
        if isinstance(obj, dict):
            return obj.get(key, default)
        return getattr(obj, key, default)

    def _parse_uuid(self, val: Any) -> Optional[uuid.UUID]:
        if not val:
            return None
        if isinstance(val, uuid.UUID):
            return val
        try:
            return uuid.UUID(str(val))
        except (ValueError, TypeError):
            return None

    # =========================================================================
    # 1. TELEMETRY OPERATIONAL THRESHOLD RULES
    # =========================================================================

    def evaluate_telemetry(self, telemetry: Any, driver_id: Optional[uuid.UUID] = None) -> List[Dict[str, Any]]:
        """
        Evaluate single telemetry packet against operational safety thresholds.
        Returns candidate alert specifications before cooldown check.
        """
        candidates: List[Dict[str, Any]] = []

        vehicle_id = self._parse_uuid(self._get_val(telemetry, "vehicle_id"))
        if not vehicle_id:
            return []

        # Extract driver_id if present
        d_id = driver_id or self._parse_uuid(self._get_val(telemetry, "driver_id"))

        raw_time = self._get_val(telemetry, "time", datetime.now(timezone.utc))
        if isinstance(raw_time, str):
            try:
                timestamp = datetime.fromisoformat(raw_time.replace("Z", "+00:00"))
            except Exception:
                timestamp = datetime.now(timezone.utc)
        elif isinstance(raw_time, datetime):
            timestamp = raw_time if raw_time.tzinfo else raw_time.replace(tzinfo=timezone.utc)
        else:
            timestamp = datetime.now(timezone.utc)

        speed = float(self._get_val(telemetry, "speed", 0.0) or 0.0)
        rpm = float(self._get_val(telemetry, "rpm", 0.0) or 0.0)
        temp = float(self._get_val(telemetry, "engine_temp_c", 0.0) or 0.0)
        oil = float(self._get_val(telemetry, "oil_pressure_psi", 0.0) or 0.0)
        tire = float(self._get_val(telemetry, "tire_pressure_psi", 0.0) or 0.0)
        voltage = float(self._get_val(telemetry, "battery_voltage", 0.0) or 0.0)
        is_anomaly = bool(self._get_val(telemetry, "is_anomaly", False))

        # 1. Engine Overheating (CRITICAL)
        if temp > 105.0:
            candidates.append({
                "vehicle_id": vehicle_id,
                "driver_id": d_id,
                "alert_type": AlertType.ENGINE_OVERHEAT.value,
                "severity": AlertSeverity.CRITICAL.value,
                "title": "Critical Engine Overheating",
                "message": f"Engine coolant temperature reached {temp:.1f}°C (Threshold > 105.0°C).",
                "metric_name": "engine_temp_c",
                "metric_value": temp,
                "threshold_value": "> 105.0°C",
                "confidence_score": 0.95 if temp > 115.0 else 0.85,
                "recommended_action": "Instruct driver to pull over immediately, turn off engine, and inspect radiator coolant levels.",
                "timestamp": timestamp,
            })

        # 2. Low Oil Pressure (CRITICAL)
        if oil > 0.0 and oil < 20.0:
            candidates.append({
                "vehicle_id": vehicle_id,
                "driver_id": d_id,
                "alert_type": AlertType.LOW_OIL_PRESSURE.value,
                "severity": AlertSeverity.CRITICAL.value,
                "title": "Dangerously Low Oil Pressure",
                "message": f"Engine oil pressure dropped to {oil:.1f} PSI (Safe minimum: 25.0 PSI).",
                "metric_name": "oil_pressure_psi",
                "metric_value": oil,
                "threshold_value": "< 20.0 PSI",
                "confidence_score": 0.92,
                "recommended_action": "Shut off engine to prevent catastrophic cylinder and bearing seizure. Dispatch roadside service.",
                "timestamp": timestamp,
            })

        # 3. Tire Pressure Anomaly (HIGH)
        if tire > 0.0 and (tire < 26.0 or tire > 40.0):
            condition_desc = "underinflated" if tire < 26.0 else "overinflated"
            candidates.append({
                "vehicle_id": vehicle_id,
                "driver_id": d_id,
                "alert_type": AlertType.LOW_TIRE_PRESSURE.value,
                "severity": AlertSeverity.HIGH.value,
                "title": f"Tire Pressure Warning ({condition_desc.capitalize()})",
                "message": f"Tire pressure recorded at {tire:.1f} PSI (Target nominal: 30-38 PSI).",
                "metric_name": "tire_pressure_psi",
                "metric_value": tire,
                "threshold_value": "26.0 - 40.0 PSI",
                "confidence_score": 0.88,
                "recommended_action": f"Inspect tires at next service stop; check for slow puncture or thermal expansion.",
                "timestamp": timestamp,
            })

        # 4. Battery / Electrical Instability (MEDIUM)
        if voltage > 0.0 and (voltage < 11.5 or voltage > 14.9):
            candidates.append({
                "vehicle_id": vehicle_id,
                "driver_id": d_id,
                "alert_type": AlertType.BATTERY_VOLTAGE.value,
                "severity": AlertSeverity.MEDIUM.value,
                "title": "Battery Voltage Anomaly",
                "message": f"Electrical system voltage is {voltage:.1f} V (Expected alternator charging: 12.0-14.8 V).",
                "metric_name": "battery_voltage",
                "metric_value": voltage,
                "threshold_value": "11.5 - 14.9 V",
                "confidence_score": 0.80,
                "recommended_action": "Check alternator belt tension and battery terminal connections.",
                "timestamp": timestamp,
            })

        # 5. Overspeeding (HIGH)
        if speed > 105.0:
            candidates.append({
                "vehicle_id": vehicle_id,
                "driver_id": d_id,
                "alert_type": AlertType.OVERSPEEDING.value,
                "severity": AlertSeverity.HIGH.value,
                "title": "Vehicle Overspeeding",
                "message": f"Vehicle velocity recorded at {speed:.1f} km/h (Fleet speed governor limit: 105.0 km/h).",
                "metric_name": "speed",
                "metric_value": speed,
                "threshold_value": "> 105.0 km/h",
                "confidence_score": 0.90,
                "recommended_action": "Send automated safety speed alert to driver and notify fleet safety dispatcher.",
                "timestamp": timestamp,
            })

        # 6. Sensor Glitch or RPM Excess (HIGH)
        if rpm > 5500.0:
            candidates.append({
                "vehicle_id": vehicle_id,
                "driver_id": d_id,
                "alert_type": AlertType.SENSOR_GLITCH.value,
                "severity": AlertSeverity.HIGH.value,
                "title": "Engine RPM Out of Bounds",
                "message": f"Engine speed reached {rpm:.0f} RPM (Redline max: 5500 RPM).",
                "metric_name": "rpm",
                "metric_value": rpm,
                "threshold_value": "> 5500 RPM",
                "confidence_score": 0.85,
                "recommended_action": "Check transmission downshift sensors or electronic throttle control.",
                "timestamp": timestamp,
            })

        # 7. Generic Injected Anomaly Flag (HIGH)
        if is_anomaly and not candidates:
            candidates.append({
                "vehicle_id": vehicle_id,
                "driver_id": d_id,
                "alert_type": AlertType.TELEMETRY_ANOMALY.value,
                "severity": AlertSeverity.HIGH.value,
                "title": "Telemetry Sensor Anomaly Detected",
                "message": f"Statistical anomaly flagged across vehicle telemetry channels.",
                "metric_name": "telemetry",
                "metric_value": speed,
                "threshold_value": "Z-score > 2.5",
                "confidence_score": 0.75,
                "recommended_action": "Review vehicle diagnostic log in FleetIQ Analytics.",
                "timestamp": timestamp,
            })

        return candidates

    # =========================================================================
    # 2. PHASE 3 INTELLIGENCE: DRIVER BEHAVIOR ANALYTICS
    # =========================================================================

    def evaluate_driver_behavior(
        self,
        driver_id: uuid.UUID,
        behavior_analytics: Dict[str, Any],
        vehicle_id: Optional[uuid.UUID] = None,
    ) -> List[Dict[str, Any]]:
        """
        Consumes Phase 3 Driver Behavior Analytics to generate prioritized alerts
        for harsh braking, rapid acceleration, speeding, and excessive idling.
        """
        alerts: List[Dict[str, Any]] = []
        now = datetime.now(timezone.utc)
        target_vid = vehicle_id or uuid.UUID("00000000-0000-0000-0000-000000000000")

        harsh_brake = int(behavior_analytics.get("harsh_braking_events", 0))
        rapid_accel = int(behavior_analytics.get("rapid_acceleration_events", 0))
        speeding = int(behavior_analytics.get("speeding_events", 0))
        excessive_idle = int(behavior_analytics.get("excessive_idle_events", 0))
        safety_score = float(behavior_analytics.get("safety_score", 100.0))

        # 1. Harsh Braking Alert
        if harsh_brake > 0:
            severity = AlertSeverity.CRITICAL.value if harsh_brake >= 3 else AlertSeverity.HIGH.value
            alerts.append({
                "vehicle_id": target_vid,
                "driver_id": driver_id,
                "alert_type": AlertType.HARSH_BRAKE.value,
                "severity": severity,
                "title": "Harsh Braking Event Flagged",
                "message": f"Driver logged {harsh_brake} harsh deceleration event(s) exceeding safe braking envelope.",
                "metric_name": "harsh_braking_events",
                "metric_value": float(harsh_brake),
                "threshold_value": "> 18.0 km/h drop",
                "confidence_score": 0.90,
                "recommended_action": "Review driver telematics trip log and conduct defensive driving following-distance coaching.",
                "timestamp": now,
            })

        # 2. Rapid Acceleration Alert
        if rapid_accel > 0:
            severity = AlertSeverity.HIGH.value if rapid_accel >= 3 else AlertSeverity.MEDIUM.value
            alerts.append({
                "vehicle_id": target_vid,
                "driver_id": driver_id,
                "alert_type": AlertType.RAPID_ACCEL.value,
                "severity": severity,
                "title": "Rapid Acceleration Detected",
                "message": f"Driver logged {rapid_accel} aggressive throttle application event(s) with high RPM.",
                "metric_name": "rapid_acceleration_events",
                "metric_value": float(rapid_accel),
                "threshold_value": "> 15.0 km/h gain & RPM > 3500",
                "confidence_score": 0.85,
                "recommended_action": "Advise driver on progressive throttle modulation to improve fuel economy and reduce drivetrain strain.",
                "timestamp": now,
            })

        # 3. Overspeeding Behavior Alert
        if speeding > 0:
            severity = AlertSeverity.CRITICAL.value if speeding >= 3 else AlertSeverity.HIGH.value
            alerts.append({
                "vehicle_id": target_vid,
                "driver_id": driver_id,
                "alert_type": AlertType.OVERSPEEDING.value,
                "severity": severity,
                "title": "Driver Overspeeding Violation",
                "message": f"Driver logged {speeding} velocity excess event(s) over 90 km/h operating limits.",
                "metric_name": "speeding_events",
                "metric_value": float(speeding),
                "threshold_value": "> 90.0 km/h",
                "confidence_score": 0.92,
                "recommended_action": "Issue formal speed advisory to driver and enforce speed limiter protocol.",
                "timestamp": now,
            })

        # 4. Excessive Idling Alert
        if excessive_idle > 0:
            alerts.append({
                "vehicle_id": target_vid,
                "driver_id": driver_id,
                "alert_type": AlertType.EXCESSIVE_IDLE.value,
                "severity": AlertSeverity.MEDIUM.value,
                "title": "Excessive Idling Fuel Waste Alert",
                "message": f"Vehicle logged {excessive_idle} prolonged idling cycle(s) with zero forward speed.",
                "metric_name": "excessive_idle_events",
                "metric_value": float(excessive_idle),
                "threshold_value": "Idle dwell >= 3 consecutive observations",
                "confidence_score": 0.88,
                "recommended_action": "Instruct driver to turn off engine during delivery dwell periods exceeding 3 minutes.",
                "timestamp": now,
            })

        # 5. Low Overall Safety Score Alert
        if safety_score < 70.0:
            severity = AlertSeverity.CRITICAL.value if safety_score < 50.0 else AlertSeverity.HIGH.value
            alerts.append({
                "vehicle_id": target_vid,
                "driver_id": driver_id,
                "alert_type": AlertType.DRIVER_SAFETY.value,
                "severity": severity,
                "title": "Critical Driver Safety Score Degradation",
                "message": f"Driver safety score has dropped to {safety_score:.1f}/100.",
                "metric_name": "safety_score",
                "metric_value": safety_score,
                "threshold_value": "Safety Score < 70.0",
                "confidence_score": 0.95,
                "recommended_action": "Schedule mandatory fleet safety training and driver performance evaluation.",
                "timestamp": now,
            })

        return alerts

    # =========================================================================
    # 3. PHASE 3 INTELLIGENCE: TELEMETRY ANOMALY DETECTION
    # =========================================================================

    def evaluate_telemetry_anomalies(
        self,
        anomalies: List[Dict[str, Any]],
        vehicle_id: Optional[uuid.UUID] = None,
        driver_id: Optional[uuid.UUID] = None,
    ) -> List[Dict[str, Any]]:
        """
        Consumes Phase 3 Telemetry Anomaly Detection results to generate structured alerts.
        """
        alerts: List[Dict[str, Any]] = []
        now = datetime.now(timezone.utc)

        for a in anomalies:
            raw_vid = a.get("vehicle_id") or vehicle_id
            vid = self._parse_uuid(raw_vid) or uuid.UUID("00000000-0000-0000-0000-000000000000")

            metric_name = a.get("metric_name", "sensor")
            metric_val = float(a.get("metric_value", 0.0))
            score = float(a.get("anomaly_score", 0.80))
            reason = a.get("anomaly_reason", "Statistical anomaly detected in telemetry channel.")
            subsystem = a.get("subsystem", "POWERTRAIN")

            severity = AlertSeverity.CRITICAL.value if score >= 0.85 or metric_name in ["engine_temp_c", "oil_pressure_psi"] else AlertSeverity.HIGH.value

            alerts.append({
                "vehicle_id": vid,
                "driver_id": driver_id,
                "alert_type": AlertType.TELEMETRY_ANOMALY.value,
                "severity": severity,
                "title": f"Telemetry Anomaly Flagged [{metric_name.upper()}]",
                "message": reason,
                "metric_name": metric_name,
                "metric_value": metric_val,
                "threshold_value": a.get("expected_range", "Out of bounds"),
                "confidence_score": round(score, 3),
                "recommended_action": f"Inspect {subsystem} subsystem and run diagnostic sensor verification.",
                "timestamp": now,
            })

        return alerts

    # =========================================================================
    # 4. PHASE 3 INTELLIGENCE: VEHICLE HEALTH & PREDICTIVE MAINTENANCE
    # =========================================================================

    def evaluate_vehicle_health(
        self,
        vehicle_id: uuid.UUID,
        health_assessment: Dict[str, Any],
        driver_id: Optional[uuid.UUID] = None,
    ) -> List[Dict[str, Any]]:
        """
        Consumes Phase 3 Vehicle Health Assessment results to generate health alerts.
        """
        alerts: List[Dict[str, Any]] = []
        now = datetime.now(timezone.utc)

        health_status = health_assessment.get("status", "GOOD")
        health_score = float(health_assessment.get("health_score", 100.0))
        risk_factors = health_assessment.get("risk_factors", [])

        if health_status == "CRITICAL" or health_score < 50.0:
            alerts.append({
                "vehicle_id": vehicle_id,
                "driver_id": driver_id,
                "alert_type": AlertType.HIGH_VEHICLE_HEALTH_RISK.value,
                "severity": AlertSeverity.CRITICAL.value,
                "title": "Critical Vehicle Health Risk",
                "message": f"Vehicle health score degraded to {health_score:.1f}/100. Risk factors: {', '.join(risk_factors)}.",
                "metric_name": "health_score",
                "metric_value": health_score,
                "threshold_value": "Health Score < 50.0",
                "confidence_score": 0.95,
                "recommended_action": "Pull vehicle from active service immediately for comprehensive mechanical overhaul.",
                "timestamp": now,
            })
        elif health_status == "WARNING" or health_score < 80.0:
            alerts.append({
                "vehicle_id": vehicle_id,
                "driver_id": driver_id,
                "alert_type": AlertType.HIGH_VEHICLE_HEALTH_RISK.value,
                "severity": AlertSeverity.HIGH.value,
                "title": "Elevated Vehicle Health Risk Warning",
                "message": f"Vehicle health score at {health_score:.1f}/100 indicates emerging component degradation.",
                "metric_name": "health_score",
                "metric_value": health_score,
                "threshold_value": "Health Score < 80.0",
                "confidence_score": 0.85,
                "recommended_action": "Schedule preventive inspection at next vehicle depot check-in.",
                "timestamp": now,
            })

        return alerts

    def evaluate_predictive_maintenance(
        self,
        vehicle_id: uuid.UUID,
        risk_score: float,
        risk_category: str,
        health_status: str = "GOOD",
        driver_id: Optional[uuid.UUID] = None,
    ) -> List[Dict[str, Any]]:
        """Evaluate AI predictive maintenance inferences for alert generation."""
        alerts: List[Dict[str, Any]] = []
        now = datetime.now(timezone.utc)

        if risk_score >= 0.8 or risk_category == "CRITICAL" or health_status == "CRITICAL":
            alerts.append({
                "vehicle_id": vehicle_id,
                "driver_id": driver_id,
                "alert_type": AlertType.CRITICAL_MAINTENANCE_RISK.value,
                "severity": AlertSeverity.CRITICAL.value,
                "title": "Critical Maintenance Overhaul Required",
                "message": f"AI predictive maintenance model estimated breakdown risk at {risk_score * 100:.1f}% ({risk_category}).",
                "metric_name": "maintenance_risk_score",
                "metric_value": round(risk_score, 3),
                "threshold_value": "Risk Score >= 0.80",
                "confidence_score": min(0.98, max(0.85, risk_score)),
                "recommended_action": "Schedule immediate workshop overhaul and dispatch backup vehicle to prevent roadside breakdown.",
                "timestamp": now,
            })
        elif risk_score >= 0.5 or risk_category == "HIGH":
            alerts.append({
                "vehicle_id": vehicle_id,
                "driver_id": driver_id,
                "alert_type": AlertType.HIGH_MAINTENANCE_RISK.value,
                "severity": AlertSeverity.HIGH.value,
                "title": "High Maintenance Wear Alert",
                "message": f"Predictive maintenance indicates elevated component degradation ({risk_score * 100:.1f}% risk).",
                "metric_name": "maintenance_risk_score",
                "metric_value": round(risk_score, 3),
                "threshold_value": "Risk Score >= 0.50",
                "confidence_score": 0.80,
                "recommended_action": "Queue vehicle for preventive maintenance inspection within the next 500 km.",
                "timestamp": now,
            })

        return alerts

    # =========================================================================
    # 5. COOLDOWN DEDUPLICATION & TRIAGE MANAGEMENT
    # =========================================================================

    def process_and_deduplicate(self, candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Applies cooldown deduplication to prevent generating duplicate alerts for ongoing conditions.
        Returns only newly activated or refreshed alerts that need persistence & broadcast.
        """
        new_alerts: List[Dict[str, Any]] = []
        now = datetime.now(timezone.utc)

        for item in candidates:
            v_id = item["vehicle_id"]
            a_type = item["alert_type"]
            key = (v_id, a_type)

            if key in self._active_conditions:
                state = self._active_conditions[key]
                # If still within cooldown window, suppress duplicate creation
                elapsed = (now - state.last_seen).total_seconds()
                if elapsed < self.cooldown_seconds:
                    state.last_seen = now
                    logger.debug(f"Suppressed duplicate alert {a_type} for entity {v_id} (elapsed: {elapsed:.1f}s)")
                    continue
                else:
                    # Cooldown elapsed but condition persists -> refresh condition state
                    state.last_seen = now
            else:
                # Brand new alert condition
                new_id = uuid.uuid4()
                item["id"] = new_id
                self._active_conditions[key] = AlertConditionState(
                    alert_id=new_id,
                    alert_type=a_type,
                    severity=item.get("severity", AlertSeverity.INFO.value),
                    first_seen=now,
                    last_seen=now,
                )
                new_alerts.append(item)

        return new_alerts

    async def persist_and_broadcast(self, db: AsyncSession, alerts_data: List[Dict[str, Any]]) -> List[Alert]:
        """Persists alerts to database and broadcasts them to real-time WebSocket subscribers."""
        if not alerts_data:
            return []

        created_alerts: List[Alert] = []
        for d in alerts_data:
            alert = Alert(
                id=d.get("id", uuid.uuid4()),
                vehicle_id=d["vehicle_id"],
                driver_id=d.get("driver_id"),
                timestamp=d.get("timestamp", datetime.now(timezone.utc)),
                alert_type=d["alert_type"],
                severity=d.get("severity", AlertSeverity.INFO.value),
                status=AlertStatus.ACTIVE.value,
                title=d["title"],
                message=d["message"],
                metric_name=d.get("metric_name"),
                metric_value=d.get("metric_value"),
                threshold_value=d.get("threshold_value"),
                confidence_score=d.get("confidence_score"),
                recommended_action=d.get("recommended_action"),
                is_acknowledged=False,
            )
            db.add(alert)
            created_alerts.append(alert)

        try:
            await db.commit()
            for a in created_alerts:
                await db.refresh(a)
        except Exception as ex:
            await db.rollback()
            logger.error(f"Failed to persist alerts: {ex}", exc_info=True)
            return []

        # Broadcast via WebSocket
        for a in created_alerts:
            ws_payload = {
                "type": "ALERT",
                "data": {
                    "id": str(a.id),
                    "vehicle_id": str(a.vehicle_id),
                    "driver_id": str(a.driver_id) if a.driver_id else None,
                    "alert_type": a.alert_type,
                    "severity": a.severity,
                    "status": a.status,
                    "title": a.title,
                    "message": a.message,
                    "recommended_action": a.recommended_action,
                    "timestamp": a.timestamp.isoformat(),
                }
            }
            try:
                # 1. Fleet-wide broadcast
                await websocket_manager.broadcast_json(ws_payload)
                # 2. Vehicle-specific broadcast
                await websocket_manager.broadcast_to_vehicle(a.vehicle_id, ws_payload)
            except Exception as e:
                logger.warning(f"Failed to broadcast alert over WebSocket: {e}")

        return created_alerts

    def clear_active_condition(self, vehicle_id: uuid.UUID, alert_type: str) -> None:
        """Manually clear or recover an active condition state."""
        self._active_conditions.pop((vehicle_id, alert_type), None)

    def get_active_condition_count(self) -> int:
        return len(self._active_conditions)


# Singleton alert engine instance
alert_engine = AlertEngine(cooldown_seconds=180)
