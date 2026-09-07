"""
FleetIQ - Phase 4 Route Optimization & Intelligent Alert Engine Standalone Verification Script
Tests alerts evaluation, cooldown deduplication, triage state machine, 2-opt TSP routing, and REST APIs.
"""

import sys
import uuid
import asyncio
from datetime import datetime, timezone
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from backend.app.main import app
from backend.app.core.database import get_db, Base
from backend.app.models.driver import Driver
from backend.app.models.vehicle import Vehicle
from backend.app.models.alert import Alert
from backend.app.models.route import Route
from backend.app.schemas.alert import AlertSeverity, AlertStatus, AlertType
from backend.app.schemas.route import Waypoint, RouteOptimizeRequest
from backend.app.services.alert_engine import AlertEngine
from backend.app.services.route_optimizer import route_optimizer, haversine_distance_km

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"
engine = create_async_engine(TEST_DB_URL, echo=False)
SessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False, class_=AsyncSession)


async def override_get_db():
    async with SessionLocal() as session:
        yield session


async def setup_verification_db():
    app.dependency_overrides[get_db] = override_get_db
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as session:
        driver = Driver(
            id=uuid.UUID("11111111-1111-1111-1111-111111111499"),
            name="Marcus Vance",
            license_number="DL-PH4-VERIFY",
            phone="+1-555-0499",
            status="ACTIVE",
            overall_safety_score=94.0,
            total_trips=20,
            total_distance_km=3200.0,
        )
        vehicle = Vehicle(
            id=uuid.UUID("22222222-2222-2222-2222-222222222499"),
            vin="1FTFW1ED4NFA77799",
            name="Verify Route Cargo Van",
            vehicle_type="VAN",
            license_plate="FL-7799",
            status="ACTIVE",
            fuel_capacity_liters=80.0,
            total_mileage_km=30000.0,
            health_status="GOOD",
            assigned_driver_id=driver.id,
        )
        session.add(driver)
        session.add(vehicle)
        await session.commit()


def main():
    print("=" * 70)
    print("  FleetIQ - Phase 4 Route Optimization & Alert Engine Verification")
    print("=" * 70)

    asyncio.run(setup_verification_db())
    client = TestClient(app)
    v_id = "22222222-2222-2222-2222-222222222499"

    # [1/5] Alert Rule Evaluations
    print("\n[1/5] Testing Alert Rule Evaluations...")
    alert_svc = AlertEngine(cooldown_seconds=60)
    overheat_cand = alert_svc.evaluate_telemetry({
        "vehicle_id": v_id,
        "engine_temp_c": 118.0,
        "speed": 55.0,
        "oil_pressure_psi": 40.0,
        "tire_pressure_psi": 34.0,
        "battery_voltage": 13.5,
    })
    assert len(overheat_cand) == 1
    assert overheat_cand[0]["severity"] == "CRITICAL"
    assert overheat_cand[0]["alert_type"] == "ENGINE_OVERHEAT"

    low_oil_cand = alert_svc.evaluate_telemetry({
        "vehicle_id": v_id,
        "engine_temp_c": 90.0,
        "speed": 55.0,
        "oil_pressure_psi": 14.0,
        "tire_pressure_psi": 34.0,
        "battery_voltage": 13.5,
    })
    assert len(low_oil_cand) == 1
    assert low_oil_cand[0]["severity"] == "CRITICAL"

    # Driver Behavior Intelligence Alerts
    d_alerts = alert_svc.evaluate_driver_behavior(
        driver_id=uuid.UUID("11111111-1111-1111-1111-111111111499"),
        behavior_analytics={
            "harsh_braking_events": 2,
            "rapid_acceleration_events": 1,
            "speeding_events": 3,
            "excessive_idle_events": 2,
            "safety_score": 62.0,
        },
        vehicle_id=uuid.UUID(v_id),
    )
    assert len(d_alerts) == 5
    d_types = {a["alert_type"] for a in d_alerts}
    assert "HARSH_BRAKE" in d_types
    assert "RAPID_ACCEL" in d_types
    assert "OVERSPEEDING" in d_types
    assert "EXCESSIVE_IDLE" in d_types

    # Predictive Maintenance & Health Intelligence Alerts
    m_alerts = alert_svc.evaluate_predictive_maintenance(
        vehicle_id=uuid.UUID(v_id),
        risk_score=0.89,
        risk_category="CRITICAL",
        health_status="CRITICAL",
    )
    assert len(m_alerts) == 1
    assert m_alerts[0]["alert_type"] == "CRITICAL_MAINTENANCE_RISK"

    print("  [OK] Critical telemetry & Phase 3 intelligence rules verified (Overheat, Oil, Harsh Brake, Idle, Speed, Maintenance Risk).")

    # [2/5] Alert Cooldown & Deduplication
    print("\n[2/5] Testing Alert Cooldown & Deduplication...")
    d1 = alert_svc.process_and_deduplicate(overheat_cand)
    assert len(d1) == 1
    d2 = alert_svc.process_and_deduplicate(overheat_cand)
    assert len(d2) == 0  # Cooldown suppressed
    print("  [OK] Alert cooldown suppression verified (Duplicate ongoing packets safely ignored).")

    # [3/5] Alerts REST API & Triage State Machine
    print("\n[3/5] Testing Alerts REST API & Triage Flow...")
    res_create = client.post("/api/v1/alerts", json={
        "vehicle_id": v_id,
        "alert_type": "ENGINE_OVERHEAT",
        "severity": "CRITICAL",
        "status": "ACTIVE",
        "title": "Cooling System Failure",
        "message": "Coolant temperature exceeded 118°C.",
        "metric_name": "engine_temp_c",
        "metric_value": 118.0,
        "threshold_value": "> 105.0°C",
        "recommended_action": "Pull over immediately.",
    })
    assert res_create.status_code == 201
    alert_id = res_create.json()["id"]

    res_list = client.get("/api/v1/alerts")
    assert res_list.status_code == 200
    assert res_list.json()["summary"]["total"] >= 1

    res_ack = client.post(f"/api/v1/alerts/{alert_id}/acknowledge")
    assert res_ack.status_code == 200
    assert res_ack.json()["status"] == "ACKNOWLEDGED"

    res_resolve = client.post(f"/api/v1/alerts/{alert_id}/resolve")
    assert res_resolve.status_code == 200
    assert res_resolve.json()["status"] == "RESOLVED"
    print("  [OK] Alert triage state machine verified (ACTIVE -> ACKNOWLEDGED -> RESOLVED).")

    # [4/5] 2-Opt TSP Route Optimization Engine
    print("\n[4/5] Testing 2-Opt TSP Route Optimization Engine...")
    depot = Waypoint(name="Logistics Depot SF", latitude=37.7749, longitude=-122.4194)
    stops = [
        Waypoint(name="Stop South", latitude=37.3382, longitude=-121.8863),
        Waypoint(name="Stop North", latitude=37.9735, longitude=-122.5311),
        Waypoint(name="Stop East", latitude=37.6688, longitude=-122.0808),
        Waypoint(name="Stop Peninsula", latitude=37.5630, longitude=-122.3255),
    ]
    opt_req = RouteOptimizeRequest(
        name="Bay Area Optimized Route",
        origin=depot,
        destination=depot,
        stops=stops,
        average_speed_kmh=60.0,
        fuel_consumption_rate_l_per_100km=12.0,
        fuel_cost_per_liter=1.50,
    )
    opt_res = route_optimizer.optimize_route(opt_req)
    comp = opt_res.comparison
    assert comp.optimized_distance_km <= comp.original_distance_km
    assert comp.distance_saved_km >= 0.0
    assert comp.cost_saved_usd >= 0.0
    print(f"  [OK] 2-Opt TSP optimization verified: Saved {comp.distance_saved_km} km ({comp.distance_saved_pct}%), ${comp.cost_saved_usd} USD.")

    # [5/5] Routes REST API & Persistence
    print("\n[5/5] Testing Routes REST API & Database Persistence...")
    opt_payload = {
        "name": "Persisted Test Delivery Corridor",
        "origin": {"name": "Depot", "latitude": 37.7749, "longitude": -122.4194},
        "destination": {"name": "Depot", "latitude": 37.7749, "longitude": -122.4194},
        "stops": [
            {"name": "Stop 1", "latitude": 37.7833, "longitude": -122.4167},
            {"name": "Stop 2", "latitude": 37.7955, "longitude": -122.3937},
        ],
        "save_to_database": True,
    }
    res_route = client.post("/api/v1/routes/optimize", json=opt_payload)
    assert res_route.status_code == 200
    route_id = res_route.json()["route_id"]

    res_get_route = client.get(f"/api/v1/routes/{route_id}")
    assert res_get_route.status_code == 200
    assert res_get_route.json()["name"] == "Persisted Test Delivery Corridor"

    res_list_routes = client.get("/api/v1/routes")
    assert res_list_routes.status_code == 200
    assert res_list_routes.json()["total"] >= 1
    print("  [OK] Routes API verified (Optimization, Persistence, History retrieval).")

    print("\n" + "=" * 70)
    print("  Phase 4 Verification Result: 5/5 Checks Passed (100% Success)")
    print("=" * 70)
    print("[SUCCESS] Phase 4: Route Optimization & Intelligent Alert Engine is fully operational!\n")


if __name__ == "__main__":
    main()
