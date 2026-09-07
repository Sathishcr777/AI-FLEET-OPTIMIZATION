import { apiClient } from "./client";
import { Driver } from "../types/api";

export interface DriverListResponse {
  total_count: number;
  drivers: Driver[];
}

export const driversApi = {
  list: async (params?: { status?: string; min_safety_score?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append("status", params.status);
    if (params?.min_safety_score !== undefined)
      searchParams.append("min_safety_score", params.min_safety_score.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    const query = searchParams.toString();
    const res = await apiClient<Driver[] | { drivers: Driver[] }>(`/drivers${query ? `?${query}` : ""}`);
    if (Array.isArray(res)) return res;
    if (res && Array.isArray((res as { drivers: Driver[] }).drivers)) return (res as { drivers: Driver[] }).drivers;
    return [];
  },

  getById: (id: string) => apiClient<Driver>(`/drivers/${id}`),

  create: (data: Partial<Driver>) =>
    apiClient<Driver>("/drivers", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Driver>) =>
    apiClient<Driver>(`/drivers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};
