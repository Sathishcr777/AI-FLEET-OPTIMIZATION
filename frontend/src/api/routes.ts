import { apiClient } from "./client";
import {
  RouteOptimizeRequest,
  RouteOptimizeResponse,
  RouteRead,
  RouteListResponse,
} from "../types/routes";

export const routesApi = {
  optimize: (data: RouteOptimizeRequest) =>
    apiClient<RouteOptimizeResponse>("/routes/optimize", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  list: (params?: { limit?: number; offset?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.offset !== undefined) searchParams.append("offset", params.offset.toString());
    const query = searchParams.toString();
    return apiClient<RouteListResponse>(`/routes${query ? `?${query}` : ""}`);
  },

  getById: (id: string) => apiClient<RouteRead>(`/routes/${id}`),

  delete: (id: string) =>
    apiClient<void>(`/routes/${id}`, {
      method: "DELETE",
    }),
};
