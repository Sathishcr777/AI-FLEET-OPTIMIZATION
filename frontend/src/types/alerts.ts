export type AlertSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO" | "WARNING";
export type AlertStatus = "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";
export type AlertType =
  | "ENGINE_OVERHEAT"
  | "LOW_OIL_PRESSURE"
  | "LOW_TIRE_PRESSURE"
  | "BATTERY_VOLTAGE"
  | "OVERSPEEDING"
  | "HARSH_BRAKE"
  | "RAPID_ACCEL"
  | "EXCESSIVE_IDLE"
  | "SENSOR_GLITCH"
  | "TELEMETRY_ANOMALY"
  | "HIGH_VEHICLE_HEALTH_RISK"
  | "HIGH_MAINTENANCE_RISK"
  | "CRITICAL_MAINTENANCE_RISK"
  | "MAINTENANCE_RISK"
  | "CRITICAL_HEALTH"
  | "DRIVER_SAFETY"
  | "GENERAL";

export interface Alert {
  id: string;
  vehicle_id: string;
  driver_id?: string | null;
  timestamp: string;
  alert_type: AlertType | string;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  metric_name?: string | null;
  metric_value?: number | null;
  threshold_value?: string | null;
  confidence_score?: number | null;
  recommended_action?: string | null;
  is_acknowledged: boolean;
  acknowledged_at?: string | null;
  acknowledged_by?: string | null;
  resolved_at?: string | null;
  resolution_notes?: string | null;
  created_at: string;
}

export interface AlertSummaryCounts {
  total: number;
  active: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  acknowledged: number;
  resolved: number;
}

export interface AlertListResponse {
  summary: AlertSummaryCounts;
  total_count: number;
  alerts: Alert[];
}
