import { apiClient } from "./client";
import { Alert, AlertListResponse } from "../types/alerts";

export const alertsApi = {
  list: (params?: {
    vehicle_id?: string;
    driver_id?: string;
    severity?: string;
    status?: string;
    alert_type?: string;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.vehicle_id) searchParams.append("vehicle_id", params.vehicle_id);
    if (params?.driver_id) searchParams.append("driver_id", params.driver_id);
    if (params?.severity) searchParams.append("severity", params.severity);
    if (params?.status) searchParams.append("status", params.status);
    if (params?.alert_type) searchParams.append("alert_type", params.alert_type);
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    const query = searchParams.toString();
    return apiClient<AlertListResponse>(`/alerts${query ? `?${query}` : ""}`);
  },

  getActive: () => apiClient<Alert[]>("/alerts/active"),

  getCritical: () => apiClient<Alert[]>("/alerts/critical"),

  getById: (id: string) => apiClient<Alert>(`/alerts/${id}`),

  create: (data: Partial<Alert>) =>
    apiClient<Alert>("/alerts", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  acknowledge: (id: string, notes?: string, acknowledged_by: string = "Ops Dispatcher") =>
    apiClient<Alert>(`/alerts/${id}/acknowledge`, {
      method: "POST",
      body: JSON.stringify({ notes, acknowledged_by }),
    }),

  resolve: (id: string, resolution_notes?: string) =>
    apiClient<Alert>(`/alerts/${id}/resolve`, {
      method: "POST",
      body: JSON.stringify({ resolution_notes }),
    }),

  delete: (id: string) =>
    apiClient<{ status: string; id: string }>(`/alerts/${id}`, {
      method: "DELETE",
    }),
};
