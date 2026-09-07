import uuid
from datetime import datetime, timezone
from statistics import mean, pstdev
from typing import Any, Dict, Iterable, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.anomaly import Anomaly
from backend.app.models.driver import Driver
from backend.app.models.driver_event import DriverEvent
from backend.app.models.prediction import Prediction
from backend.app.models.telemetry import Telemetry
from backend.app.models.vehicle import Vehicle


def _clamp(value: float, lower: float = 0.0, upper: float = 100.0) -> float:
    return max(lower, min(upper, value))


def _safe_mean(values: Iterable[float]) -> float:
    items = [float(v) for v in values if v is not None]
    return mean(items) if items else 0.0


def _safe_stdev(values: Iterable[float]) -> float:
    items = [float(v) for v in values if v is not None]
    return pstdev(items) if len(items) > 1 else 0.0


def _risk_level_from_score(score: float) -> str:
    if score >= 85:
        return "LOW"
    if score >= 70:
        return "MEDIUM"
    if score >= 50:
        return "HIGH"
    return "CRITICAL"


def _driver_safety_risk_level(score: float) -> str:
    if score >= 85:
        return "LOW"
    if score >= 70:
        return "MEDIUM"
    if score >= 50:
        return "HIGH"
    return "CRITICAL"


def _sorted_records(records: Iterable[Any]) -> List[Any]:
    def _extract_time(r: Any) -> datetime:
        t = r.get("time") if isinstance(r, dict) else getattr(r, "time", None)
        if isinstance(t, str):
            try:
                t = datetime.fromisoformat(t.replace("Z", "+00:00"))
            except Exception:
                return datetime.min.replace(tzinfo=timezone.utc)
        if isinstance(t, datetime):
            if t.tzinfo is None:
                t = t.replace(tzinfo=timezone.utc)
            return t
        return datetime.min.replace(tzinfo=timezone.utc)
    return sorted(records, key=_extract_time)


def _get(obj: Any, key: str, default: Any = 0.0) -> Any:
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


def analyze_driver_behavior(driver_id: uuid.UUID, records: Iterable[Any]) -> Dict[str, Any]:
    """Compute event-based driver analytics using lightweight statistical thresholds."""
    telemetry_records = _sorted_records(records)
    if not telemetry_records:
        return {
            "driver_id": str(driver_id),
            "safety_score": 100.0,
            "risk_level": "LOW",
            "harsh_braking_events": 0,
            "rapid_acceleration_events": 0,
            "speeding_events": 0,
            "excessive_idle_events": 0,
            "total_observations": 0,
            "summary": "No telemetry available for driver behavior analysis.",
        }

    harsh_braking_events = 0
    rapid_acceleration_events = 0
    speeding_events = 0
    idle_streak = 0
    excessive_idle_events = 0

    for idx in range(1, len(telemetry_records)):
        prev = telemetry_records[idx - 1]
        curr = telemetry_records[idx]

        prev_speed = float(_get(prev, "speed", 0.0))
        curr_speed = float(_get(curr, "speed", 0.0))
        curr_rpm = float(_get(curr, "rpm", 0.0))

        speed_drop = max(0.0, prev_speed - curr_speed)
        speed_gain = max(0.0, curr_speed - prev_speed)

        if prev_speed > 25.0 and speed_drop > 18.0:
            harsh_braking_events += 1

        if curr_speed > 90.0:
            speeding_events += 1

        if speed_gain > 15.0 and curr_rpm > 3500.0:
            rapid_acceleration_events += 1

        if curr_speed < 5.0 and 600.0 <= curr_rpm <= 1200.0:
            idle_streak += 1
            if idle_streak >= 3:
                excessive_idle_events += 1
                idle_streak = 0
        else:
            idle_streak = 0

    safety_score = 100.0
    safety_score -= harsh_braking_events * 8.0
    safety_score -= rapid_acceleration_events * 5.0
    safety_score -= speeding_events * 10.0
    safety_score -= excessive_idle_events * 6.0
    safety_score = _clamp(safety_score, 0.0, 100.0)

    return {
        "driver_id": str(driver_id),
        "safety_score": round(safety_score, 2),
        "risk_level": _driver_safety_risk_level(safety_score),
        "harsh_braking_events": harsh_braking_events,
        "rapid_acceleration_events": rapid_acceleration_events,
        "speeding_events": speeding_events,
        "excessive_idle_events": excessive_idle_events,
        "total_observations": len(telemetry_records),
        "summary": (
            f"Driver safety score: {round(safety_score, 2)}/100. "
            f"Harsh braking={harsh_braking_events}, rapid acceleration={rapid_acceleration_events}, "
            f"speeding={speeding_events}, excessive idling={excessive_idle_events}."
        ),
    }


def detect_telemetry_anomalies(records: Iterable[Any]) -> List[Dict[str, Any]]:
    """Detect abnormal speed, RPM, temperature, pressure, and sensor glitch conditions.
    Uses robust statistical thresholds rather than a heavy ML dependency.
    """
    telemetry_records = _sorted_records(records)
    if not telemetry_records:
        return []

    anomalies: List[Dict[str, Any]] = []
    speed_values = [float(_get(r, "speed", 0.0)) for r in telemetry_records]
    rpm_values = [float(_get(r, "rpm", 0.0)) for r in telemetry_records]
    temp_values = [float(_get(r, "engine_temp_c", 0.0)) for r in telemetry_records]
    oil_values = [float(_get(r, "oil_pressure_psi", 0.0)) for r in telemetry_records]
    tire_values = [float(_get(r, "tire_pressure_psi", 0.0)) for r in telemetry_records]
    voltage_values = [float(_get(r, "battery_voltage", 0.0)) for r in telemetry_records]

    speed_mean = _safe_mean(speed_values)
    speed_std = _safe_stdev(speed_values)
    rpm_mean = _safe_mean(rpm_values)
    rpm_std = _safe_stdev(rpm_values)
    temp_mean = _safe_mean(temp_values)
    temp_std = _safe_stdev(temp_values)
    oil_mean = _safe_mean(oil_values)
    tire_mean = _safe_mean(tire_values)

    for rec in telemetry_records:
        rec_speed = float(_get(rec, "speed", 0.0))
        rec_rpm = float(_get(rec, "rpm", 0.0))
        rec_temp = float(_get(rec, "engine_temp_c", 0.0))
        rec_oil = float(_get(rec, "oil_pressure_psi", 0.0))
        rec_tire = float(_get(rec, "tire_pressure_psi", 0.0))
        rec_voltage = float(_get(rec, "battery_voltage", 0.0))
        rec_time = _get(rec, "time")
        rec_time_str = rec_time.isoformat() if hasattr(rec_time, "isoformat") else str(rec_time)
        rec_vid = str(_get(rec, "vehicle_id", ""))

        checks = [
            {
                "metric_name": "speed",
                "value": rec_speed,
                "expected_range": "0-105 km/h",
                "subsystem": "DYNAMICS",
                "threshold": lambda v: v > 105.0 or v < 0.0,
            },
            {
                "metric_name": "rpm",
                "value": rec_rpm,
                "expected_range": "800-5500 RPM",
                "subsystem": "POWERTRAIN",
                "threshold": lambda v: v > 5500.0 or v < 600.0,
            },
            {
                "metric_name": "engine_temp_c",
                "value": rec_temp,
                "expected_range": "82-100°C",
                "subsystem": "COOLING",
                "threshold": lambda v: v > 106.0 or v < 20.0,
            },
            {
                "metric_name": "oil_pressure_psi",
                "value": rec_oil,
                "expected_range": "25-65 PSI",
                "subsystem": "LUBRICATION",
                "threshold": lambda v: v < 20.0 or v > 75.0,
            },
            {
                "metric_name": "tire_pressure_psi",
                "value": rec_tire,
                "expected_range": "30-38 PSI",
                "subsystem": "TIRES",
                "threshold": lambda v: v < 26.0 or v > 40.0,
            },
            {
                "metric_name": "battery_voltage",
                "value": rec_voltage,
                "expected_range": "11.8-14.8 V",
                "subsystem": "ELECTRICAL",
                "threshold": lambda v: v < 11.5 or v > 14.9,
            },
        ]

        for item in checks:
            value = item["value"]
            if not item["threshold"](value):
                continue

            zscore = 0.0
            if item["metric_name"] == "speed":
                zscore = abs(value - speed_mean) / speed_std if speed_std else 0.0
            elif item["metric_name"] == "rpm":
                zscore = abs(value - rpm_mean) / rpm_std if rpm_std else 0.0
            elif item["metric_name"] == "engine_temp_c":
                zscore = abs(value - temp_mean) / temp_std if temp_std else 0.0
            elif item["metric_name"] == "oil_pressure_psi":
                zscore = abs(value - oil_mean) / max(1.0, abs(oil_mean) * 0.1)
            elif item["metric_name"] == "tire_pressure_psi":
                zscore = abs(value - tire_mean) / max(1.0, abs(tire_mean) * 0.15)

            anomaly_score = _clamp(0.55 + min(zscore / 5.0, 0.45), 0.55, 0.99)
            reason = {
                "speed": "Vehicle speed exceeds safe operating envelope.",
                "rpm": "Engine RPM outside expected operating range.",
                "engine_temp_c": "Engine coolant temperature indicates overheating or sensor fault.",
                "oil_pressure_psi": "Oil pressure is critically low or abnormally high.",
                "tire_pressure_psi": "Tire pressure drift indicates underinflation or degradation.",
                "battery_voltage": "Battery voltage indicates electrical instability or a glitch.",
            }.get(item["metric_name"], "Telemetry value is outside normal operating range.")

            if item["metric_name"] == "engine_temp_c" and value in (-40.0, 195.0, 215.0):
                reason = "Impossible engine temperature reading suggests a sensor glitch."
                anomaly_score = 0.95
            if item["metric_name"] == "rpm" and value in (0.0, 7200.0, 6800.0):
                reason = "RPM signal is erratic and likely sensor-corrupted."
                anomaly_score = 0.93

            anomalies.append(
                {
                    "vehicle_id": rec_vid,
                    "timestamp": rec_time_str,
                    "metric_name": item["metric_name"],
                    "metric_value": float(value),
                    "expected_range": item["expected_range"],
                    "anomaly_score": round(anomaly_score, 3),
                    "anomaly_reason": reason,
                    "subsystem": item["subsystem"],
                    "status": "DETECTED",
                }
            )

    return anomalies


def assess_vehicle_health(vehicle_id: uuid.UUID, records: Iterable[Any]) -> Dict[str, Any]:
    """Score overall vehicle health using live telemetry and anomaly statistics."""
    telemetry_records = _sorted_records(records)
    if not telemetry_records:
        return {
            "vehicle_id": str(vehicle_id),
            "health_score": 100.0,
            "status": "GOOD",
            "risk_factors": [],
            "summary": "No telemetry available for health assessment.",
        }

    avg_temp = _safe_mean(float(_get(r, "engine_temp_c", 0.0)) for r in telemetry_records)
    avg_oil = _safe_mean(float(_get(r, "oil_pressure_psi", 0.0)) for r in telemetry_records)
    avg_tire = _safe_mean(float(_get(r, "tire_pressure_psi", 0.0)) for r in telemetry_records)
    avg_battery = _safe_mean(float(_get(r, "battery_voltage", 0.0)) for r in telemetry_records)
    avg_rpm = _safe_mean(float(_get(r, "rpm", 0.0)) for r in telemetry_records)
    fuel_avg = _safe_mean(float(_get(r, "fuel_level_pct", 0.0)) for r in telemetry_records)
    anomalies = detect_telemetry_anomalies(telemetry_records)

    health_score = 100.0
    risk_factors: List[str] = []

    if avg_temp > 95:
        health_score -= 18.0
        risk_factors.append("engine_temp_high")
    if avg_oil < 35:
        health_score -= 12.0
        risk_factors.append("oil_pressure_low")
    if avg_tire < 30:
        health_score -= 10.0
        risk_factors.append("tire_pressure_low")
    if avg_battery < 12.2:
        health_score -= 8.0
        risk_factors.append("battery_voltage_low")
    if fuel_avg < 20:
        health_score -= 8.0
        risk_factors.append("fuel_low")
    if avg_rpm > 3500:
        health_score -= 6.0
        risk_factors.append("rpm_high")
    health_score -= len(anomalies) * 4.0
    if len(anomalies) > 0:
        risk_factors.append("anomaly_detected")

    health_score = _clamp(health_score, 0.0, 100.0)
    status = "GOOD" if health_score >= 80 else "WARNING" if health_score >= 50 else "CRITICAL"

    return {
        "vehicle_id": str(vehicle_id),
        "health_score": round(health_score, 2),
        "status": status,
        "risk_factors": risk_factors,
        "summary": (
            f"Vehicle health score {round(health_score, 2)}/100. "
            f"Avg temp={avg_temp:.1f}°C, oil={avg_oil:.1f} PSI, tire={avg_tire:.1f} PSI, battery={avg_battery:.2f} V."
        ),
    }


def predict_maintenance(vehicle_id: uuid.UUID, records: Iterable[Any]) -> Dict[str, Any]:
    """Estimate maintenance likelihood and recommended action using a rule-based predictive model."""
    telemetry_records = _sorted_records(records)
    if not telemetry_records:
        return {
            "vehicle_id": str(vehicle_id),
            "risk_score": 0.0,
            "risk_level": "LOW",
            "recommendation": "No active maintenance risk detected; continue routine inspection.",
            "estimated_rul_km": 20000,
            "contributing_factors": [],
        }

    avg_temp = _safe_mean(float(_get(r, "engine_temp_c", 0.0)) for r in telemetry_records)
    avg_oil = _safe_mean(float(_get(r, "oil_pressure_psi", 0.0)) for r in telemetry_records)
    avg_tire = _safe_mean(float(_get(r, "tire_pressure_psi", 0.0)) for r in telemetry_records)
    avg_rpm = _safe_mean(float(_get(r, "rpm", 0.0)) for r in telemetry_records)
    anomaly_count = len(detect_telemetry_anomalies(telemetry_records))

    risk_score = 0.0
    contributing_factors: List[Dict[str, Any]] = []

    if avg_temp > 95:
        risk_score += min(28.0, (avg_temp - 95.0) * 2.5)
        contributing_factors.append({"factor": "engine_temp_c", "weight": round(min(28.0, (avg_temp - 95.0) * 2.5), 2)})
    if avg_oil < 35:
        risk_score += min(26.0, (35.0 - avg_oil) * 2.3)
        contributing_factors.append({"factor": "oil_pressure_psi", "weight": round(min(26.0, (35.0 - avg_oil) * 2.3), 2)})
    if avg_tire < 30:
        risk_score += min(18.0, (30.0 - avg_tire) * 2.2)
        contributing_factors.append({"factor": "tire_pressure_psi", "weight": round(min(18.0, (30.0 - avg_tire) * 2.2), 2)})
    if avg_rpm > 3000:
        risk_score += min(16.0, (avg_rpm - 3000.0) * 0.01)
        contributing_factors.append({"factor": "rpm", "weight": round(min(16.0, (avg_rpm - 3000.0) * 0.01), 2)})
    risk_score += anomaly_count * 6.0
    if anomaly_count:
        contributing_factors.append({"factor": "telemetry_anomalies", "weight": round(anomaly_count * 6.0, 2)})

    risk_score = _clamp(risk_score, 0.0, 100.0)
    risk_level = _risk_level_from_score(risk_score)

    if risk_level == "LOW":
        recommendation = "Continue scheduled maintenance and monitor trend lines during the next inspection cycle."
    elif risk_level == "MEDIUM":
        recommendation = "Inspect cooling system, oil pressure, and tire condition before the next long haul."
    elif risk_level == "HIGH":
        recommendation = "Schedule preventive maintenance within 72 hours and verify sensor health."
    else:
        recommendation = "Immediate service is recommended: check engine cooling, lubrication, and braking integrity before dispatch."

    estimated_rul_km = max(300, int(18000 - (risk_score * 180)))

    return {
        "vehicle_id": str(vehicle_id),
        "risk_score": round(risk_score, 2),
        "risk_level": risk_level,
        "recommendation": recommendation,
        "estimated_rul_km": estimated_rul_km,
        "contributing_factors": contributing_factors,
    }


async def persist_driver_behavior_analysis(db: AsyncSession, driver_id: uuid.UUID, analysis: Dict[str, Any]) -> None:
    driver = await db.get(Driver, driver_id)
    if driver:
        driver.overall_safety_score = float(analysis.get("safety_score", driver.overall_safety_score))
        driver.status = "ACTIVE" if driver.overall_safety_score >= 50 else "ON_LEAVE"

    # Resolve associated vehicle for driver event persistence
    vehicle_result = await db.execute(select(Vehicle).where(Vehicle.assigned_driver_id == driver_id))
    vehicle = vehicle_result.scalars().first()
    if not vehicle:
        all_vehicles = await db.execute(select(Vehicle).limit(1))
        vehicle = all_vehicles.scalars().first()

    vehicle_id = vehicle.id if vehicle else None
    if not vehicle_id:
        return

    if analysis.get("harsh_braking_events", 0) > 0:
        db.add(
            DriverEvent(
                driver_id=driver_id,
                vehicle_id=vehicle_id,
                timestamp=datetime.now(timezone.utc),
                event_type="HARSH_BRAKE",
                severity="HIGH",
                value=float(analysis["harsh_braking_events"]),
                duration_seconds=30.0,
                latitude=0.0,
                longitude=0.0,
            )
        )

    if analysis.get("rapid_acceleration_events", 0) > 0:
        db.add(
            DriverEvent(
                driver_id=driver_id,
                vehicle_id=vehicle_id,
                timestamp=datetime.now(timezone.utc),
                event_type="RAPID_ACCEL",
                severity="MEDIUM",
                value=float(analysis["rapid_acceleration_events"]),
                duration_seconds=20.0,
                latitude=0.0,
                longitude=0.0,
            )
        )

    if analysis.get("speeding_events", 0) > 0:
        db.add(
            DriverEvent(
                driver_id=driver_id,
                vehicle_id=vehicle_id,
                timestamp=datetime.now(timezone.utc),
                event_type="OVERSPEEDING",
                severity="HIGH",
                value=float(analysis["speeding_events"]),
                duration_seconds=60.0,
                latitude=0.0,
                longitude=0.0,
            )
        )

    if analysis.get("excessive_idle_events", 0) > 0:
        db.add(
            DriverEvent(
                driver_id=driver_id,
                vehicle_id=vehicle_id,
                timestamp=datetime.now(timezone.utc),
                event_type="EXCESSIVE_IDLE",
                severity="MEDIUM",
                value=float(analysis["excessive_idle_events"]),
                duration_seconds=180.0,
                latitude=0.0,
                longitude=0.0,
            )
        )


async def persist_anomaly_records(db: AsyncSession, anomalies: List[Dict[str, Any]]) -> None:
    if not anomalies:
        return

    for item in anomalies:
        vehicle_id = uuid.UUID(item["vehicle_id"]) if isinstance(item["vehicle_id"], str) else item["vehicle_id"]
        db.add(
            Anomaly(
                vehicle_id=vehicle_id,
                timestamp=datetime.fromisoformat(item["timestamp"]),
                metric_name=item["metric_name"],
                metric_value=float(item["metric_value"]),
                expected_range=item["expected_range"],
                anomaly_score=float(item["anomaly_score"]),
                anomaly_reason=item["anomaly_reason"],
                subsystem=item["subsystem"],
                status=item["status"],
            )
        )


async def persist_prediction_record(db: AsyncSession, vehicle_id: uuid.UUID, prediction: Dict[str, Any]) -> None:
    db.add(
        Prediction(
            vehicle_id=vehicle_id,
            timestamp=datetime.now(timezone.utc),
            model_type="rule_based_maintenance_risk",
            risk_score=float(prediction["risk_score"]),
            risk_category=prediction["risk_level"],
            estimated_rul_km=prediction.get("estimated_rul_km"),
            contributing_factors=prediction.get("contributing_factors", []),
            recommended_action=prediction.get("recommendation"),
        )
    )


async def load_latest_telemetry_for_driver(db: AsyncSession, driver_id: uuid.UUID) -> List[Any]:
    from backend.app.services.ingestion import ingestion_service

    vehicles = await db.execute(select(Vehicle).where(Vehicle.assigned_driver_id == driver_id))
    vehicle_ids = [v.id for v in vehicles.scalars().all()]
    if not vehicle_ids:
        return []
    result = await db.execute(
        select(Telemetry)
        .where(Telemetry.vehicle_id.in_(vehicle_ids))
        .order_by(Telemetry.time.asc())
    )
    records = list(result.scalars().all())
    if not records:
        # Check live in-memory cache for assigned vehicles
        for v_id in vehicle_ids:
            cached = ingestion_service.get_latest_for_vehicle(v_id)
            if cached:
                records.append(cached)
    return records


async def load_latest_telemetry_for_vehicle(db: AsyncSession, vehicle_id: uuid.UUID) -> List[Any]:
    from backend.app.services.ingestion import ingestion_service

    result = await db.execute(
        select(Telemetry)
        .where(Telemetry.vehicle_id == vehicle_id)
        .order_by(Telemetry.time.asc())
    )
    records = list(result.scalars().all())
    if not records:
        cached = ingestion_service.get_latest_for_vehicle(vehicle_id)
        if cached:
            records.append(cached)
    return records
