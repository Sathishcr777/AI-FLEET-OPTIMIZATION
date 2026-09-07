-- ====================================================================
-- FleetIQ Database Initialization & Schema Definition
-- PostgreSQL 16 + TimescaleDB Extension
-- ====================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable TimescaleDB if extension is available in PostgreSQL instance
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_available_extensions WHERE name = 'timescaledb'
    ) THEN
        CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
        RAISE NOTICE 'TimescaleDB extension enabled successfully.';
    ELSE
        RAISE NOTICE 'TimescaleDB extension not present, proceeding with standard PostgreSQL time-series tables.';
    END IF;
END $$;

-- 2. Create Core Tables

-- Drivers Table
CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    license_number VARCHAR(50) UNIQUE NOT NULL,
    phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ON_LEAVE', 'INACTIVE')),
    overall_safety_score DOUBLE PRECISION DEFAULT 100.0 CHECK (overall_safety_score >= 0.0 AND overall_safety_score <= 100.0),
    total_trips INTEGER DEFAULT 0,
    total_distance_km DOUBLE PRECISION DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vehicles Table
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vin VARCHAR(17) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    vehicle_type VARCHAR(50) DEFAULT 'TRUCK' CHECK (vehicle_type IN ('TRUCK', 'VAN', 'SUV', 'SEDAN', 'ELECTRIC_VAN')),
    license_plate VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'MAINTENANCE', 'IDLE', 'INACTIVE')),
    fuel_capacity_liters DOUBLE PRECISION DEFAULT 80.0,
    total_mileage_km DOUBLE PRECISION DEFAULT 0.0,
    health_status VARCHAR(20) DEFAULT 'GOOD' CHECK (health_status IN ('GOOD', 'WARNING', 'CRITICAL')),
    assigned_driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trips Table
CREATE TABLE IF NOT EXISTS trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    start_location VARCHAR(255) NOT NULL,
    end_location VARCHAR(255),
    distance_km DOUBLE PRECISION DEFAULT 0.0,
    duration_minutes DOUBLE PRECISION DEFAULT 0.0,
    avg_speed_kmh DOUBLE PRECISION DEFAULT 0.0,
    fuel_consumed_liters DOUBLE PRECISION DEFAULT 0.0,
    status VARCHAR(20) DEFAULT 'IN_PROGRESS' CHECK (status IN ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Telemetry Table (Time-Series Hypertable)
CREATE TABLE IF NOT EXISTS telemetry (
    time TIMESTAMPTZ NOT NULL,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    speed DOUBLE PRECISION NOT NULL,
    rpm DOUBLE PRECISION NOT NULL,
    fuel_level_pct DOUBLE PRECISION NOT NULL,
    engine_temp_c DOUBLE PRECISION NOT NULL,
    oil_pressure_psi DOUBLE PRECISION NOT NULL,
    tire_pressure_psi DOUBLE PRECISION NOT NULL,
    battery_voltage DOUBLE PRECISION NOT NULL,
    odometer_km DOUBLE PRECISION NOT NULL,
    is_anomaly BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (time, vehicle_id)
);

-- Convert Telemetry table to TimescaleDB Hypertable if TimescaleDB is available
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'timescaledb'
    ) THEN
        PERFORM create_hypertable('telemetry', 'time', if_not_exists => TRUE);
        RAISE NOTICE 'Telemetry hypertable initialized on time dimension.';
    END IF;
END $$;

-- Driver Events Table
CREATE TABLE IF NOT EXISTS driver_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('HARSH_BRAKE', 'RAPID_ACCEL', 'OVERSPEEDING', 'SHARP_TURN', 'EXCESSIVE_IDLE')),
    severity VARCHAR(20) DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    value DOUBLE PRECISION NOT NULL,
    duration_seconds DOUBLE PRECISION DEFAULT 0.0,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Maintenance Records Table
CREATE TABLE IF NOT EXISTS maintenance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    service_date TIMESTAMPTZ DEFAULT NOW(),
    service_type VARCHAR(100) NOT NULL,
    description TEXT,
    cost DOUBLE PRECISION DEFAULT 0.0,
    odometer_km DOUBLE PRECISION DEFAULT 0.0,
    status VARCHAR(20) DEFAULT 'COMPLETED' CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    performed_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Predictions Table
CREATE TABLE IF NOT EXISTS predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    model_type VARCHAR(50) NOT NULL CHECK (model_type IN ('MAINTENANCE_RISK', 'RUL_ESTIMATE', 'BRAKE_WEAR', 'COOLING_FAILURE')),
    risk_score DOUBLE PRECISION NOT NULL CHECK (risk_score >= 0.0 AND risk_score <= 1.0),
    risk_category VARCHAR(20) NOT NULL CHECK (risk_category IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    estimated_rul_km INTEGER,
    contributing_factors JSONB DEFAULT '[]'::jsonb,
    recommended_action TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Anomalies Table
CREATE TABLE IF NOT EXISTS anomalies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    metric_name VARCHAR(50) NOT NULL,
    metric_value DOUBLE PRECISION NOT NULL,
    expected_range VARCHAR(100) NOT NULL,
    anomaly_score DOUBLE PRECISION NOT NULL CHECK (anomaly_score >= 0.0 AND anomaly_score <= 1.0),
    anomaly_reason TEXT NOT NULL,
    subsystem VARCHAR(50) DEFAULT 'POWERTRAIN',
    status VARCHAR(20) DEFAULT 'DETECTED' CHECK (status IN ('DETECTED', 'REVIEWED', 'RESOLVED')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts Table
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    recommended_action TEXT,
    is_acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Routes Table
CREATE TABLE IF NOT EXISTS routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    origin_lat DOUBLE PRECISION NOT NULL,
    origin_lon DOUBLE PRECISION NOT NULL,
    dest_lat DOUBLE PRECISION NOT NULL,
    dest_lon DOUBLE PRECISION NOT NULL,
    waypoints JSONB DEFAULT '[]'::jsonb,
    optimized_path JSONB DEFAULT '[]'::jsonb,
    original_distance_km DOUBLE PRECISION DEFAULT 0.0,
    optimized_distance_km DOUBLE PRECISION DEFAULT 0.0,
    distance_saved_pct DOUBLE PRECISION DEFAULT 0.0,
    original_time_min INTEGER DEFAULT 0,
    optimized_time_min INTEGER DEFAULT 0,
    time_saved_pct DOUBLE PRECISION DEFAULT 0.0,
    estimated_fuel_saved_liters DOUBLE PRECISION DEFAULT 0.0,
    estimated_cost_saved_usd DOUBLE PRECISION DEFAULT 0.0,
    status VARCHAR(20) DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'IN_PROGRESS', 'COMPLETED')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes for High Performance
CREATE INDEX IF NOT EXISTS idx_telemetry_vehicle_time ON telemetry (vehicle_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_driver_events_vehicle ON driver_events (vehicle_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_driver_events_driver ON driver_events (driver_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_unack ON alerts (is_acknowledged, severity, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_vehicle ON alerts (vehicle_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_vehicle ON predictions (vehicle_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_anomalies_vehicle ON anomalies (vehicle_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle ON trips (vehicle_id, start_time DESC);

-- 4. Initial Seed Data (5 Vehicles & 5 Drivers)
INSERT INTO drivers (id, name, license_number, phone, status, overall_safety_score, total_trips, total_distance_km)
VALUES
    ('11111111-1111-1111-1111-111111111101', 'Alex Johnson', 'DL-CA-981234', '+1-555-0101', 'ACTIVE', 96.5, 42, 3840.0),
    ('11111111-1111-1111-1111-111111111102', 'Marcus Chen', 'DL-WA-872341', '+1-555-0102', 'ACTIVE', 88.0, 38, 3120.0),
    ('11111111-1111-1111-1111-111111111103', 'Sarah Williams', 'DL-TX-763452', '+1-555-0103', 'ACTIVE', 92.0, 50, 4650.0),
    ('11111111-1111-1111-1111-111111111104', 'David Rodriguez', 'DL-NY-654563', '+1-555-0104', 'ACTIVE', 68.5, 29, 2190.0),
    ('11111111-1111-1111-1111-111111111105', 'Emma Davis', 'DL-IL-545674', '+1-555-0105', 'ACTIVE', 94.0, 35, 2950.0)
ON CONFLICT (license_number) DO NOTHING;

INSERT INTO vehicles (id, vin, name, vehicle_type, license_plate, status, fuel_capacity_liters, total_mileage_km, health_status, assigned_driver_id)
VALUES
    ('22222222-2222-2222-2222-222222222201', '1FTFW1ED4NFA10001', 'Alpha Fleet-01 (Freight Truck)', 'TRUCK', 'FL-8021', 'ACTIVE', 120.0, 48250.0, 'GOOD', '11111111-1111-1111-1111-111111111101'),
    ('22222222-2222-2222-2222-222222222202', '1FTFW1ED4NFA10002', 'Beta Fleet-02 (Cargo Van)', 'VAN', 'FL-4912', 'ACTIVE', 75.0, 31400.0, 'WARNING', '11111111-1111-1111-1111-111111111102'),
    ('22222222-2222-2222-2222-222222222203', '1FTFW1ED4NFA10003', 'Gamma Fleet-03 (Delivery Van)', 'VAN', 'FL-3388', 'ACTIVE', 70.0, 19800.0, 'GOOD', '11111111-1111-1111-1111-111111111103'),
    ('22222222-2222-2222-2222-222222222204', '1FTFW1ED4NFA10004', 'Delta Fleet-04 (Heavy Hauler)', 'TRUCK', 'FL-9045', 'ACTIVE', 150.0, 89400.0, 'CRITICAL', '11111111-1111-1111-1111-111111111104'),
    ('22222222-2222-2222-2222-222222222205', '1FTFW1ED4NFA10005', 'Epsilon Fleet-05 (Eco Transit)', 'ELECTRIC_VAN', 'FL-1277', 'ACTIVE', 90.0, 12500.0, 'GOOD', '11111111-1111-1111-1111-111111111105')
ON CONFLICT (vin) DO NOTHING;
