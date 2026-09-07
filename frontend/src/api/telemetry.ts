import { apiClient } from "./client";
import { TelemetryPayload } from "../types/telemetry";

export interface TelemetryHistoryResponse {
  vehicle_id: string;
  count: number;
  records: TelemetryPayload[];
}

export const telemetryApi = {
  getLatestFleet: () =>
    apiClient<Record<string, TelemetryPayload>>("/telemetry/latest"),

  getVehicleHistory: (vehicleId: string, limit: number = 100) =>
    apiClient<TelemetryHistoryResponse>(`/telemetry/history/${vehicleId}?limit=${limit}`),

  ingest: (data: Partial<TelemetryPayload>) =>
    apiClient<{ status: string; count: number }>("/telemetry/ingest", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
