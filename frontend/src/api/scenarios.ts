import { apiClient } from "./client";
import { ScenarioStatusResponse, ScenarioType } from "../types/scenarios";

export const scenariosApi = {
  getStatus: () => apiClient<ScenarioStatusResponse>("/scenarios"),

  trigger: (params: {
    vehicle_id: string;
    scenario: ScenarioType;
    duration_seconds?: number;
    custom_params?: Record<string, unknown>;
  }) =>
    apiClient<{
      status: string;
      message: string;
      vehicle_id: string;
      scenario: string;
      duration_seconds: number;
    }>("/scenarios/trigger", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  resetAll: () =>
    apiClient<{ status: string; message: string }>("/scenarios/reset", {
      method: "POST",
    }),
};
