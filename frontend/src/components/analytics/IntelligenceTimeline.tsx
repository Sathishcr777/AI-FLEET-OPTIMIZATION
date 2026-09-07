import React from "react";
import { Link } from "react-router-dom";
import { Card } from "../common/Card";
import { Badge } from "../common/Badge";
import { SeverityBadge } from "../common/SeverityBadge";
import { Vehicle } from "../../types/api";
import { AnomalyItem, MaintenancePredictionResponse } from "../../api/analytics";
import { Alert } from "../../types/alerts";
import {
  AlertTriangle,
  Clock,
  Cpu,
  Flame,
  ShieldCheck,
  Truck,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { clsx } from "clsx";

export interface IntelligenceTimelineProps {
  vehicles: Vehicle[];
  predictions: Record<string, MaintenancePredictionResponse>;
  anomalies: AnomalyItem[];
  alerts: Alert[];
  className?: string;
}

interface TimelineEvent {
  id: string;
  timestamp: string;
  vehicleId: string;
  vehicleName: string;
  vehiclePlate: string;
  stage: "ANOMALY_DETECTED" | "RISK_ELEVATED" | "ALERT_GENERATED" | "TRIAGED";
  title: string;
  description: string;
  metricInfo?: string;
  severity?: string;
}

export const IntelligenceTimeline: React.FC<IntelligenceTimelineProps> = ({
  vehicles,
  predictions,
  anomalies,
  alerts,
  className,
}) => {
  const vehicleMap = React.useMemo(() => {
    const map = new Map<string, Vehicle>();
    for (const v of vehicles) map.set(v.id, v);
    return map;
  }, [vehicles]);

  // Aggregate real events from anomalies, high predictions, and alerts into a chronological sequence
  const timelineEvents = React.useMemo(() => {
    const list: TimelineEvent[] = [];

    // 1. Telemetry Anomalies
    for (const a of anomalies) {
      const v = a.vehicle_id ? vehicleMap.get(a.vehicle_id) : undefined;
      list.push({
        id: a.id || `anomaly-${a.vehicle_id}-${a.metric_name}-${a.timestamp}`,
        timestamp: a.timestamp || new Date().toISOString(),
        vehicleId: a.vehicle_id || "",
        vehicleName: v?.name || a.vehicle_id?.slice(0, 8) || "Asset",
        vehiclePlate: v?.license_plate || "",
        stage: "ANOMALY_DETECTED",
        title: `Telemetry Anomaly: ${a.metric_name}`,
        description: a.anomaly_reason || `Outlier in ${a.subsystem || "powertrain"} subsystem`,
        metricInfo: `${typeof a.metric_value === "number" ? a.metric_value.toFixed(1) : a.metric_value} (${a.expected_range}) · Score ${a.anomaly_score.toFixed(0)}`,
        severity: a.anomaly_score > 75 ? "CRITICAL" : a.anomaly_score > 50 ? "HIGH" : "MEDIUM",
      });
    }

    // 2. High / Critical Maintenance Predictions
    for (const [vId, pred] of Object.entries(predictions)) {
      if (pred.risk_level === "CRITICAL" || pred.risk_level === "HIGH" || pred.risk_score > 50) {
        const v = vehicleMap.get(vId);
        const topFactor = pred.contributing_factors?.[0]?.factor || "Elevated thermal or mechanical wear";
        list.push({
          id: `maint-risk-${vId}`,
          timestamp: new Date(Date.now() - 60000).toISOString(),
          vehicleId: vId,
          vehicleName: v?.name || vId.slice(0, 8),
          vehiclePlate: v?.license_plate || "",
          stage: "RISK_ELEVATED",
          title: `Maintenance Risk Spike: ${pred.risk_level} (${pred.risk_score.toFixed(0)}%)`,
          description: pred.recommendation || `Estimated RUL reduced to ${pred.estimated_rul_km.toLocaleString()} km. ${topFactor}`,
          metricInfo: `RUL: ${pred.estimated_rul_km.toLocaleString()} km · Factors: ${pred.contributing_factors?.length || 1}`,
          severity: pred.risk_level,
        });
      }
    }

    // 3. Operational Alerts
    for (const al of alerts) {
      const v = vehicleMap.get(al.vehicle_id);
      list.push({
        id: al.id,
        timestamp: al.created_at || al.timestamp || new Date().toISOString(),
        vehicleId: al.vehicle_id,
        vehicleName: v?.name || al.vehicle_id.slice(0, 8),
        vehiclePlate: v?.license_plate || "",
        stage: al.status === "RESOLVED" || al.status === "ACKNOWLEDGED" ? "TRIAGED" : "ALERT_GENERATED",
        title: al.title,
        description: al.message,
        metricInfo: `Status: ${al.status} · Type: ${al.alert_type}`,
        severity: al.severity,
      });
    }

    // Sort chronologically (most recent first)
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 8);
  }, [anomalies, predictions, alerts, vehicleMap]);

  return (
    <Card
      className={clsx("flex flex-col select-none shadow-card", className)}
      header={
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-sm text-slate-100 font-sans">
            Intelligence Incident & Causality Timeline
          </span>
        </div>
      }
      headerAction={
        <div className="flex items-center gap-2">
          <Badge variant="brand" size="sm">
            INTELLIGENCE PIPELINE
          </Badge>
        </div>
      }
    >
      <div className="space-y-3 font-sans text-xs">
        {/* Conceptual Causality Stage Strip */}
        <div className="p-3 rounded-xl bg-[#0B0F19] border border-[#1F2E47] flex items-center justify-between gap-1 text-xs text-slate-400 overflow-x-auto">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-glow-emerald" />
            <span className="font-semibold text-slate-200">1. Baseline Telemetry</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-purple-400 shadow-glow-blue" />
            <span className="font-semibold text-purple-300">2. Anomaly Detected</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-glow-amber" />
            <span className="font-semibold text-amber-300">3. Health & RUL Impact</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-rose-500 shadow-glow-crimson" />
            <span className="font-semibold text-rose-300">4. Alert Triage</span>
          </div>
        </div>

        {/* Real Events Feed */}
        {timelineEvents.length === 0 ? (
          <div className="p-6 rounded-xl bg-[#0B0F19] border border-[#1F2E47] text-center flex flex-col items-center justify-center space-y-2">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
            <h4 className="font-semibold text-slate-100 text-xs">
              All Powertrains Operating Nominally
            </h4>
            <p className="text-xs text-slate-400 max-w-sm">
              No statistical anomalies or predictive degradation events detected across active fleet telemetry streams.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5 custom-scrollbar">
            {timelineEvents.map((evt) => {
              const formattedTime = new Date(evt.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });

              const getStageBadge = () => {
                switch (evt.stage) {
                  case "ANOMALY_DETECTED":
                    return <Badge variant="brand" size="sm">ANOMALY</Badge>;
                  case "RISK_ELEVATED":
                    return <Badge variant="warning" size="sm">MAINT RISK</Badge>;
                  case "ALERT_GENERATED":
                    return <Badge variant="critical" size="sm">ALERT</Badge>;
                  case "TRIAGED":
                    return <Badge variant="success" size="sm">TRIAGED</Badge>;
                }
              };

              const getStageIcon = () => {
                switch (evt.stage) {
                  case "ANOMALY_DETECTED":
                    return <Flame className="w-3.5 h-3.5 text-purple-400" />;
                  case "RISK_ELEVATED":
                    return <Cpu className="w-3.5 h-3.5 text-amber-400" />;
                  case "ALERT_GENERATED":
                    return <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />;
                  case "TRIAGED":
                    return <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />;
                }
              };

              return (
                <div
                  key={evt.id}
                  className="p-3 rounded-xl bg-[#0B0F19] border border-[#1F2E47] hover:border-blue-500/60 transition-colors flex items-start justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-2.5 truncate">
                    <div className="p-2 rounded-lg bg-[#111C2D] border border-[#1F2E47] shrink-0 mt-0.5">
                      {getStageIcon()}
                    </div>

                    <div className="truncate space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white font-sans text-xs truncate">
                          {evt.title}
                        </span>
                        {getStageBadge()}
                        {evt.severity && <SeverityBadge severity={evt.severity} size="sm" />}
                      </div>

                      <p className="text-slate-300 font-sans text-xs line-clamp-1 mt-0.5">
                        {evt.description}
                      </p>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-0.5">
                        <span className="flex items-center gap-1 text-slate-200 font-medium">
                          <Truck className="w-3 h-3 text-blue-400" />
                          <span>{evt.vehicleName}</span>
                          {evt.vehiclePlate && (
                            <span className="text-slate-400 font-mono">({evt.vehiclePlate})</span>
                          )}
                        </span>
                        <span>·</span>
                        <span className="text-slate-400 font-mono">{evt.metricInfo}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 text-[11px] text-slate-400 space-y-1">
                    <div className="font-mono text-slate-300">{formattedTime}</div>
                    {evt.vehicleId && (
                      <Link to={`/vehicles?id=${evt.vehicleId}`}>
                        <span className="text-blue-400 hover:text-blue-300 flex items-center gap-0.5 justify-end font-medium cursor-pointer">
                          <span>Inspect</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </span>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
};

