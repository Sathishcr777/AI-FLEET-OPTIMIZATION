import json
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from backend.app.core.database import Base, get_db
from backend.app.main import app
from backend.app.models.driver import Driver
from backend.app.models.driver_event import DriverEvent
from backend.app.models.anomaly import Anomaly
from backend.app.models.prediction import Prediction
from backend.app.models.telemetry import Telemetry
from backend.app.models.vehicle import Vehicle
from backend.app.services.analytics import (
    analyze_driver_behavior,
    detect_telemetry_anomalies,
    assess_vehicle_health,
    predict_maintenance,
    persist_driver_behavior_analysis,
    persist_anomaly_records,
    persist_prediction_record,
)

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestAsyncSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


@pytest.fixture(scope="function")
async def db_session():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestAsyncSessionLocal() as session:
        # Driver 1: Active driver with assigned vehicle and telemetry
        driver = Driver(
            id=uuid.UUID("11111111-1111-1111-1111-111111111201"),
            name="Taylor Reed",
            license_number="DL-PH3-201",
            phone="+1-555-0201",
            status="ACTIVE",
            overall_safety_score=92.0,
            total_trips=20,
            total_distance_km=2500.0,
        )
        # Driver 2: Seeded driver with no telemetry records
        idle_driver = Driver(
            id=uuid.UUID("11111111-1111-1111-1111-111111111299"),
            name="Morgan Bailey",
            license_number="DL-PH3-299",
            phone="+1-555-0299",
            status="ACTIVE",
            overall_safety_score=100.0,
            total_trips=0,
            total_distance_km=0.0,
        )
        # Vehicle 1: Active truck with telemetry
        vehicle = Vehicle(
            id=uuid.UUID("22222222-2222-2222-2222-222222222201"),
            vin="1FTFW1ED4NFA88888",
            name="Phase3 Truck 88",
            vehicle_type="TRUCK",
            license_plate="FL-8801",
            status="ACTIVE",
            fuel_capacity_liters=100.0,
            total_mileage_km=68000.0,
            health_status="GOOD",
            assigned_driver_id=driver.id,
        )
        # Vehicle 2: Seeded vehicle with no telemetry
        idle_vehicle = Vehicle(
            id=uuid.UUID("22222222-2222-2222-2222-222222222299"),
            vin="1FTFW1ED4NFA77777",
            name="Phase3 Standby Van",
            vehicle_type="VAN",
            license_plate="FL-7799",
            status="ACTIVE",
            fuel_capacity_liters=60.0,
            total_mileage_km=12000.0,
            health_status="GOOD",
            assigned_driver_id=None,
        )
        session.add(driver)
        session.add(idle_driver)
        session.add(vehicle)
        session.add(idle_vehicle)

        base_time = datetime.now(timezone.utc)
        samples = [
            Telemetry(
                time=base_time - timedelta(minutes=5),
                vehicle_id=vehicle.id,
                latitude=37.7749,
                longitude=-122.4194,
                speed=80.0,
                rpm=2200.0,
                fuel_level_pct=82.0,
                engine_temp_c=92.0,
                oil_pressure_psi=46.0,
                tire_pressure_psi=34.0,
                battery_voltage=12.6,
                odometer_km=68000.0,
                is_anomaly=False,
            ),
            Telemetry(
                time=base_time - timedelta(minutes=4),
                vehicle_id=vehicle.id,
                latitude=37.7800,
                longitude=-122.4180,
                speed=120.0,
                rpm=4500.0,
                fuel_level_pct=81.5,
                engine_temp_c=94.0,
                oil_pressure_psi=44.0,
                tire_pressure_psi=34.0,
                battery_voltage=12.5,
                odometer_km=68005.0,
                is_anomaly=False,
            ),
            Telemetry(
                time=base_time - timedelta(minutes=3),
                vehicle_id=vehicle.id,
                latitude=37.7840,
                longitude=-122.4100,
                speed=0.0,
                rpm=750.0,
                fuel_level_pct=80.0,
                engine_temp_c=90.0,
                oil_pressure_psi=45.0,
                tire_pressure_psi=34.0,
                battery_voltage=12.7,
                odometer_km=68008.0,
                is_anomaly=False,
            ),
            Telemetry(
                time=base_time - timedelta(minutes=2),
                vehicle_id=vehicle.id,
                latitude=37.7900,
                longitude=-122.4030,
                speed=65.0,
                rpm=2100.0,
                fuel_level_pct=79.0,
                engine_temp_c=96.5,
                oil_pressure_psi=38.0,
                tire_pressure_psi=33.5,
                battery_voltage=12.4,
                odometer_km=68012.0,
                is_anomaly=True,
            ),
            Telemetry(
                time=base_time - timedelta(minutes=1),
                vehicle_id=vehicle.id,
                latitude=37.7950,
                longitude=-122.3950,
                speed=95.0,
                rpm=2800.0,
                fuel_level_pct=78.0,
                engine_temp_c=102.0,
                oil_pressure_psi=22.0,
                tire_pressure_psi=30.0,
                battery_voltage=12.1,
                odometer_km=68016.0,
                is_anomaly=True,
            ),
        ]
        session.add_all(samples)
        await session.commit()
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture(scope="function")
def client(db_session):
    async def override_get_db():
        async with TestAsyncSessionLocal() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


async def test_driver_behavior_analytics_service(db_session):
    result = await db_session.execute(select(Telemetry).order_by(Telemetry.time.asc()))
    records = result.scalars().all()
    analytics = analyze_driver_behavior(uuid.UUID("11111111-1111-1111-1111-111111111201"), records)

    assert 0 <= analytics["safety_score"] <= 100
    assert analytics["risk_level"] in {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
    assert analytics["harsh_braking_events"] >= 0
    assert analytics["rapid_acceleration_events"] >= 0
    assert analytics["speeding_events"] >= 0
    assert analytics["excessive_idle_events"] >= 0

    # Test persistence of driver behavior and events
    await persist_driver_behavior_analysis(db_session, uuid.UUID("11111111-1111-1111-1111-111111111201"), analytics)
    await db_session.commit()

    updated_driver = await db_session.get(Driver, uuid.UUID("11111111-1111-1111-1111-111111111201"))
    assert updated_driver.overall_safety_score == analytics["safety_score"]


async def test_telemetry_anomaly_detection_service(db_session):
    result = await db_session.execute(select(Telemetry).order_by(Telemetry.time.asc()))
    records = result.scalars().all()
    anomalies = detect_telemetry_anomalies(records)

    assert isinstance(anomalies, list)
    assert len(anomalies) >= 1
    assert any(item["metric_name"] in {"speed", "rpm", "engine_temp_c", "oil_pressure_psi", "tire_pressure_psi"} for item in anomalies)

    # Test persistence of anomalies
    await persist_anomaly_records(db_session, anomalies)
    await db_session.commit()

    stored_anomalies = (await db_session.execute(select(Anomaly))).scalars().all()
    assert len(stored_anomalies) >= 1


async def test_vehicle_health_and_maintenance_prediction_service(db_session):
    result = await db_session.execute(select(Telemetry).order_by(Telemetry.time.asc()))
    records = result.scalars().all()
    health = assess_vehicle_health(uuid.UUID("22222222-2222-2222-2222-222222222201"), records)
    maintenance = predict_maintenance(uuid.UUID("22222222-2222-2222-2222-222222222201"), records)

    assert 0 <= health["health_score"] <= 100
    assert health["status"] in {"GOOD", "WARNING", "CRITICAL"}
    assert 0 <= maintenance["risk_score"] <= 100
    assert maintenance["risk_level"] in {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
    assert isinstance(maintenance["recommendation"], str)

    # Test persistence of maintenance prediction
    await persist_prediction_record(db_session, uuid.UUID("22222222-2222-2222-2222-222222222201"), maintenance)
    await db_session.commit()

    stored_predictions = (await db_session.execute(select(Prediction))).scalars().all()
    assert len(stored_predictions) == 1
    assert stored_predictions[0].risk_score == maintenance["risk_score"]


def test_phase3_analytics_endpoints(client):
    driver_id = "11111111-1111-1111-1111-111111111201"
    vehicle_id = "22222222-2222-2222-2222-222222222201"

    driver_res = client.get(f"/api/v1/analytics/drivers/{driver_id}")
    assert driver_res.status_code == 200
    assert "safety_score" in driver_res.json()

    safety_res = client.get(f"/api/v1/analytics/drivers/{driver_id}/safety")
    assert safety_res.status_code == 200
    assert 0 <= safety_res.json()["safety_score"] <= 100

    anomalies_res = client.get(f"/api/v1/analytics/telemetry/anomalies?vehicle_id={vehicle_id}")
    assert anomalies_res.status_code == 200
    data = anomalies_res.json()
    assert isinstance(data["anomalies"], list)

    health_res = client.get(f"/api/v1/analytics/vehicles/{vehicle_id}/health")
    assert health_res.status_code == 200
    assert "health_score" in health_res.json()

    maintenance_res = client.get(f"/api/v1/analytics/vehicles/{vehicle_id}/maintenance")
    assert maintenance_res.status_code == 200
    assert "risk_score" in maintenance_res.json()


def test_analytics_edge_cases(client):
    """
    Test edge cases with explicit distinction between:
    1. Unknown (non-existent) driver/vehicle IDs -> returns 404 Not Found.
    2. Seeded existing driver with NO telemetry -> returns 200 OK baseline (safety_score=100.0).
    3. Seeded existing vehicle with NO telemetry -> returns 404 No telemetry found.
    """
    unknown_driver_id = str(uuid.uuid4())
    unknown_vehicle_id = str(uuid.uuid4())
    idle_driver_id = "11111111-1111-1111-1111-111111111299"
    idle_vehicle_id = "22222222-2222-2222-2222-222222222299"

    # 1. Non-existent driver -> 404 Not Found
    res_unknown_driver = client.get(f"/api/v1/analytics/drivers/{unknown_driver_id}")
    assert res_unknown_driver.status_code == 404
    assert "not found" in res_unknown_driver.json()["detail"].lower()

    res_unknown_driver_safety = client.get(f"/api/v1/analytics/drivers/{unknown_driver_id}/safety")
    assert res_unknown_driver_safety.status_code == 404
    assert "not found" in res_unknown_driver_safety.json()["detail"].lower()

    # 2. Existing seeded driver with NO telemetry -> 200 OK baseline contract
    res_idle_driver = client.get(f"/api/v1/analytics/drivers/{idle_driver_id}")
    assert res_idle_driver.status_code == 200
    data_idle = res_idle_driver.json()
    assert data_idle["driver_id"] == idle_driver_id
    assert data_idle["safety_score"] == 100.0
    assert data_idle["risk_level"] == "LOW"
    assert data_idle["total_observations"] == 0
    assert data_idle["harsh_braking_events"] == 0

    res_idle_safety = client.get(f"/api/v1/analytics/drivers/{idle_driver_id}/safety")
    assert res_idle_safety.status_code == 200
    assert res_idle_safety.json()["safety_score"] == 100.0
    assert res_idle_safety.json()["risk_level"] == "LOW"

    # 3. Non-existent vehicle -> 404 Not Found
    res_unknown_health = client.get(f"/api/v1/analytics/vehicles/{unknown_vehicle_id}/health")
    assert res_unknown_health.status_code == 404
    assert "not found" in res_unknown_health.json()["detail"].lower()

    res_unknown_maint = client.get(f"/api/v1/analytics/vehicles/{unknown_vehicle_id}/maintenance")
    assert res_unknown_maint.status_code == 404
    assert "not found" in res_unknown_maint.json()["detail"].lower()

    res_unknown_anomalies = client.get(f"/api/v1/analytics/telemetry/anomalies?vehicle_id={unknown_vehicle_id}")
    assert res_unknown_anomalies.status_code == 404
    assert "not found" in res_unknown_anomalies.json()["detail"].lower()

    # 4. Existing vehicle with NO telemetry -> 404 No telemetry found for health/maintenance, empty anomalies list
    res_idle_health = client.get(f"/api/v1/analytics/vehicles/{idle_vehicle_id}/health")
    assert res_idle_health.status_code == 404
    assert "no telemetry found" in res_idle_health.json()["detail"].lower()

    res_idle_maint = client.get(f"/api/v1/analytics/vehicles/{idle_vehicle_id}/maintenance")
    assert res_idle_maint.status_code == 404
    assert "no telemetry found" in res_idle_maint.json()["detail"].lower()

    res_idle_anomalies = client.get(f"/api/v1/analytics/telemetry/anomalies?vehicle_id={idle_vehicle_id}")
    assert res_idle_anomalies.status_code == 200
    assert res_idle_anomalies.json()["anomalies"] == []


@pytest.mark.asyncio
async def test_telemetry_deduplication_and_ordering():
    """
    Verify per-vehicle exact packet deduplication and robust out-of-order handling:
    1. Exact duplicate packets (e.g. from both simulator and MQTT) are suppressed.
    2. Newer valid packets update latest cache.
    3. Legitimate out-of-order historical packets are accepted but do not regress latest cache.
    4. Multiple vehicles maintain isolated, independent deduplication ring buffers.
    """
    from backend.app.services.ingestion import IngestionService

    service = IngestionService()
    v1_id = uuid.uuid4()
    v2_id = uuid.uuid4()
    t0 = datetime(2026, 8, 30, 12, 0, 0, tzinfo=timezone.utc)
    t1 = datetime(2026, 8, 30, 12, 0, 1, tzinfo=timezone.utc)
    t_past = datetime(2026, 8, 30, 11, 59, 50, tzinfo=timezone.utc)

    packet_v1_t0 = {
        "vehicle_id": str(v1_id),
        "time": t0.isoformat(),
        "latitude": 37.7749,
        "longitude": -122.4194,
        "speed": 65.0,
        "rpm": 2100.0,
        "fuel_level_pct": 85.0,
        "engine_temp_c": 90.0,
        "oil_pressure_psi": 45.0,
        "tire_pressure_psi": 34.0,
        "battery_voltage": 12.6,
        "odometer_km": 10000.0,
        "is_anomaly": False,
    }

    # 1. First arrival of packet_v1_t0 -> Accepted
    res1 = await service.process_telemetry(packet_v1_t0)
    assert res1 is True
    assert service.get_latest_for_vehicle(v1_id).speed == 65.0

    # 2. Duplicate arrival of exact same packet -> Suppressed (returns False)
    res_dup = await service.process_telemetry(packet_v1_t0)
    assert res_dup is False

    # 3. Newer packet for v1 at t1 -> Accepted, cache updated to speed=70.0
    packet_v1_t1 = dict(packet_v1_t0, time=t1.isoformat(), speed=70.0, odometer_km=10000.02)
    res2 = await service.process_telemetry(packet_v1_t1)
    assert res2 is True
    assert service.get_latest_for_vehicle(v1_id).speed == 70.0

    # 4. Out-of-order packet (past timestamp) -> Accepted into pipeline, but cache keeps newest state (t1)
    packet_v1_past = dict(packet_v1_t0, time=t_past.isoformat(), speed=55.0, odometer_km=9999.8)
    res_past = await service.process_telemetry(packet_v1_past)
    assert res_past is True
    assert service.get_latest_for_vehicle(v1_id).speed == 70.0
    assert service.get_latest_for_vehicle(v1_id).time == t1

    # 5. Multi-vehicle isolation: v2 can ingest at t0 without being blocked by v1's signatures
    packet_v2_t0 = dict(packet_v1_t0, vehicle_id=str(v2_id), speed=80.0)
    res_v2 = await service.process_telemetry(packet_v2_t0)
    assert res_v2 is True
    assert service.get_latest_for_vehicle(v2_id).speed == 80.0


def test_websocket_vehicle_specific_streaming(client):
    """
    Verify WebSocket channel filtering:
    - Fleet client receives all vehicle updates.
    - Vehicle-specific client only receives telemetry for its subscribed vehicle.
    """
    v_a = str(uuid.uuid4())
    v_b = str(uuid.uuid4())

    with client.websocket_connect("/api/v1/ws/telemetry") as ws_fleet:
        with client.websocket_connect(f"/api/v1/ws/telemetry/{v_a}") as ws_v_a:
            # 1. Ingest telemetry for Vehicle A
            client.post("/api/v1/telemetry/ingest", json={
                "vehicle_id": v_a,
                "time": datetime.now(timezone.utc).isoformat(),
                "latitude": 37.77,
                "longitude": -122.41,
                "speed": 60.0,
                "rpm": 2000.0,
                "fuel_level_pct": 80.0,
                "engine_temp_c": 90.0,
                "oil_pressure_psi": 45.0,
                "tire_pressure_psi": 34.0,
                "battery_voltage": 12.6,
                "odometer_km": 100.0,
                "is_anomaly": False,
            })

            # Both fleet and vehicle A client receive the update
            msg_fleet = json.loads(ws_fleet.receive_text())
            assert msg_fleet["type"] == "TELEMETRY_UPDATE"
            assert msg_fleet["data"]["vehicle_id"] == v_a

            msg_va = json.loads(ws_v_a.receive_text())
            assert msg_va["type"] == "TELEMETRY_UPDATE"
            assert msg_va["data"]["vehicle_id"] == v_a

            # 2. Ingest telemetry for Vehicle B
            client.post("/api/v1/telemetry/ingest", json={
                "vehicle_id": v_b,
                "time": datetime.now(timezone.utc).isoformat(),
                "latitude": 37.78,
                "longitude": -122.42,
                "speed": 75.0,
                "rpm": 2300.0,
                "fuel_level_pct": 85.0,
                "engine_temp_c": 91.0,
                "oil_pressure_psi": 46.0,
                "tire_pressure_psi": 34.0,
                "battery_voltage": 12.6,
                "odometer_km": 200.0,
                "is_anomaly": False,
            })

            # Fleet receives Vehicle B update
            msg_fleet_b = json.loads(ws_fleet.receive_text())
            assert msg_fleet_b["data"]["vehicle_id"] == v_b

            # Send a ping on vehicle A client to verify it did not receive Vehicle B's message
            ws_v_a.send_text("ping")
            reply = json.loads(ws_v_a.receive_text())
            assert reply["type"] == "pong"


def test_fleet_anomaly_live_cache_fallback(client):
    """
    Verify that GET /api/v1/analytics/telemetry/anomalies falls back to live in-memory
    telemetry cache when database has no records.
    """
    from backend.app.services.ingestion import ingestion_service

    sim_v_id = uuid.UUID("22222222-2222-2222-2222-222222222201")
    # Ingest an engine overheat anomaly directly into ingestion cache
    overheat_payload = {
        "vehicle_id": str(sim_v_id),
        "time": datetime.now(timezone.utc).isoformat(),
        "latitude": 37.7749,
        "longitude": -122.4194,
        "speed": 82.0,
        "rpm": 3100.0,
        "fuel_level_pct": 75.0,
        "engine_temp_c": 124.5,  # Anomaly: > 105.0 C
        "oil_pressure_psi": 44.0,
        "tire_pressure_psi": 34.0,
        "battery_voltage": 12.6,
        "odometer_km": 48300.0,
        "is_anomaly": True,
    }
    client.post("/api/v1/telemetry/ingest", json=overheat_payload)

    # Query fleet-wide anomalies
    res = client.get("/api/v1/analytics/telemetry/anomalies")
    assert res.status_code == 200
    data = res.json()
    assert "anomalies" in data
    # At least one anomaly should be detected for the overheating vehicle
    anomalies = data["anomalies"]
    overheat_anomalies = [a for a in anomalies if a["metric_name"] == "engine_temp_c"]
    assert len(overheat_anomalies) >= 1
    assert overheat_anomalies[0]["metric_value"] == 124.5


@pytest.mark.asyncio
async def test_malformed_telemetry_handling():
    """Verify ingestion service handles malformed payloads gracefully without crashing."""
    from backend.app.services.ingestion import IngestionService

    service = IngestionService()
    # Missing required fields
    assert await service.process_telemetry({}) is False
    assert await service.process_telemetry({"vehicle_id": "not-a-uuid"}) is False
    assert await service.process_telemetry({"vehicle_id": str(uuid.uuid4()), "speed": "invalid"}) is False
