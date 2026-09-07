export type VehicleType = "TRUCK" | "VAN" | "CAR" | "EV" | "MOTORCYCLE";
export type VehicleStatus = "ACTIVE" | "MAINTENANCE" | "IDLE" | "DECOMMISSIONED";
export type HealthStatus = "GOOD" | "WARNING" | "CRITICAL";

export interface Vehicle {
  id: string;
  vin: string;
  name: string;
  vehicle_type: VehicleType;
  license_plate: string;
  status: VehicleStatus;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  fuel_capacity_liters: number;
  battery_capacity_kwh?: number | null;
  total_mileage_km: number;
  health_status: HealthStatus;
  assigned_driver_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Driver {
  id: string;
  name: string;
  license_number: string;
  phone?: string | null;
  email?: string | null;
  status: "ACTIVE" | "INACTIVE" | "ON_LEAVE" | "SUSPENDED";
  overall_safety_score: number;
  total_trips: number;
  total_distance_km: number;
  created_at: string;
  updated_at: string;
}

export interface Trip {
  id: string;
  vehicle_id: string;
  driver_id: string;
  start_time: string;
  end_time?: string | null;
  start_location_lat?: number | null;
  start_location_lon?: number | null;
  end_location_lat?: number | null;
  end_location_lon?: number | null;
  distance_km: number;
  duration_seconds: number;
  fuel_consumed_liters: number;
  average_speed_kmh: number;
  max_speed_kmh: number;
  status: "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  harsh_braking_count: number;
  rapid_accel_count: number;
  speeding_count: number;
  excessive_idle_count: number;
  safety_score?: number | null;
}

export interface SystemHealth {
  status: string;
  app_name: string;
  version: string;
  environment: string;
  timestamp: string;
  database: {
    status: string;
    details?: string;
  };
  mqtt_broker?: {
    status: string;
    details?: string;
  };
}
