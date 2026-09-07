import { apiClient } from "./client";
import { Vehicle } from "../types/api";

export interface VehicleListResponse {
  total_count: number;
  vehicles: Vehicle[];
}

export const vehiclesApi = {
  list: async (params?: { vehicle_type?: string; status?: string; limit?: number }): Promise<VehicleListResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.vehicle_type) searchParams.append("vehicle_type", params.vehicle_type);
    if (params?.status) searchParams.append("status", params.status);
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    const query = searchParams.toString();
    const res = await apiClient<Vehicle[] | VehicleListResponse>(`/vehicles${query ? `?${query}` : ""}`);
    if (Array.isArray(res)) {
      return { total_count: res.length, vehicles: res };
    }
    return res || { total_count: 0, vehicles: [] };
  },

  getById: (id: string) => apiClient<Vehicle>(`/vehicles/${id}`),

  create: (data: Partial<Vehicle>) =>
    apiClient<Vehicle>("/vehicles", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Vehicle>) =>
    apiClient<Vehicle>(`/vehicles/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiClient<{ status: string; id: string }>(`/vehicles/${id}`, {
      method: "DELETE",
    }),
};
