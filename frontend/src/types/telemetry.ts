export interface TelemetryPayload {
  time: string;
  vehicle_id: string;
  driver_id?: string | null;
  trip_id?: string | null;
  latitude: number;
  longitude: number;
  speed: number;
  rpm: number;
  fuel_level_pct: number;
  engine_temp_c: number;
  oil_pressure_psi: number;
  tire_pressure_psi: number;
  battery_voltage: number;
  odometer_km: number;
  heading_deg?: number;
  altitude_m?: number;
  is_anomaly?: boolean;
}

export interface VehicleTelemetryState {
  current: TelemetryPayload;
  history: TelemetryPayload[];
  lastUpdated: number;
}

export type TelemetryMetricKey =
  | "speed"
  | "engine_temp_c"
  | "oil_pressure_psi"
  | "rpm"
  | "battery_voltage"
  | "fuel_level_pct"
  | "tire_pressure_psi";

export interface MetricMeta {
  key: TelemetryMetricKey;
  label: string;
  shortLabel: string;
  unit: string;
  color: string;
  min: number;
  max: number;
  safeMin: number;
  safeMax: number;
  warnMin?: number;
  warnMax?: number;
  critMin?: number;
  critMax?: number;
}

export const METRIC_METAS: Record<TelemetryMetricKey, MetricMeta> = {
  speed: {
    key: "speed",
    label: "Vehicle Speed",
    shortLabel: "Speed",
    unit: "km/h",
    color: "#2563EB",
    min: 0,
    max: 140,
    safeMin: 0,
    safeMax: 90,
    warnMax: 105,
    critMax: 120,
  },
  engine_temp_c: {
    key: "engine_temp_c",
    label: "Coolant Temperature",
    shortLabel: "Coolant Temp",
    unit: "°C",
    color: "#DC2626",
    min: 40,
    max: 130,
    safeMin: 75,
    safeMax: 95,
    warnMax: 105,
    critMax: 115,
  },
  oil_pressure_psi: {
    key: "oil_pressure_psi",
    label: "Engine Oil Pressure",
    shortLabel: "Oil Press",
    unit: "PSI",
    color: "#D97706",
    min: 10,
    max: 80,
    safeMin: 30,
    safeMax: 65,
    warnMin: 25,
    critMin: 18,
  },
  rpm: {
    key: "rpm",
    label: "Engine Speed (RPM)",
    shortLabel: "Engine RPM",
    unit: "RPM",
    color: "#7C3AED",
    min: 500,
    max: 4000,
    safeMin: 700,
    safeMax: 2600,
    warnMax: 3200,
    critMax: 3600,
  },
  battery_voltage: {
    key: "battery_voltage",
    label: "Battery Voltage",
    shortLabel: "Battery",
    unit: "V",
    color: "#059669",
    min: 10.0,
    max: 16.0,
    safeMin: 12.4,
    safeMax: 14.8,
    warnMin: 11.8,
    critMin: 11.2,
    warnMax: 15.2,
    critMax: 15.6,
  },
  fuel_level_pct: {
    key: "fuel_level_pct",
    label: "Fuel Level",
    shortLabel: "Fuel",
    unit: "%",
    color: "#0284C7",
    min: 0,
    max: 100,
    safeMin: 25,
    safeMax: 100,
    warnMin: 20,
    critMin: 10,
  },
  tire_pressure_psi: {
    key: "tire_pressure_psi",
    label: "Tire Pressure",
    shortLabel: "Tires",
    unit: "PSI",
    color: "#0D9488",
    min: 20,
    max: 50,
    safeMin: 30,
    safeMax: 38,
    warnMin: 28,
    critMin: 24,
    warnMax: 40,
    critMax: 44,
  },
};
