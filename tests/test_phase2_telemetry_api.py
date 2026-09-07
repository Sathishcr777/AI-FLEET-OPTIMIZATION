import uuid
import pytest
import asyncio
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.core.database import Base, get_db
from backend.app.models.vehicle import Vehicle
from backend.app.models.driver import Driver
from backend.app.models.trip import Trip
from backend.app.schemas.scenario import ScenarioType
from backend.app.simulator.vehicle_sim import SimulatedVehicle
from backend.app.simulator.simulator_manager import SimulatorManager, SEED_VEHICLE_CONFIGS
from backend.app.services.ingestion import IngestionService
from backend.app.core.websocket_manager import WebSocketManager


# In-memory async SQLite engine for isolation testing
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
    """Create in-memory database tables and yield a clean session."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestAsyncSessionLocal() as session:
        # Seed test driver and vehicle
        driver = Driver(
            id=uuid.UUID("11111111-1111-1111-1111-111111111101"),
            name="Alex Johnson",
            license_number="DL-TEST-001",
            phone="+1-555-0101",
            status="ACTIVE",
            overall_safety_score=95.0,
            total_trips=10,
            total_distance_km=1200.0,
        )
        vehicle = Vehicle(
            id=uuid.UUID("22222222-2222-2222-2222-222222222201"),
            vin="1FTFW1ED4NFA99999",
            name="Alpha Fleet-01",
            vehicle_type="TRUCK",
            license_plate="FL-8021",
            status="ACTIVE",
            fuel_capacity_liters=100.0,
            total_mileage_km=48250.0,
            health_status="GOOD",
            assigned_driver_id=driver.id,
        )
        session.add(driver)
        session.add(vehicle)
        await session.commit()
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture(scope="function")
def client(db_session):
    """FastAPI TestClient with overridden get_db dependency."""
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


# ====================================================================
# 1. Simulator & Scenario Physics Tests
# ====================================================================

def test_simulated_vehicle_all_10_scenarios():
    """Verify that all 10 simulation scenarios alter vehicle metrics as expected."""
    v_id = uuid.uuid4()
    sim = SimulatedVehicle(vehicle_id=v_id, name="Test Sim Truck", route_offset=0)

    # 1. Normal Highway
    sim.trigger_scenario(ScenarioType.NORMAL_HIGHWAY, duration_seconds=5)
    packet = sim.step(dt_seconds=1.0)
    assert packet.speed > 70.0
    assert packet.is_anomaly is False

    # 2. Harsh Brake
    sim.trigger_scenario(ScenarioType.HARSH_BRAKE, duration_seconds=5)
    initial_speed = sim.speed_kmh
    packet = sim.step(dt_seconds=1.0)
    assert packet.speed < initial_speed
    assert sim.current_scenario == ScenarioType.HARSH_BRAKE

    # 3. Rapid Acceleration
    sim.trigger_scenario(ScenarioType.RAPID_ACCEL, duration_seconds=5)
    packet = sim.step(dt_seconds=1.0)
    assert packet.rpm > 3500.0

    # 4. Overspeeding
    sim.trigger_scenario(ScenarioType.OVERSPEEDING, duration_seconds=5)
    packet = sim.step(dt_seconds=2.0)
    assert packet.speed > 80.0

    # 5. Excessive Idle
    sim.trigger_scenario(ScenarioType.EXCESSIVE_IDLE, duration_seconds=5)
    packet = sim.step(dt_seconds=1.0)
    assert packet.speed == 0.0
    assert packet.rpm < 900.0

    # 6. Engine Overheating Anomaly
    sim.trigger_scenario(ScenarioType.ENGINE_OVERHEAT, duration_seconds=10)
    sim.step(dt_seconds=5.0)
    packet = sim.step(dt_seconds=1.0)
    assert packet.engine_temp_c > 92.0
    assert packet.is_anomaly is True

    # 7. Low Oil Pressure
    sim.trigger_scenario(ScenarioType.LOW_OIL_PRESSURE, duration_seconds=10)
    sim.step(dt_seconds=5.0)
    packet = sim.step(dt_seconds=1.0)
    assert packet.oil_pressure_psi < 40.0
    assert packet.is_anomaly is True

    # 8. Component Wear
    sim.trigger_scenario(ScenarioType.COMPONENT_WEAR, duration_seconds=5)
    packet = sim.step(dt_seconds=1.0)
    assert packet.tire_pressure_psi <= 34.0

    # 9. Sensor Glitch
    sim.trigger_scenario(ScenarioType.SENSOR_GLITCH, duration_seconds=5)
    packet = sim.step(dt_seconds=1.0)
    assert packet.is_anomaly is True

    # 10. Mixed Abnormal Conditions
    sim.trigger_scenario(ScenarioType.MIXED_ABNORMAL, duration_seconds=5)
    packet = sim.step(dt_seconds=1.0)
    assert packet.is_anomaly is True
    assert packet.engine_temp_c > 90.0
    assert packet.oil_pressure_psi < 45.0

    # 11. Reset to normal
    sim.reset_to_normal()
    assert sim.current_scenario == ScenarioType.NORMAL_HIGHWAY
    assert sim.is_scenario_active is False


def test_simulator_manager_status():
    """Verify SimulatorManager pools seed vehicles and reports status."""
    manager = SimulatorManager()
    status = manager.get_status()
    assert len(status.available_scenarios) == 11
    assert len(status.active_vehicles) == 5

    # Test trigger on first seed vehicle
    target_id = SEED_VEHICLE_CONFIGS[0]["id"]
    success = manager.trigger_scenario(target_id, ScenarioType.ENGINE_OVERHEAT, duration_seconds=15)
    assert success is True

    updated_status = manager.get_status()
    v_state = next(v for v in updated_status.active_vehicles if v.vehicle_id == target_id)
    assert v_state.current_scenario == ScenarioType.ENGINE_OVERHEAT
    assert v_state.is_active is True

    manager.reset_all()
    reset_state = next(v for v in manager.get_status().active_vehicles if v.vehicle_id == target_id)
    assert reset_state.is_active is False


# ====================================================================
# 2. REST API Endpoint Tests
# ====================================================================

def test_scenarios_endpoints(client):
    """Test GET /scenarios, POST /scenarios/trigger, and POST /scenarios/reset."""
    # List scenarios
    res = client.get("/api/v1/scenarios")
    assert res.status_code == 200
    data = res.json()
    assert len(data["available_scenarios"]) == 11

    # Trigger scenario
    target_id = str(SEED_VEHICLE_CONFIGS[0]["id"])
    trigger_res = client.post("/api/v1/scenarios/trigger", json={
        "vehicle_id": target_id,
        "scenario": "HARSH_BRAKE",
        "duration_seconds": 20,
    })
    assert trigger_res.status_code == 200
    assert trigger_res.json()["status"] == "success"

    # Reset scenarios
    reset_res = client.post("/api/v1/scenarios/reset")
    assert reset_res.status_code == 200
    assert reset_res.json()["status"] == "success"


def test_vehicles_crud_api(client):
    """Test full CRUD operations on /api/v1/vehicles."""
    # 1. List vehicles
    res = client.get("/api/v1/vehicles")
    assert res.status_code == 200
    vehicles = res.json()
    assert len(vehicles) >= 1

    # 2. Vehicle summary
    summary_res = client.get("/api/v1/vehicles/summary")
    assert summary_res.status_code == 200
    assert summary_res.json()["total_vehicles"] >= 1

    # 3. Create new vehicle
    new_vin = "1FTFW1ED4NFA00077"
    create_res = client.post("/api/v1/vehicles", json={
        "vin": new_vin,
        "name": "Fleet Courier 77",
        "vehicle_type": "VAN",
        "license_plate": "FL-7700",
        "fuel_capacity_liters": 70.0,
        "health_status": "GOOD",
    })
    assert create_res.status_code == 201
    created_id = create_res.json()["id"]

    # 4. Get detail
    detail_res = client.get(f"/api/v1/vehicles/{created_id}")
    assert detail_res.status_code == 200
    assert detail_res.json()["vin"] == new_vin

    # 5. Patch vehicle
    patch_res = client.patch(f"/api/v1/vehicles/{created_id}", json={
        "name": "Updated Courier 77",
        "health_status": "WARNING",
    })
    assert patch_res.status_code == 200
    assert patch_res.json()["name"] == "Updated Courier 77"
    assert patch_res.json()["health_status"] == "WARNING"

    # 6. Delete vehicle
    del_res = client.delete(f"/api/v1/vehicles/{created_id}")
    assert del_res.status_code == 204


def test_drivers_crud_api(client):
    """Test driver CRUD endpoints."""
    # List drivers
    res = client.get("/api/v1/drivers")
    assert res.status_code == 200
    assert len(res.json()) >= 1

    # Create driver
    create_res = client.post("/api/v1/drivers", json={
        "name": "Jane Miller",
        "license_number": "DL-TX-998877",
        "phone": "+1-555-0199",
        "status": "ACTIVE",
    })
    assert create_res.status_code == 201
    driver_id = create_res.json()["id"]

    # Patch driver
    patch_res = client.patch(f"/api/v1/drivers/{driver_id}", json={
        "overall_safety_score": 98.0,
    })
    assert patch_res.status_code == 200
    assert patch_res.json()["overall_safety_score"] == 98.0


def test_trips_api(client):
    """Test starting and completing trips."""
    vehicle_id = "22222222-2222-2222-2222-222222222201"
    driver_id = "11111111-1111-1111-1111-111111111101"

    # Start Trip
    start_res = client.post("/api/v1/trips", json={
        "vehicle_id": vehicle_id,
        "driver_id": driver_id,
        "start_location": "San Francisco Logistics Depot",
        "end_location": "Oakland Delivery Terminal",
        "status": "IN_PROGRESS",
    })
    assert start_res.status_code == 201
    trip_id = start_res.json()["id"]

    # Complete Trip
    comp_res = client.post(f"/api/v1/trips/{trip_id}/complete?end_location=Oakland+Terminal")
    assert comp_res.status_code == 200
    assert comp_res.json()["status"] == "COMPLETED"


def test_telemetry_endpoints(client):
    """Test telemetry ingest and latest fleet queries."""
    v_id = "22222222-2222-2222-2222-222222222201"

    # HTTP Ingest
    ingest_res = client.post("/api/v1/telemetry/ingest", json={
        "vehicle_id": v_id,
        "time": datetime.now(timezone.utc).isoformat(),
        "latitude": 37.7749,
        "longitude": -122.4194,
        "speed": 82.5,
        "rpm": 2100.0,
        "fuel_level_pct": 74.5,
        "engine_temp_c": 91.2,
        "oil_pressure_psi": 46.0,
        "tire_pressure_psi": 34.0,
        "battery_voltage": 12.6,
        "odometer_km": 48300.0,
        "is_anomaly": False,
    })
    assert ingest_res.status_code == 202

    # Latest map query
    map_res = client.get("/api/v1/telemetry/latest")
    assert map_res.status_code == 200
    fleet_data = map_res.json()
    assert len(fleet_data) >= 1


# ====================================================================
# 3. WebSocket Hub Tests
# ====================================================================

def test_websocket_fleet_telemetry(client):
    """Test WebSocket connection, handshake, and message broadcast."""
    with client.websocket_connect("/api/v1/ws/telemetry") as websocket:
        # Send ping
        websocket.send_text("ping")
        response = websocket.receive_text()
        assert "pong" in response
