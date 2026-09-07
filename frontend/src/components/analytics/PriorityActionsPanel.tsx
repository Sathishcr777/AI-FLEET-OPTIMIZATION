import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "../common/Card";
import { Badge } from "../common/Badge";
import { Button } from "../common/Button";
import { EmptyState } from "../common/EmptyState";
import { Vehicle, Driver } from "../../types/api";
import { Alert } from "../../types/alerts";
import { MaintenancePredictionResponse } from "../../api/analytics";
import { ShieldAlert, ArrowRight, Truck, Wrench, Users, AlertTriangle } from "lucide-react";
import { clsx } from "clsx";

export interface PriorityActionsPanelProps {
  vehicles: Vehicle[];
  alerts: Alert[];
  predictions: Record<string, MaintenancePredictionResponse>;
  drivers?: Driver[];
  className?: string;
}

export const PriorityActionsPanel: React.FC<PriorityActionsPanelProps> = ({
  vehicles,
  alerts,
  predictions,
  drivers = [],
  className,
}) => {
  // Concrete priority operator actions generated from live state
  const actions = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      urgency: "CRITICAL" | "HIGH" | "MEDIUM";
      category: "ALERT" | "MAINTENANCE" | "VEHICLE" | "DRIVER";
      icon: React.ReactNode;
      label: string;
      reason: string;
      linkTo: string;
      buttonText: string;
    }> = [];

    // 1. Critical Active Alerts
    const criticalAlerts = alerts.filter(
      (a) => (a.severity === "CRITICAL" || a.severity === "HIGH") && a.status !== "RESOLVED"
    );
    for (const a of criticalAlerts.slice(0, 2)) {
      const v = vehicles.find((veh) => veh.id === a.vehicle_id);
      items.push({
        id: `alert-${a.id}`,
        title: a.title,
        urgency: a.severity === "CRITICAL" ? "CRITICAL" : "HIGH",
        category: "ALERT",
        icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />,
        label: v?.name || a.vehicle_id.slice(0, 8),
        reason: a.message,
        linkTo: `/alerts?id=${a.id}`,
        buttonText: "Triage Alert",
      });
    }

    // 2. High/Critical Predictive Maintenance
    for (const v of vehicles) {
      const pred = predictions[v.id];
      if (pred && (pred.risk_level === "CRITICAL" || pred.risk_level === "HIGH")) {
        items.push({
          id: `maint-${v.id}`,
          title: `Imminent Powertrain Risk: ${v.name}`,
          urgency: pred.risk_level === "CRITICAL" ? "CRITICAL" : "HIGH",
          category: "MAINTENANCE",
          icon: <Wrench className="w-3.5 h-3.5 text-amber-400" />,
          label: `${v.name} (${pred.risk_level})`,
          reason: `Est. RUL depleted to ${pred.estimated_rul_km.toLocaleString()} km. Factors: ${(pred.contributing_factors || []).slice(0, 2).map((cf) => (typeof cf === "string" ? cf : cf.factor)).join(", ")}.`,
          linkTo: `/maintenance?id=${v.id}`,
          buttonText: "Schedule Service",
        });
      }
    }

    // 3. Degraded Vehicle Health
    for (const v of vehicles) {
      if (v.health_status === "CRITICAL" && !items.some((i) => i.id.includes(v.id))) {
        items.push({
          id: `veh-${v.id}`,
          title: `Critical Asset Condition: ${v.name}`,
          urgency: "HIGH",
          category: "VEHICLE",
          icon: <Truck className="w-3.5 h-3.5 text-rose-400" />,
          label: `${v.name} · ${v.license_plate}`,
          reason: "Continuous diagnostic telemetry signals critical component degradation.",
          linkTo: `/vehicles?id=${v.id}`,
          buttonText: "Inspect Asset",
        });
      }
    }

    // 4. Low Driver Safety Score
    for (const d of drivers) {
      if (d.overall_safety_score < 75 && items.length < 4) {
        items.push({
          id: `drv-${d.id}`,
          title: `Driver Safety Review: ${d.name}`,
          urgency: "MEDIUM",
          category: "DRIVER",
          icon: <Users className="w-3.5 h-3.5 text-blue-400" />,
          label: `${d.name} (${d.overall_safety_score}/100)`,
          reason: `Recorded safety score dropped below threshold due to harsh braking or rapid acceleration.`,
          linkTo: `/drivers?id=${d.id}`,
          buttonText: "Review Driver",
        });
      }
    }

    return items.slice(0, 3);
  }, [vehicles, alerts, predictions, drivers]);

  return (
    <Card className={clsx("flex flex-col bg-[#111C2D] border-slate-800 select-none", className)}>
      <CardHeader className="border-b border-slate-800">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-blue-400" />
            <CardTitle className="text-slate-100 text-lg">Priority Operator Actions</CardTitle>
          </div>
          <Badge variant={actions.length > 0 ? "warning" : "healthy"} size="sm" dot>
            {actions.length > 0 ? `${actions.length} INTERVENTIONS` : "SYSTEM CLEAR"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {actions.length === 0 ? (
          <EmptyState
            preset="system_clear"
            compact
            description="All fleet telemetry, maintenance forecasts, and driver behaviors operating within nominal thresholds. No immediate operator intervention required."
            className="py-6 border-0 bg-transparent"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {actions.map((act) => (
              <div
                key={act.id}
                className={clsx(
                  "p-4 rounded-xl border flex flex-col justify-between transition-all space-y-3 font-sans text-xs",
                  act.urgency === "CRITICAL"
                    ? "bg-rose-950/20 border-rose-500/40 hover:border-rose-500 shadow-glow-sm"
                    : act.urgency === "HIGH"
                    ? "bg-amber-950/20 border-amber-500/40 hover:border-amber-500"
                    : "bg-[#0B0F19] border-slate-800 hover:border-slate-700"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-1.5">
                    <Badge
                      variant={
                        act.urgency === "CRITICAL"
                          ? "critical"
                          : act.urgency === "HIGH"
                          ? "warning"
                          : "info"
                      }
                      size="sm"
                      dot
                    >
                      {act.urgency}
                    </Badge>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">
                      {act.category}
                    </span>
                  </div>

                  <h4 className="font-semibold text-slate-100 text-sm leading-snug line-clamp-1">
                    {act.title}
                  </h4>
                  <p className="text-slate-300 text-xs leading-relaxed line-clamp-2">
                    {act.reason}
                  </p>
                </div>

                <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono truncate mr-2">
                    {act.icon}
                    <span className="truncate max-w-32">{act.label}</span>
                  </div>
                  <Link to={act.linkTo}>
                    <Button size="sm" variant="secondary" className="text-xs h-7 px-3 bg-[#16253B] border-slate-700 text-slate-100 hover:bg-[#1C2F4D]">
                      <span>{act.buttonText}</span>
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

