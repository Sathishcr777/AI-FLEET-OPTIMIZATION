#!/usr/bin/env python3
"""FleetIQ Phase 3 AI/ML Intelligence & Analytics Verification Script."""

import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from backend.app.core.database import Base, get_db
from backend.app.main import app
from backend.app.models.driver import Driver
from backend.app.models.telemetry import Telemetry
from backend.app.models.vehicle import Vehicle
from backend.app.services.analytics import (
    analyze_driver_behavior,
    detect_telemetry_anomalies,
    assess_vehicle_health,
    predict_maintenance,
)


def print_banner(title: str):
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


async def setup_verification_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    session_factory = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed test vehicle and driver
    v_id = uuid.UUID("22222222-2222-2222-2222-222222222201")
    d_id = uuid.UUID("11111111-1111-1111-1111-111111111201")

    async with session_factory() as session:
        driver = Driver(
            id=d_id,
            name="Verification Driver",
            license_number="DL-VERIFY-001",
            phone="+1-555-0199",
            status="ACTIVE",
            overall_safety_score=95.0,
            total_trips=10,
            total_distance_km=1500.0,
        )
        vehicle = Vehicle(
            id=v_id,
            vin="1FTFW1ED4NFA99999",
            name="Verification Freight Van",
            vehicle_type="TRUCK",
            license_plate="VERIFY-01",
            status="ACTIVE",
            fuel_capacity_liters=90.0,
            total_mileage_km=35000.0,
            health_status="GOOD",
            assigned_driver_id=d_id,
        )
        telemetry = Telemetry(
            time=datetime.now(timezone.utc),
            vehicle_id=v_id,
            latitude=37.7749,
            longitude=-122.4194,
            speed=72.0,
            rpm=2150.0,
            fuel_level_pct=84.0,
            engine_temp_c=91.0,
            oil_pressure_psi=45.0,
            tire_pressure_psi=34.0,
            battery_voltage=12.6,
            odometer_km=35000.0,
            is_anomaly=False,
        )
        session.add_all([driver, vehicle, telemetry])
        await session.commit()

    async def override_get_db():
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()

    return engine, override_get_db


def verify_phase3():
    print_banner("FleetIQ - Phase 3 AI/ML Intelligence & Analytics Verification")
    checks_passed = 0
    total_checks = 5

    # 1. Driver Behavior Analytics
    try:
        driver_id = uuid.uuid4()
        vehicle_id = uuid.uuid4()
        records = [
            Telemetry(
                time=datetime.now(timezone.utc),
                vehicle_id=vehicle_id,
                latitude=37.7749,
                longitude=-122.4194,
                speed=75.0,
                rpm=2200.0,
                fuel_level_pct=80.0,
                engine_temp_c=91.0,
                oil_pressure_psi=42.0,
                tire_pressure_psi=34.0,
                battery_voltage=12.6,
                odometer_km=50000.0,
                is_anomaly=False,
            )
        ]
        analysis = analyze_driver_behavior(driver_id, records)
        assert 0 <= analysis["safety_score"] <= 100
        print("  [OK] Driver behavior analytics generated a valid safety score.")
        checks_passed += 1
    except Exception as exc:
        print(f"  [FAIL] Driver analytics check failed: {exc}")

    # 2. Telemetry Anomaly Detection
    try:
        anomaly_records = [
            Telemetry(
                time=datetime.now(timezone.utc),
                vehicle_id=uuid.uuid4(),
                latitude=37.7749,
                longitude=-122.4194,
                speed=122.0,
                rpm=6100.0,
                fuel_level_pct=80.0,
                engine_temp_c=110.0,
                oil_pressure_psi=18.0,
                tire_pressure_psi=24.0,
                battery_voltage=12.2,
                odometer_km=50000.0,
                is_anomaly=True,
            )
        ]
        anomalies = detect_telemetry_anomalies(anomaly_records)
        assert len(anomalies) >= 1
        print(f"  [OK] Telemetry anomaly detection flagged {len(anomalies)} anomaly events.")
        checks_passed += 1
    except Exception as exc:
        print(f"  [FAIL] Telemetry anomaly detection failed: {exc}")

    # 3. Vehicle Health Assessment
    try:
        health = assess_vehicle_health(uuid.uuid4(), anomaly_records)
        assert 0 <= health["health_score"] <= 100
        print(f"  [OK] Vehicle health assessment returned {health['status']} status.")
        checks_passed += 1
    except Exception as exc:
        print(f"  [FAIL] Vehicle health assessment failed: {exc}")

    # 4. Predictive Maintenance
    try:
        prediction = predict_maintenance(uuid.uuid4(), anomaly_records)
        assert 0 <= prediction["risk_score"] <= 100
        assert isinstance(prediction["recommendation"], str)
        print(f"  [OK] Maintenance prediction produced risk score {prediction['risk_score']}.")
        checks_passed += 1
    except Exception as exc:
        print(f"  [FAIL] Maintenance prediction failed: {exc}")

    # 5. FastAPI REST Analytics Endpoints with In-Memory DB Override
    try:
        engine, override_db = asyncio.run(setup_verification_db())
        app.dependency_overrides[get_db] = override_db

        client = TestClient(app)
        res_anomalies = client.get("/api/v1/analytics/telemetry/anomalies")
        assert res_anomalies.status_code == 200

        v_id_str = "22222222-2222-2222-2222-222222222201"
        res_health = client.get(f"/api/v1/analytics/vehicles/{v_id_str}/health")
        assert res_health.status_code == 200
        assert "health_score" in res_health.json()

        d_id_str = "11111111-1111-1111-1111-111111111201"
        res_driver = client.get(f"/api/v1/analytics/drivers/{d_id_str}")
        assert res_driver.status_code == 200
        assert "safety_score" in res_driver.json()

        print("  [OK] GET /api/v1/analytics endpoints verified (anomalies, vehicle health, driver analytics -> 200 OK).")
        checks_passed += 1
    except Exception as exc:
        print(f"  [FAIL] Analytics endpoint check failed: {exc}")
    finally:
        app.dependency_overrides.pop(get_db, None)

    print_banner(f"Phase 3 Verification Result: {checks_passed}/{total_checks} Checks Passed")
    if checks_passed == total_checks:
        print("[SUCCESS] Phase 3: AI analytics, anomaly detection, and predictive maintenance are operational.\n")
        return 0
    print("[ERROR] Phase 3 verification encountered errors.\n")
    return 1


if __name__ == "__main__":
    sys.exit(verify_phase3())
