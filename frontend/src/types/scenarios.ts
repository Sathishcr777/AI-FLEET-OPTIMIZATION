export type ScenarioType =
  | "NORMAL_HIGHWAY"
  | "NORMAL_URBAN"
  | "HARSH_BRAKE"
  | "RAPID_ACCEL"
  | "OVERSPEEDING"
  | "EXCESSIVE_IDLE"
  | "ENGINE_OVERHEAT"
  | "LOW_OIL_PRESSURE"
  | "COMPONENT_WEAR"
  | "SENSOR_GLITCH"
  | "MIXED_ABNORMAL";

export interface ScenarioDefinition {
  type: ScenarioType;
  name: string;
  category: "NORMAL" | "ABNORMAL" | "EXTREME";
  description: string;
  default_duration: number;
}

export interface ScenarioStatusResponse {
  total_available: number;
  active_vehicles: number;
  available_scenarios: ScenarioDefinition[];
  active_scenarios: Record<string, { scenario: ScenarioType; remaining_seconds: number }>;
}
