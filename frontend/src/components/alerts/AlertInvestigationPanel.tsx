import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "../common/Card";
import { SeverityBadge } from "../common/SeverityBadge";
import { Badge } from "../common/Badge";
import { Button } from "../common/Button";
import { Alert } from "../../types/alerts";
import { Vehicle, Driver } from "../../types/api";
import { useTelemetryStore } from "../../hooks/useTelemetryStore";
import {
  ShieldAlert,
  Truck,
  User,
  CheckCircle2,
  Eye,
  ExternalLink,
  Activity,
  Trash2,
  Sparkles,
} from "lucide-react";
import { clsx } from "clsx";

export interface AlertInvestigationPanelProps {
  alert: Alert | null;
  vehicle?: Vehicle | null;
  driver?: Driver | null;
  onAcknowledge: (alertId: string) => void;
  onResolve: (alertId: string, resolutionNotes?: string) => void;
  onDelete: (alertId: string) => void;
  isActionPending?: boolean;
  className?: string;
}

export const AlertInvestigationPanel: React.FC<AlertInvestigationPanelProps> = ({
  alert,
  vehicle,
  driver,
  onAcknowledge,
  onResolve,
  onDelete,
  isActionPending = false,
  className,
}) => {
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [showResolveInput, setShowResolveInput] = useState(false);

  // Live telemetry for the alert's vehicle from Zustand
  const liveVehicle = useTelemetryStore((s) => (alert ? s.vehicles[alert.vehicle_id] : undefined));
  const liveTelemetry = liveVehicle?.latest;

  if (!alert) {
    return (
      <Card
        className={clsx("flex flex-col justify-center items-center text-center p-8 select-none shadow-card", className)}
        header="Incident Investigation & Triage"
      >
        <div className="p-3 rounded-full bg-slate-100 border border-slate-200 text-slate-400 mb-3">
          <Eye className="w-6 h-6" />
        </div>
        <h4 className="text-xs font-semibold text-slate-900 font-sans">No Incident Selected</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-xs font-sans">
          Select an incident from the queue to review telemetry diagnostics, verify root causes, and execute triage actions.
        </p>
      </Card>
    );
  }

  const isCritical = alert.severity === "CRITICAL";
  const isAck = alert.status === "ACKNOWLEDGED";
  const isResolved = alert.status === "RESOLVED";

  const handleResolveSubmit = () => {
    onResolve(alert.id, resolutionNotes || undefined);
    setResolutionNotes("");
    setShowResolveInput(false);
  };

  return (
    <Card
      variant={isCritical && !isResolved ? "criticalGlow" : "default"}
      className={clsx("flex flex-col h-full select-none shadow-card", className)}
      header={
        <div className="flex items-center gap-2 truncate">
          <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="font-semibold text-slate-900 font-sans truncate">Incident Investigation</span>
        </div>
      }
      headerAction={<SeverityBadge severity={alert.severity} size="sm" />}
    >
      <div className="space-y-4 overflow-y-auto pr-1 flex-1 font-sans text-xs">
        {/* Top Title & Status Banner */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm font-sans">{alert.title}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                ID: <span className="font-mono text-slate-700">{alert.id}</span> · Type:{" "}
                <span className="text-blue-600 font-semibold">{alert.alert_type}</span>
              </p>
            </div>
            <Badge
              variant={isResolved ? "success" : isAck ? "warning" : "critical"}
              size="sm"
              dot
            >
              {alert.status}
            </Badge>
          </div>

          <p className="text-slate-700 text-xs bg-white p-3 rounded-lg border border-slate-200 leading-relaxed">
            {alert.message}
          </p>
        </div>

        {/* Metric & Diagnostic Context Strip */}
        {(alert.metric_name || alert.metric_value !== undefined || alert.threshold_value) && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {alert.metric_name && (
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Metric Trigger</span>
                <div className="font-semibold text-slate-900 text-xs mt-0.5">{alert.metric_name}</div>
              </div>
            )}

            {alert.metric_value !== undefined && alert.metric_value !== null && (
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Observed Value</span>
                <div className="font-bold text-rose-600 text-xs mt-0.5 font-mono">
                  {typeof alert.metric_value === "number" ? alert.metric_value.toFixed(1) : alert.metric_value}
                </div>
              </div>
            )}

            {alert.threshold_value && (
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Threshold Limit</span>
                <div className="font-bold text-slate-700 text-xs mt-0.5 font-mono">
                  {alert.threshold_value}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Asset & Driver Association Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Vehicle Card */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 uppercase font-semibold flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-blue-600" />
                <span>Assigned Asset</span>
              </span>
              {vehicle && (
                <Link to={`/vehicles?id=${vehicle.id}`}>
                  <button className="text-[11px] text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5">
                    <span>Inspect</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </Link>
              )}
            </div>
            <div>
              <div className="font-semibold text-slate-900 text-xs font-sans">{vehicle ? vehicle.name : alert.vehicle_id}</div>
              <div className="text-[11px] text-slate-500 font-mono">
                {vehicle?.license_plate} · Health: {vehicle?.health_status || "GOOD"}
              </div>
            </div>
          </div>

          {/* Driver Card */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 uppercase font-semibold flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>Driver Context</span>
              </span>
              {driver && (
                <Link to={`/drivers?id=${driver.id}`}>
                  <button className="text-[11px] text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5">
                    <span>Inspect</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </Link>
              )}
            </div>
            <div>
              <div className="font-semibold text-slate-900 text-xs font-sans">{driver ? driver.name : "Unassigned"}</div>
              <div className="text-[11px] text-slate-500 font-mono">
                {driver ? `Score: ${driver.overall_safety_score.toFixed(1)} / 100` : "No direct driver"}
              </div>
            </div>
          </div>
        </div>

        {/* Live Powertrain Telematics Context */}
        {liveTelemetry && (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="text-[10px] text-slate-500 uppercase font-semibold flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-600" />
              <span>Live Powertrain Telematics</span>
            </span>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-white border border-slate-200">
                <span className="text-[9px] text-slate-500 uppercase block">Speed</span>
                <span className="font-bold text-slate-900 font-mono">{liveTelemetry.speed.toFixed(1)} km/h</span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200">
                <span className="text-[9px] text-slate-500 uppercase block">Temp</span>
                <span
                  className={clsx(
                    "font-bold font-mono",
                    liveTelemetry.engine_temp_c > 105
                      ? "text-rose-600"
                      : liveTelemetry.engine_temp_c > 95
                      ? "text-amber-600"
                      : "text-slate-900"
                  )}
                >
                  {liveTelemetry.engine_temp_c.toFixed(1)}°C
                </span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200">
                <span className="text-[9px] text-slate-500 uppercase block">Oil Press</span>
                <span
                  className={clsx(
                    "font-bold font-mono",
                    liveTelemetry.oil_pressure_psi < 20 ? "text-rose-600" : "text-slate-900"
                  )}
                >
                  {liveTelemetry.oil_pressure_psi.toFixed(1)} PSI
                </span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200">
                <span className="text-[9px] text-slate-500 uppercase block">Fuel</span>
                <span className="font-bold text-slate-900 font-mono">{liveTelemetry.fuel_level_pct.toFixed(0)}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Recommended Operator Action */}
        {alert.recommended_action && (
          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 space-y-1">
            <span className="text-[10px] text-blue-800 font-bold uppercase flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Recommended Operator Action</span>
            </span>
            <p className="text-slate-700 text-xs leading-relaxed font-sans">
              {alert.recommended_action}
            </p>
          </div>
        )}

        {/* Incident Lifecycle Timeline */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <span className="text-[10px] text-slate-500 uppercase font-semibold block">
            Incident Lifecycle
          </span>
          <div className="space-y-2 text-xs font-sans">
            {/* 1. Triggered */}
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
              <span className="text-slate-500">Triggered:</span>
              <span className="text-slate-900 font-mono font-medium">
                {new Date(alert.created_at || alert.timestamp).toLocaleString()}
              </span>
            </div>

            {/* 2. Acknowledged */}
            <div className="flex items-center gap-2">
              <span
                className={clsx(
                  "w-2 h-2 rounded-full shrink-0",
                  alert.is_acknowledged ? "bg-amber-500" : "bg-slate-300"
                )}
              ></span>
              <span className="text-slate-500">Acknowledged:</span>
              {alert.acknowledged_at ? (
                <span className="text-amber-700 font-mono font-medium">
                  {new Date(alert.acknowledged_at).toLocaleTimeString()}{" "}
                  {alert.acknowledged_by ? `by ${alert.acknowledged_by}` : ""}
                </span>
              ) : (
                <span className="text-slate-400">Pending Operator Acknowledgement</span>
              )}
            </div>

            {/* 3. Resolved */}
            <div className="flex items-center gap-2">
              <span
                className={clsx(
                  "w-2 h-2 rounded-full shrink-0",
                  isResolved ? "bg-emerald-500" : "bg-slate-300"
                )}
              ></span>
              <span className="text-slate-500">Resolved:</span>
              {alert.resolved_at ? (
                <span className="text-emerald-700 font-mono font-medium">
                  {new Date(alert.resolved_at).toLocaleTimeString()}
                </span>
              ) : (
                <span className="text-slate-400">Active / Unresolved</span>
              )}
            </div>
          </div>
        </div>

        {/* Resolution Notes Input (when expanding Resolve) */}
        {showResolveInput && !isResolved && (
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
            <label className="text-[10px] text-emerald-800 uppercase font-semibold block">
              Resolution Documentation
            </label>
            <textarea
              rows={2}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="e.g. Coolant topped up, sensor recalibrated, vehicle cleared for dispatch..."
              className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-slate-900 text-xs font-sans focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShowResolveInput(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleResolveSubmit}
                disabled={isActionPending}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                Confirm Resolve
              </Button>
            </div>
          </div>
        )}

        {/* Triage Action Controls Strip */}
        <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(alert.id)}
            disabled={isActionPending}
            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
          >
            Delete
          </Button>

          <div className="flex items-center gap-2">
            {!alert.is_acknowledged && !isResolved && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onAcknowledge(alert.id)}
                disabled={isActionPending}
                leftIcon={<Eye className="w-3.5 h-3.5 text-amber-500" />}
              >
                Acknowledge
              </Button>
            )}

            {!isResolved && !showResolveInput && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => setShowResolveInput(true)}
                disabled={isActionPending}
                leftIcon={<CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                Resolve Incident
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
