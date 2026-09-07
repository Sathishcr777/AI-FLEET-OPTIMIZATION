import React from "react";
import { Link } from "react-router-dom";
import { Card } from "../common/Card";
import { Button } from "../common/Button";
import { Vehicle, Driver } from "../../types/api";
import { MaintenancePredictionResponse, AnomalyItem } from "../../api/analytics";
import { Alert } from "../../types/alerts";
import {
  Sparkles,
  ShieldAlert,
  Activity,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { clsx } from "clsx";

export interface ExecutiveInsightsPanelProps {
  vehicles: Vehicle[];
  drivers: Driver[];
  predictions: Record<string, MaintenancePredictionResponse>;
  anomalies: AnomalyItem[];
  alerts: Alert[];
  className?: string;
}

export const ExecutiveInsightsPanel: React.FC<ExecutiveInsightsPanelProps> = ({
  vehicles,
  drivers,
  predictions,
  anomalies,
  alerts,
  className,
}) => {
  // Derive factual, data-grounded operational insights
  const insights = React.useMemo(() => {
    const list: { title: string; desc: string; type: "critical" | "warning" | "info" | "success" }[] = [];

    // 1. Health Status Insight
    const critVehicles = vehicles.filter((v) => v.health_status === "CRITICAL");
    const warnVehicles = vehicles.filter((v) => v.health_status === "WARNING");

    if (critVehicles.length > 0) {
      list.push({
        title: "Critical Vehicle Health Condition",
        desc: `${critVehicles.length} asset(s) (${critVehicles.map((v) => v.name).join(", ")}) exhibit critical powertrain wear or extreme thermal spikes.`,
        type: "critical",
      });
    } else if (warnVehicles.length > 0) {
      list.push({
        title: "Fleet Health Advisory",
        desc: `${warnVehicles.length} asset(s) require scheduled maintenance checkups before degradation worsens.`,
        type: "warning",
      });
    } else {
      list.push({
        title: "Fleet Powertrain Stability",
        desc: "All active fleet vehicles are currently operating within nominal health parameters.",
        type: "success",
      });
    }

    // 2. Highest Maintenance Risk Asset
    let highestMaintVehicle: Vehicle | null = null;
    let maxMaintScore = -1;

    for (const v of vehicles) {
      const pred = predictions[v.id];
      if (pred && pred.risk_score > maxMaintScore) {
        maxMaintScore = pred.risk_score;
        highestMaintVehicle = v;
      }
    }

    if (highestMaintVehicle && maxMaintScore > 40) {
      const pred = predictions[highestMaintVehicle.id];
      const factor = pred?.contributing_factors?.[0]?.factor || "component strain";
      list.push({
        title: "Predictive Maintenance Attention",
        desc: `${highestMaintVehicle.name} exhibits the highest maintenance risk (${maxMaintScore.toFixed(0)}%) driven primarily by ${factor} with ${pred?.estimated_rul_km.toLocaleString()} km estimated RUL.`,
        type: maxMaintScore > 70 ? "critical" : "warning",
      });
    }

    // 3. Subsystem Anomaly Cluster
    if (anomalies.length > 0) {
      const subCounts: Record<string, number> = {};
      for (const a of anomalies) {
        const s = (a.subsystem || "POWERTRAIN").toUpperCase();
        subCounts[s] = (subCounts[s] || 0) + 1;
      }
      let topSub = "";
      let topCount = 0;
      for (const [sub, count] of Object.entries(subCounts)) {
        if (count > topCount) {
          topCount = count;
          topSub = sub;
        }
      }
      if (topSub) {
        list.push({
          title: "Subsystem Telematics Outlier Cluster",
          desc: `The ${topSub} subsystem accounts for ${topCount} of ${anomalies.length} detected statistical anomalies across the fleet.`,
          type: "info",
        });
      }
    }

    // 4. Active Incident Triage Status
    const activeAlerts = alerts.filter((a) => a.status === "ACTIVE");
    if (activeAlerts.length > 0) {
      list.push({
        title: "Incident Queue Pending Triage",
        desc: `${activeAlerts.length} operational alert(s) remain unacknowledged in the triage workstation.`,
        type: "warning",
      });
    }

    return list;
  }, [vehicles, drivers, predictions, anomalies, alerts]);

  return (
    <Card
      className={clsx("flex flex-col h-full select-none shadow-card", className)}
      header={
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-slate-900 font-sans">Operational Intelligence & Actionable Insights</span>
        </div>
      }
      headerAction={
        <Link to="/alerts">
          <Button size="sm" variant="secondary" leftIcon={<ShieldAlert className="w-3.5 h-3.5 text-amber-500" />}>
            Open Incident Triage
          </Button>
        </Link>
      }
    >
      <div className="space-y-3 font-sans text-xs overflow-y-auto pr-1 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {insights.map((item, idx) => (
            <div
              key={idx}
              className={clsx(
                "p-3.5 rounded-xl border space-y-1.5 transition-colors shadow-sm",
                item.type === "critical"
                  ? "bg-rose-50/70 border-rose-200"
                  : item.type === "warning"
                  ? "bg-amber-50/70 border-amber-200"
                  : item.type === "success"
                  ? "bg-emerald-50/70 border-emerald-200"
                  : "bg-blue-50/70 border-blue-200"
              )}
            >
              <div className="flex items-center gap-2">
                {item.type === "critical" ? (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                ) : item.type === "warning" ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                ) : item.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <Activity className="w-4 h-4 text-blue-600 shrink-0" />
                )}
                <span className="font-semibold text-slate-900 text-xs font-sans">{item.title}</span>
              </div>
              <p className="text-slate-600 font-sans text-xs leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

