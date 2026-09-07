import { apiClient } from "./client";

export interface DriverAnalyticsResponse {
  driver_id: string;
  safety_score: number;
  risk_level: string;
  harsh_braking_events: number;
  rapid_acceleration_events: number;
  speeding_events: number;
  excessive_idle_events: number;
  total_observations: number;
  summary: string;
}

export interface VehicleHealthResponse {
  vehicle_id: string;
  health_score: number;
  status: "GOOD" | "WARNING" | "CRITICAL";
  risk_factors: string[];
  summary: string;
}

export interface ContributingFactor {
  factor: string;
  weight: number;
}

export interface MaintenancePredictionResponse {
  vehicle_id: string;
  risk_score: number;
  risk_level: string;
  recommendation: string;
  estimated_rul_km: number;
  contributing_factors: ContributingFactor[];
}

export interface AnomalyItem {
  id?: string;
  vehicle_id?: string;
  timestamp?: string;
  metric_name: string;
  metric_value: number;
  expected_range: string;
  anomaly_score: number;
  anomaly_reason: string;
  subsystem: string;
  status: string;
}

export interface AnomalyListResponse {
  vehicle_id?: string | null;
  anomalies: AnomalyItem[];
}

export const analyticsApi = {
  getDriverAnalytics: (driverId: string) =>
    apiClient<DriverAnalyticsResponse>(`/analytics/drivers/${driverId}`),

  getVehicleHealth: (vehicleId: string) =>
    apiClient<VehicleHealthResponse>(`/analytics/vehicles/${vehicleId}/health`),

  getMaintenancePrediction: (vehicleId: string) =>
    apiClient<MaintenancePredictionResponse>(`/analytics/vehicles/${vehicleId}/maintenance`),

  getAnomalies: (params?: { vehicle_id?: string; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.vehicle_id) searchParams.append("vehicle_id", params.vehicle_id);
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    const query = searchParams.toString();
    return apiClient<AnomalyListResponse>(`/analytics/telemetry/anomalies${query ? `?${query}` : ""}`);
  },
};
