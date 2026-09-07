import uuid
from datetime import datetime, timezone
import pytest
from httpx import AsyncClient, ASGITransport
from starlette.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from backend.app.main import app
from backend.app.core.database import get_db, Base
from backend.app.models.driver import Driver
from backend.app.models.vehicle import Vehicle
from backend.app.models.alert import Alert
from backend.app.models.route import Route
from backend.app.schemas.alert import AlertSeverity, AlertStatus, AlertType
from backend.app.schemas.route import (
    Waypoint,
    RouteOptimizeRequest,
    OptimizationGoal,
)
from backend.app.services.alert_engine import AlertEngine, alert_engine
from backend.app.services.route_optimizer import (
    route_optimizer,
    haversine_distance_km,
    build_distance_matrix,
    nearest_neighbor_greedy,
    two_opt_optimize,
)

# Test SQLite Engine for Phase 4
TEST_SQLITE_URL = "sqlite+aiosqlite:///:memory:"
test_engine = create_async_engine(TEST_SQLITE_URL, echo=False)
TestSessionLocal = async_sessionmaker(bind=test_engine, expire_on_commit=False, class_=AsyncSession)


async def override_get_db():
    async with TestSessionLocal() as session:
        yield session


@pytest.fixture(scope="module", autouse=True)
async def setup_phase4_db():
    app.dependency_overrides[get_db] = override_get_db
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed test driver and vehicle
    async with TestSessionLocal() as session:
        driver = Driver(
            id=uuid.UUID("11111111-1111-1111-1111-111111111401"),
            name="Elena Rostova",
            license_number="DL-PH4-401",
            phone="+1-555-0401",
            status="ACTIVE",
            overall_safety_score=95.0,
            total_trips=15,
            total_distance_km=1800.0,
        )
        vehicle = Vehicle(
            id=uuid.UUID("22222222-2222-2222-2222-222222222401"),
            vin="1FTFW1ED4NFA99999",
            name="Phase4 Express Hauler",
            vehicle_type="TRUCK",
            license_plate="FL-9901",
            status="ACTIVE",
            fuel_capacity_liters=120.0,
            total_mileage_km=45000.0,
            health_status="GOOD",
            assigned_driver_id=driver.id,
        )
        session.add(driver)
        session.add(vehicle)
        await session.commit()

    yield

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


# =====================================================================
# 1. ALERT ENGINE UNIT & RULE TESTS
# =====================================================================

def test_normal_telemetry_produces_no_alerts():
    """Verify normal telemetry operating conditions generate zero candidate alerts."""
    engine = AlertEngine(cooldown_seconds=60)
    normal_telemetry = {
        "vehicle_id": str(uuid.uuid4()),
        "speed": 75.0,
        "rpm": 2200.0,
        "engine_temp_c": 90.0,
        "oil_pressure_psi": 45.0,
        "tire_pressure_psi": 34.0,
        "battery_voltage": 13.5,
        "is_anomaly": False,
    }
    candidates = engine.evaluate_telemetry(normal_telemetry)
    assert len(candidates) == 0


def test_engine_overheating_alert_generation():
    """Verify engine overheating (> 105C) generates a CRITICAL alert with clear guidance."""
    engine = AlertEngine(cooldown_seconds=60)
    v_id = uuid.uuid4()
    overheat_telemetry = {
        "vehicle_id": str(v_id),
        "engine_temp_c": 118.5,
        "speed": 60.0,
        "rpm": 3000.0,
        "oil_pressure_psi": 40.0,
        "tire_pressure_psi": 34.0,
        "battery_voltage": 13.2,
    }
    candidates = engine.evaluate_telemetry(overheat_telemetry)
    assert len(candidates) == 1
    alert = candidates[0]
    assert alert["alert_type"] == AlertType.ENGINE_OVERHEAT.value
    assert alert["severity"] == AlertSeverity.CRITICAL.value
    assert alert["metric_name"] == "engine_temp_c"
    assert alert["metric_value"] == 118.5
    assert "pull over immediately" in alert["recommended_action"].lower()


def test_low_oil_pressure_alert_generation():
    """Verify low oil pressure (< 20 PSI) generates a CRITICAL alert."""
    engine = AlertEngine(cooldown_seconds=60)
    v_id = uuid.uuid4()
    low_oil_telemetry = {
        "vehicle_id": str(v_id),
        "engine_temp_c": 92.0,
        "oil_pressure_psi": 12.4,
        "speed": 40.0,
        "rpm": 1800.0,
        "tire_pressure_psi": 34.0,
        "battery_voltage": 13.0,
    }
    candidates = engine.evaluate_telemetry(low_oil_telemetry)
    assert len(candidates) == 1
    alert = candidates[0]
    assert alert["alert_type"] == AlertType.LOW_OIL_PRESSURE.value
    assert alert["severity"] == AlertSeverity.CRITICAL.value
    assert alert["metric_name"] == "oil_pressure_psi"
    assert alert["metric_value"] == 12.4
    assert "shut off engine" in alert["recommended_action"].lower()


def test_tire_pressure_and_overspeeding_alerts():
    """Verify tire underinflation and overspeeding rules."""
    engine = AlertEngine(cooldown_seconds=60)
    v_id = uuid.uuid4()
    abnormal_telemetry = {
        "vehicle_id": str(v_id),
        "speed": 115.0,  # > 105.0 km/h
        "tire_pressure_psi": 21.0,  # < 26.0 PSI
        "engine_temp_c": 91.0,
        "oil_pressure_psi": 42.0,
        "battery_voltage": 13.4,
    }
    candidates = engine.evaluate_telemetry(abnormal_telemetry)
    assert len(candidates) == 2
    types = {c["alert_type"] for c in candidates}
    assert AlertType.OVERSPEEDING.value in types
    assert AlertType.LOW_TIRE_PRESSURE.value in types


def test_predictive_maintenance_and_health_alerts():
    """Verify high predictive maintenance risk generates appropriate severity alerts."""
    engine = AlertEngine(cooldown_seconds=60)
    v_id = uuid.uuid4()

    # Critical risk (> 0.80)
    crit_alerts = engine.evaluate_predictive_maintenance(v_id, risk_score=0.88, risk_category="CRITICAL", health_status="CRITICAL")
    assert len(crit_alerts) == 1
    assert crit_alerts[0]["severity"] == AlertSeverity.CRITICAL.value
    assert crit_alerts[0]["alert_type"] == AlertType.CRITICAL_MAINTENANCE_RISK.value

    # High risk (0.50 - 0.79)
    high_alerts = engine.evaluate_predictive_maintenance(v_id, risk_score=0.62, risk_category="HIGH", health_status="WARNING")
    assert len(high_alerts) == 1
    assert high_alerts[0]["severity"] == AlertSeverity.HIGH.value
    assert high_alerts[0]["alert_type"] == AlertType.HIGH_MAINTENANCE_RISK.value


def test_driver_behavior_intelligence_alerts():
    """Verify Phase 3 driver behavior analytics produce harsh brake, rapid accel, speed, and idle alerts."""
    engine = AlertEngine(cooldown_seconds=60)
    d_id = uuid.uuid4()
    v_id = uuid.uuid4()

    analytics = {
        "harsh_braking_events": 2,
        "rapid_acceleration_events": 3,
        "speeding_events": 4,
        "excessive_idle_events": 2,
        "safety_score": 58.0,
    }

    alerts = engine.evaluate_driver_behavior(driver_id=d_id, behavior_analytics=analytics, vehicle_id=v_id)
    assert len(alerts) == 5

    types = {a["alert_type"]: a for a in alerts}
    assert AlertType.HARSH_BRAKE.value in types
    assert AlertType.RAPID_ACCEL.value in types
    assert AlertType.OVERSPEEDING.value in types
    assert AlertType.EXCESSIVE_IDLE.value in types
    assert AlertType.DRIVER_SAFETY.value in types

    # Verify driver_id and vehicle_id associations
    for a in alerts:
        assert a["driver_id"] == d_id
        assert a["vehicle_id"] == v_id
        assert len(a["recommended_action"]) > 0


def test_telemetry_anomalies_intelligence_alerts():
    """Verify Phase 3 anomaly detection results produce structured telemetry anomaly alerts."""
    engine = AlertEngine(cooldown_seconds=60)
    v_id = uuid.uuid4()

    anomalies = [
        {
            "vehicle_id": str(v_id),
            "metric_name": "engine_temp_c",
            "metric_value": 122.0,
            "expected_range": "82-100°C",
            "anomaly_score": 0.94,
            "anomaly_reason": "Engine coolant temperature indicates overheating.",
            "subsystem": "COOLING",
        },
        {
            "vehicle_id": str(v_id),
            "metric_name": "tire_pressure_psi",
            "metric_value": 22.0,
            "expected_range": "30-38 PSI",
            "anomaly_score": 0.82,
            "anomaly_reason": "Tire pressure drift indicates underinflation.",
            "subsystem": "TIRES",
        }
    ]

    alerts = engine.evaluate_telemetry_anomalies(anomalies, vehicle_id=v_id)
    assert len(alerts) == 2
    assert alerts[0]["alert_type"] == AlertType.TELEMETRY_ANOMALY.value
    assert alerts[0]["severity"] == AlertSeverity.CRITICAL.value
    assert alerts[0]["metric_value"] == 122.0
    assert alerts[1]["severity"] == AlertSeverity.HIGH.value
    assert alerts[1]["metric_value"] == 22.0


def test_vehicle_health_intelligence_alerts():
    """Verify Phase 3 vehicle health assessment produces health risk alerts."""
    engine = AlertEngine(cooldown_seconds=60)
    v_id = uuid.uuid4()

    # Critical health
    crit_health = {
        "status": "CRITICAL",
        "health_score": 42.0,
        "risk_factors": ["engine_temp_high", "oil_pressure_low"],
    }
    crit_alerts = engine.evaluate_vehicle_health(vehicle_id=v_id, health_assessment=crit_health)
    assert len(crit_alerts) == 1
    assert crit_alerts[0]["alert_type"] == AlertType.HIGH_VEHICLE_HEALTH_RISK.value
    assert crit_alerts[0]["severity"] == AlertSeverity.CRITICAL.value
    assert crit_alerts[0]["vehicle_id"] == v_id

    # Warning health
    warn_health = {
        "status": "WARNING",
        "health_score": 68.0,
        "risk_factors": ["tire_pressure_low"],
    }
    warn_alerts = engine.evaluate_vehicle_health(vehicle_id=v_id, health_assessment=warn_health)
    assert len(warn_alerts) == 1
    assert warn_alerts[0]["severity"] == AlertSeverity.HIGH.value


def test_multi_vehicle_isolation_and_cooldown_recovery():
    """Verify unrelated vehicles do not suppress each other's alerts and condition recovery works."""
    engine = AlertEngine(cooldown_seconds=120)
    v1 = uuid.uuid4()
    v2 = uuid.uuid4()

    p1 = {"vehicle_id": str(v1), "engine_temp_c": 115.0, "speed": 50.0}
    p2 = {"vehicle_id": str(v2), "engine_temp_c": 115.0, "speed": 50.0}

    # Vehicle 1 alert
    c1 = engine.evaluate_telemetry(p1)
    d1 = engine.process_and_deduplicate(c1)
    assert len(d1) == 1

    # Vehicle 2 alert (unrelated vehicle with same condition is NOT suppressed)
    c2 = engine.evaluate_telemetry(p2)
    d2 = engine.process_and_deduplicate(c2)
    assert len(d2) == 1
    assert engine.get_active_condition_count() == 2

    # Vehicle 1 condition clears -> resets only Vehicle 1
    engine.clear_active_condition(v1, AlertType.ENGINE_OVERHEAT.value)
    assert engine.get_active_condition_count() == 1

    # Vehicle 1 new packet after recovery triggers new alert
    c1_new = engine.evaluate_telemetry(p1)
    d1_new = engine.process_and_deduplicate(c1_new)
    assert len(d1_new) == 1


def test_alert_cooldown_and_deduplication():
    """Verify repeated continuous abnormal telemetry packets do not spam duplicate active alerts."""
    engine = AlertEngine(cooldown_seconds=120)
    v_id = uuid.uuid4()
    overheat_packet = {
        "vehicle_id": str(v_id),
        "engine_temp_c": 115.0,
        "speed": 50.0,
        "oil_pressure_psi": 40.0,
        "tire_pressure_psi": 34.0,
        "battery_voltage": 13.2,
    }

    # Packet 1 -> Creates first alert
    c1 = engine.evaluate_telemetry(overheat_packet)
    d1 = engine.process_and_deduplicate(c1)
    assert len(d1) == 1
    assert engine.get_active_condition_count() == 1

    # Packet 2 (10 seconds later, condition ongoing) -> Suppressed by cooldown
    c2 = engine.evaluate_telemetry(overheat_packet)
    d2 = engine.process_and_deduplicate(c2)
    assert len(d2) == 0  # Deduplicated / suppressed

    # Clear condition -> resets active tracking
    engine.clear_active_condition(v_id, AlertType.ENGINE_OVERHEAT.value)
    assert engine.get_active_condition_count() == 0

    # Packet 3 after clear -> Generates new alert
    c3 = engine.evaluate_telemetry(overheat_packet)
    d3 = engine.process_and_deduplicate(c3)
    assert len(d3) == 1


# =====================================================================
# 2. ALERTS REST API ENDPOINTS
# =====================================================================

def test_alerts_crud_and_triage_flow(client):
    """Test creating, listing, acknowledging, resolving, and filtering alerts via REST API."""
    v_id = "22222222-2222-2222-2222-222222222401"
    d_id = "11111111-1111-1111-1111-111111111401"

    # 1. Create alert
    create_payload = {
        "vehicle_id": v_id,
        "driver_id": d_id,
        "alert_type": "ENGINE_OVERHEAT",
        "severity": "CRITICAL",
        "status": "ACTIVE",
        "title": "Severe Coolant Overheat Warning",
        "message": "Coolant temperature exceeded 116°C on Route 101.",
        "metric_name": "engine_temp_c",
        "metric_value": 116.5,
        "threshold_value": "> 105.0°C",
        "confidence_score": 0.94,
        "recommended_action": "Pull over and idle engine with fan on maximum.",
    }
    res_create = client.post("/api/v1/alerts", json=create_payload)
    assert res_create.status_code == 201
    created_alert = res_create.json()
    alert_id = created_alert["id"]
    assert created_alert["title"] == "Severe Coolant Overheat Warning"
    assert created_alert["status"] == "ACTIVE"
    assert created_alert["is_acknowledged"] is False

    # 2. List alerts & verify summary counts
    res_list = client.get("/api/v1/alerts")
    assert res_list.status_code == 200
    data = res_list.json()
    assert "summary" in data
    assert "alerts" in data
    assert data["summary"]["total"] >= 1
    assert data["summary"]["active"] >= 1
    assert data["summary"]["critical"] >= 1

    # 3. Filter by severity
    res_crit = client.get("/api/v1/alerts?severity=CRITICAL")
    assert res_crit.status_code == 200
    crit_alerts = res_crit.json()["alerts"]
    assert any(a["id"] == alert_id for a in crit_alerts)

    # 4. Quick endpoints: /active and /critical
    res_active = client.get("/api/v1/alerts/active")
    assert res_active.status_code == 200
    assert any(a["id"] == alert_id for a in res_active.json())

    res_critical = client.get("/api/v1/alerts/critical")
    assert res_critical.status_code == 200
    assert any(a["id"] == alert_id for a in res_critical.json())

    # 5. Acknowledge alert
    res_ack = client.post(f"/api/v1/alerts/{alert_id}/acknowledge", json={"acknowledged_by": "Fleet Lead", "notes": "Driver contacted."})
    assert res_ack.status_code == 200
    ack_data = res_ack.json()
    assert ack_data["status"] == "ACKNOWLEDGED"
    assert ack_data["is_acknowledged"] is True
    assert ack_data["acknowledged_at"] is not None

    # 6. Resolve alert
    res_resolve = client.post(f"/api/v1/alerts/{alert_id}/resolve", json={"resolution_notes": "Radiator fan replaced.", "resolved_by": "Service Team"})
    assert res_resolve.status_code == 200
    resolved_data = res_resolve.json()
    assert resolved_data["status"] == "RESOLVED"
    assert resolved_data["resolved_at"] is not None

    # 7. Non-existent alert -> 404
    unknown_id = str(uuid.uuid4())
    res_404 = client.get(f"/api/v1/alerts/{unknown_id}")
    assert res_404.status_code == 404

    # 8. Non-existent vehicle on creation -> 404
    bad_create = dict(create_payload)
    bad_create["vehicle_id"] = str(uuid.uuid4())
    res_bad_vehicle = client.post("/api/v1/alerts", json=bad_create)
    assert res_bad_vehicle.status_code == 404


# =====================================================================
# 3. ROUTE OPTIMIZATION ENGINE & TSP HEURISTICS
# =====================================================================

def test_haversine_distance_calculation():
    """Verify great-circle distance between San Francisco and San Jose (~65-75 km)."""
    sf_lat, sf_lon = 37.7749, -122.4194
    sj_lat, sj_lon = 37.3382, -121.8863
    distance = haversine_distance_km(sf_lat, sf_lon, sj_lat, sj_lon)
    assert 60.0 <= distance <= 80.0

    # Bounds validation
    with pytest.raises(ValueError):
        haversine_distance_km(95.0, 0.0, 0.0, 0.0)


def test_route_optimization_direct_and_one_stop():
    """Verify zero and one intermediate stop routing."""
    origin = Waypoint(name="Central Depot SF", latitude=37.7749, longitude=-122.4194)
    dest = Waypoint(name="Oakland Hub", latitude=37.8044, longitude=-122.2712)
    stop1 = Waypoint(name="Berkeley Store", latitude=37.8715, longitude=-122.2730)

    # 0 stops
    req_0 = RouteOptimizeRequest(origin=origin, destination=dest, stops=[])
    res_0 = route_optimizer.optimize_route(req_0)
    assert len(res_0.optimized_sequence) == 2
    assert res_0.comparison.distance_saved_km == 0.0

    # 1 stop
    req_1 = RouteOptimizeRequest(origin=origin, destination=dest, stops=[stop1])
    res_1 = route_optimizer.optimize_route(req_1)
    assert len(res_1.optimized_sequence) == 3
    assert res_1.comparison.original_distance_km == res_1.comparison.optimized_distance_km


def test_route_optimization_multi_stop_2opt_tsp():
    """Verify 2-Opt TSP heuristic optimizes a crossed/suboptimal multi-stop delivery sequence."""
    depot = Waypoint(name="Depot (Downtown SF)", latitude=37.7749, longitude=-122.4194)
    # Deliberately scrambled stops in criss-cross order
    stop_south = Waypoint(name="San Jose Delivery", latitude=37.3382, longitude=-121.8863)
    stop_north = Waypoint(name="San Rafael Delivery", latitude=37.9735, longitude=-122.5311)
    stop_east = Waypoint(name="Hayward Delivery", latitude=37.6688, longitude=-122.0808)
    stop_peninsula = Waypoint(name="San Mateo Delivery", latitude=37.5630, longitude=-122.3255)

    request = RouteOptimizeRequest(
        name="Bay Area Multi-Stop Route",
        origin=depot,
        destination=depot,  # Round trip to depot
        stops=[stop_south, stop_north, stop_east, stop_peninsula],
        average_speed_kmh=65.0,
        fuel_consumption_rate_l_per_100km=11.5,
        fuel_cost_per_liter=1.60,
    )

    response = route_optimizer.optimize_route(request)

    # Assertions
    assert len(response.optimized_sequence) == 6  # depot + 4 stops + depot return
    comp = response.comparison
    # Optimized distance must be less than or equal to the scrambled sequence
    assert comp.optimized_distance_km <= comp.original_distance_km
    # Fuel and travel time metrics must be consistent
    expected_time = round((comp.optimized_distance_km / 65.0) * 60.0, 2)
    assert abs(comp.optimized_time_min - expected_time) < 0.1
    expected_fuel = round((comp.optimized_distance_km * 11.5) / 100.0, 2)
    assert abs(comp.optimized_fuel_liters - expected_fuel) < 0.1
    assert comp.cost_saved_usd >= 0.0
    assert "2-Opt" in comp.algorithm_used


def test_routes_api_endpoints_and_persistence(client):
    """Test POST /api/v1/routes/optimize and database persistence via REST API."""
    depot = {"name": "Logistics Depot", "latitude": 37.7749, "longitude": -122.4194}
    stops = [
        {"name": "Stop Alpha", "latitude": 37.7833, "longitude": -122.4167},
        {"name": "Stop Beta", "latitude": 37.7955, "longitude": -122.3937},
        {"name": "Stop Gamma", "latitude": 37.7650, "longitude": -122.4200},
    ]

    optimize_payload = {
        "name": "SF Delivery Corridor",
        "origin": depot,
        "destination": depot,
        "stops": stops,
        "average_speed_kmh": 50.0,
        "fuel_consumption_rate_l_per_100km": 10.0,
        "fuel_cost_per_liter": 1.50,
        "save_to_database": True,
    }

    res_opt = client.post("/api/v1/routes/optimize", json=optimize_payload)
    assert res_opt.status_code == 200
    data_opt = res_opt.json()
    assert data_opt["status"] == "OPTIMIZED"
    assert data_opt["route_id"] is not None
    route_id = data_opt["route_id"]

    # Verify route is persisted in database
    res_get = client.get(f"/api/v1/routes/{route_id}")
    assert res_get.status_code == 200
    data_get = res_get.json()
    assert data_get["id"] == route_id
    assert data_get["name"] == "SF Delivery Corridor"
    assert len(data_get["waypoints"]) == 5  # depot + 3 stops + return

    # List routes
    res_list = client.get("/api/v1/routes")
    assert res_list.status_code == 200
    assert res_list.json()["total"] >= 1

    # Delete route
    res_del = client.delete(f"/api/v1/routes/{route_id}")
    assert res_del.status_code == 204

    # Verify deleted -> 404
    res_404 = client.get(f"/api/v1/routes/{route_id}")
    assert res_404.status_code == 404


def test_route_optimization_invalid_coordinates_validation(client):
    """Test validation errors on out-of-bounds geographic coordinates."""
    invalid_payload = {
        "origin": {"name": "Invalid Lat", "latitude": 95.0, "longitude": -122.0},
        "stops": [],
    }
    res = client.post("/api/v1/routes/optimize", json=invalid_payload)
    assert res.status_code == 422
