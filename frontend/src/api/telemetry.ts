import { apiClient } from "./client";
import { TelemetryPayload } from "../types/telemetry";

interface LatestTelemetryMapItem {
  vehicle_id: string;
  vehicle_name: string;
  vehicle_type: string;
  license_plate: string;
  status: string;
  health_status: string;
  driver_name?: string | null;
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
  is_anomaly: boolean;
  last_updated: string;
}

export interface TelemetryHistoryResponse {
  vehicle_id: string;
  count: number;
  records: TelemetryPayload[];
}

const toTelemetryPayload = (item: LatestTelemetryMapItem): TelemetryPayload => ({
  time: item.last_updated,
  vehicle_id: item.vehicle_id,
  latitude: item.latitude,
  longitude: item.longitude,
  speed: item.speed,
  rpm: item.rpm,
  fuel_level_pct: item.fuel_level_pct,
  engine_temp_c: item.engine_temp_c,
  oil_pressure_psi: item.oil_pressure_psi,
  tire_pressure_psi: item.tire_pressure_psi,
  battery_voltage: item.battery_voltage,
  odometer_km: item.odometer_km,
  is_anomaly: item.is_anomaly,
});

export const telemetryApi = {
  getLatestFleet: async (): Promise<Record<string, TelemetryPayload>> => {
    const items = await apiClient<LatestTelemetryMapItem[]>("/telemetry/latest");
    return Object.fromEntries(items.map((item) => [item.vehicle_id, toTelemetryPayload(item)]));
  },

  getVehicleHistory: async (vehicleId: string, limit: number = 100): Promise<TelemetryHistoryResponse> => {
    const response = await apiClient<{
      vehicle_id: string;
      total_records: number;
      data: TelemetryPayload[];
    }>(`/telemetry/history/${vehicleId}?limit=${limit}`);

    return {
      vehicle_id: response.vehicle_id,
      count: response.total_records,
      records: response.data,
    };
  },

  ingest: (data: Partial<TelemetryPayload>) =>
    apiClient<{ status: string; count: number }>("/telemetry/ingest", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
