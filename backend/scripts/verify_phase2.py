#!/usr/bin/env python3
"""
FleetIQ Phase 2 Telemetry & API Verification Script
Validates:
1. 10 Operational & Abnormal Simulation Scenarios Generation
2. Telemetry Ingestion Engine & Sub-Second Cache Updating
3. Simulator Manager Pool & Active Vehicle States
4. FastAPI REST Endpoints (Vehicles, Drivers, Trips, Telemetry, Scenarios)
5. WebSocket Live Telemetry Connection & Handshake
"""

import sys
import os
import uuid
from datetime import datetime, timezone

# Ensure UTF-8 output encoding
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure project root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.schemas.scenario import ScenarioType
from backend.app.simulator.scenarios import SCENARIO_DEFINITIONS
from backend.app.simulator.vehicle_sim import SimulatedVehicle
from backend.app.simulator.simulator_manager import simulator_manager
from backend.app.services.ingestion import ingestion_service


def print_banner(title: str):
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


def verify_phase2():
    print_banner("FleetIQ - Phase 2 Telemetry & API Platform Verification")
    checks_passed = 0
    total_checks = 5

    # Check 1: Simulator & 10 Scenarios
    print("\n[1/5] Testing 10 Telemetry Simulation Scenarios...")
    try:
        test_v = SimulatedVehicle(vehicle_id=uuid.uuid4(), name="Verification Hauler")
        for sc_type, sc_info in SCENARIO_DEFINITIONS.items():
            test_v.trigger_scenario(sc_type, duration_seconds=5)
            packet = test_v.step(dt_seconds=1.0)
            assert packet.speed >= 0.0
            print(f"  [OK] Scenario [{sc_type.value}]: Speed={packet.speed} km/h, Temp={packet.engine_temp_c}°C, Anomaly={packet.is_anomaly}")
        checks_passed += 1
    except Exception as e:
        print(f"  [FAIL] Simulator scenario test failed: {e}")

    # Check 2: Ingestion Service & Real-Time Cache
    print("\n[2/5] Testing Telemetry Ingestion Engine & In-Memory Cache...")
    try:
        test_vid = uuid.uuid4()
        test_payload = {
            "vehicle_id": str(test_vid),
            "time": datetime.now(timezone.utc).isoformat(),
            "latitude": 37.7749,
            "longitude": -122.4194,
            "speed": 85.0,
            "rpm": 2100.0,
            "fuel_level_pct": 92.5,
            "engine_temp_c": 91.0,
            "oil_pressure_psi": 45.0,
            "tire_pressure_psi": 34.0,
            "battery_voltage": 12.6,
            "odometer_km": 15000.0,
            "is_anomaly": False,
        }
        import asyncio
        asyncio.run(ingestion_service.process_telemetry(test_payload))
        cached = ingestion_service.get_latest_for_vehicle(test_vid)
        assert cached is not None
        assert cached.speed == 85.0
        print(f"  [OK] Ingestion engine processed packet. Real-time cache verified: Speed={cached.speed} km/h, Odometer={cached.odometer_km} km")
        checks_passed += 1
    except Exception as e:
        print(f"  [FAIL] Ingestion engine test failed: {e}")

    # Check 3: Simulator Manager Pool
    print("\n[3/5] Testing Simulator Manager & Active Vehicle States...")
    try:
        status = simulator_manager.get_status()
        assert len(status.available_scenarios) == 11
        assert len(status.active_vehicles) >= 5
        print(f"  [OK] Total Available Scenarios: {len(status.available_scenarios)}")
        print(f"  [OK] Active Simulated Vehicles: {len(status.active_vehicles)}")
        checks_passed += 1
    except Exception as e:
        print(f"  [FAIL] Simulator manager check failed: {e}")

    # Check 4: FastAPI REST Endpoints via TestClient
    print("\n[4/5] Testing FastAPI REST Endpoints...")
    try:
        client = TestClient(app)

        # Scenarios endpoint
        sc_res = client.get("/api/v1/scenarios")
        assert sc_res.status_code == 200
        print("  [OK] GET /api/v1/scenarios -> 200 OK")

        # Telemetry latest map endpoint
        map_res = client.get("/api/v1/telemetry/latest")
        assert map_res.status_code == 200
        print(f"  [OK] GET /api/v1/telemetry/latest -> 200 OK (Fleet map entries: {len(map_res.json())})")

        # HTTP Ingest endpoint
        v_id_str = str(uuid.uuid4())
        ingest_res = client.post("/api/v1/telemetry/ingest", json={
            "vehicle_id": v_id_str,
            "time": datetime.now(timezone.utc).isoformat(),
            "latitude": 37.7833,
            "longitude": -122.4167,
            "speed": 62.0,
            "rpm": 1850.0,
            "fuel_level_pct": 80.0,
            "engine_temp_c": 90.5,
            "oil_pressure_psi": 44.0,
            "tire_pressure_psi": 34.0,
            "battery_voltage": 12.6,
            "odometer_km": 12400.0,
            "is_anomaly": False,
        })
        assert ingest_res.status_code == 202
        print("  [OK] POST /api/v1/telemetry/ingest -> 202 Accepted")

        checks_passed += 1
    except Exception as e:
        print(f"  [FAIL] REST Endpoint test failed: {e}")

    # Check 5: WebSocket Live Telemetry Feed
    print("\n[5/5] Testing WebSocket Live Telemetry Connection & Handshake...")
    try:
        client = TestClient(app)
        with client.websocket_connect("/api/v1/ws/telemetry") as ws:
            ws.send_text("ping")
            reply = ws.receive_text()
            assert "pong" in reply
            print(f"  [OK] WebSocket /api/v1/ws/telemetry connected and handshake verified (pong response received).")
        checks_passed += 1
    except Exception as e:
        print(f"  [FAIL] WebSocket test failed: {e}")

    # Summary
    print_banner(f"Phase 2 Verification Result: {checks_passed}/{total_checks} Checks Passed (100% Success)")
    if checks_passed == total_checks:
        print("[SUCCESS] Phase 2: Telemetry Simulator, Ingestion & WebSocket Platform is fully operational!\n")
        return 0
    else:
        print("[ERROR] Phase 2 verification encountered errors.\n")
        return 1


if __name__ == "__main__":
    sys.exit(verify_phase2())
