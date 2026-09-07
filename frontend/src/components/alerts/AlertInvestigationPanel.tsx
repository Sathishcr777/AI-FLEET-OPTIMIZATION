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
        className={clsx("flex flex-col h-full select-none shadow-card bg-[#111C2D] border border-[#1F2E47]", className)}
        header={
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-blue-400" />
            <span className="font-semibold text-white font-sans">Incident Investigation & Triage</span>
          </div>
        }
      >
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center rounded-xl bg-[#0B0F19] border border-[#1F2E47] my-auto">
          <div className="p-3 rounded-2xl bg-[#16253B] border border-[#1F2E47] text-blue-400 mb-3 shadow-inner">
            <Eye className="w-6 h-6" />
          </div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">No Incident Selected</h4>
          <p className="text-xs text-slate-400 mt-1.5 max-w-xs font-sans leading-relaxed">
            Select an incident from the queue to review telemetry diagnostics, verify root causes, and execute triage actions.
          </p>
        </div>
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
      className={clsx("flex flex-col h-full select-none shadow-card bg-[#111C2D] border border-[#1F2E47]", className)}
      header={
        <div className="flex items-center gap-2 truncate">
          <ShieldAlert className="w-4 h-4 text-blue-400 shrink-0" />
          <span className="font-semibold text-white font-sans truncate">Incident Investigation</span>
        </div>
      }
      headerAction={<SeverityBadge severity={alert.severity} size="sm" />}
    >
      <div className="space-y-4 overflow-y-auto pr-1 flex-1 font-sans text-xs">
        {/* Top Title & Status Banner */}
        <div className="p-3.5 rounded-xl bg-[#0B0F19] border border-[#1F2E47] space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-white text-sm font-sans">{alert.title}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
                ID: <span className="font-mono text-slate-300">{alert.id}</span> · Type:{" "}
                <span className="text-cyan-400 font-semibold font-mono">{alert.alert_type}</span>
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

          <p className="text-slate-200 text-xs bg-[#111C2D] p-3 rounded-lg border border-[#1F2E47] leading-relaxed">
            {alert.message}
          </p>
        </div>

        {/* Metric & Diagnostic Context Strip */}
        {(alert.metric_name || alert.metric_value !== undefined || alert.threshold_value) && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {alert.metric_name && (
              <div className="p-2.5 rounded-xl bg-[#0B0F19] border border-[#1F2E47]">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block font-mono">Metric Trigger</span>
                <div className="font-semibold text-white text-xs mt-0.5 font-mono">{alert.metric_name}</div>
              </div>
            )}

            {alert.metric_value !== undefined && alert.metric_value !== null && (
              <div className="p-2.5 rounded-xl bg-[#0B0F19] border border-[#1F2E47]">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block font-mono">Observed Value</span>
                <div className="font-bold text-rose-400 text-xs mt-0.5 font-mono">
                  {typeof alert.metric_value === "number" ? alert.metric_value.toFixed(1) : alert.metric_value}
                </div>
              </div>
            )}

            {alert.threshold_value && (
              <div className="p-2.5 rounded-xl bg-[#0B0F19] border border-[#1F2E47]">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block font-mono">Threshold Limit</span>
                <div className="font-bold text-slate-300 text-xs mt-0.5 font-mono">
                  {alert.threshold_value}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Asset & Driver Association Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Vehicle Card */}
          <div className="p-3 rounded-xl bg-[#0B0F19] border border-[#1F2E47] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1 font-mono">
                <Truck className="w-3.5 h-3.5 text-blue-400" />
                <span>Assigned Asset</span>
              </span>
              {vehicle && (
                <Link to={`/vehicles?id=${vehicle.id}`}>
                  <button className="text-[11px] text-blue-400 hover:text-blue-300 font-medium flex items-center gap-0.5">
                    <span>Inspect</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </Link>
              )}
            </div>
            <div>
              <div className="font-semibold text-white text-xs font-sans">{vehicle ? vehicle.name : alert.vehicle_id}</div>
              <div className="text-[11px] text-slate-400 font-mono">
                {vehicle?.license_plate} · Health: {vehicle?.health_status || "GOOD"}
              </div>
            </div>
          </div>

          {/* Driver Card */}
          <div className="p-3 rounded-xl bg-[#0B0F19] border border-[#1F2E47] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1 font-mono">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>Driver Context</span>
              </span>
              {driver && (
                <Link to={`/drivers?id=${driver.id}`}>
                  <button className="text-[11px] text-blue-400 hover:text-blue-300 font-medium flex items-center gap-0.5">
                    <span>Inspect</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </Link>
              )}
            </div>
            <div>
              <div className="font-semibold text-white text-xs font-sans">{driver ? driver.name : "Unassigned"}</div>
              <div className="text-[11px] text-slate-400 font-mono">
                {driver ? `Score: ${driver.overall_safety_score.toFixed(1)} / 100` : "No direct driver"}
              </div>
            </div>
          </div>
        </div>

        {/* Live Powertrain Telematics Context */}
        {liveTelemetry && (
          <div className="p-3.5 rounded-xl bg-[#0B0F19] border border-[#1F2E47] space-y-2">
            <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1.5 font-mono">
              <Activity className="w-3.5 h-3.5 text-blue-400" />
              <span>Live Powertrain Telematics</span>
            </span>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-[#111C2D] border border-[#1F2E47]">
                <span className="text-[9px] text-slate-400 uppercase block font-mono">Speed</span>
                <span className="font-bold text-white font-mono">{liveTelemetry.speed.toFixed(1)} km/h</span>
              </div>
              <div className="p-2 rounded-lg bg-[#111C2D] border border-[#1F2E47]">
                <span className="text-[9px] text-slate-400 uppercase block font-mono">Temp</span>
                <span
                  className={clsx(
                    "font-bold font-mono",
                    liveTelemetry.engine_temp_c > 105
                      ? "text-rose-400"
                      : liveTelemetry.engine_temp_c > 95
                      ? "text-amber-400"
                      : "text-white"
                  )}
                >
                  {liveTelemetry.engine_temp_c.toFixed(1)}°C
                </span>
              </div>
              <div className="p-2 rounded-lg bg-[#111C2D] border border-[#1F2E47]">
                <span className="text-[9px] text-slate-400 uppercase block font-mono">Oil Press</span>
                <span
                  className={clsx(
                    "font-bold font-mono",
                    liveTelemetry.oil_pressure_psi < 20 ? "text-rose-400" : "text-white"
                  )}
                >
                  {liveTelemetry.oil_pressure_psi.toFixed(1)} PSI
                </span>
              </div>
              <div className="p-2 rounded-lg bg-[#111C2D] border border-[#1F2E47]">
                <span className="text-[9px] text-slate-400 uppercase block font-mono">Fuel</span>
                <span className="font-bold text-white font-mono">{liveTelemetry.fuel_level_pct.toFixed(0)}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Recommended Operator Action */}
        {alert.recommended_action && (
          <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-500/30 space-y-1">
            <span className="text-[10px] text-blue-300 font-bold uppercase flex items-center gap-1 font-mono">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Recommended Operator Action</span>
            </span>
            <p className="text-slate-200 text-xs leading-relaxed font-sans">
              {alert.recommended_action}
            </p>
          </div>
        )}

        {/* Incident Lifecycle Timeline */}
        <div className="p-3.5 rounded-xl bg-[#0B0F19] border border-[#1F2E47] space-y-2">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block font-mono">
            Incident Lifecycle
          </span>
          <div className="space-y-2 text-xs font-sans">
            {/* 1. Triggered */}
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
              <span className="text-slate-400">Triggered:</span>
              <span className="text-slate-200 font-mono font-medium">
                {new Date(alert.created_at || alert.timestamp).toLocaleString()}
              </span>
            </div>

            {/* 2. Acknowledged */}
            <div className="flex items-center gap-2">
              <span
                className={clsx(
                  "w-2 h-2 rounded-full shrink-0",
                  alert.is_acknowledged ? "bg-amber-400" : "bg-[#1F2E47]"
                )}
              ></span>
              <span className="text-slate-400">Acknowledged:</span>
              {alert.acknowledged_at ? (
                <span className="text-amber-400 font-mono font-medium">
                  {new Date(alert.acknowledged_at).toLocaleTimeString()}{" "}
                  {alert.acknowledged_by ? `by ${alert.acknowledged_by}` : ""}
                </span>
              ) : (
                <span className="text-slate-500">Pending Operator Acknowledgement</span>
              )}
            </div>

            {/* 3. Resolved */}
            <div className="flex items-center gap-2">
              <span
                className={clsx(
                  "w-2 h-2 rounded-full shrink-0",
                  isResolved ? "bg-emerald-400" : "bg-[#1F2E47]"
                )}
              ></span>
              <span className="text-slate-400">Resolved:</span>
              {alert.resolved_at ? (
                <span className="text-emerald-400 font-mono font-medium">
                  {new Date(alert.resolved_at).toLocaleTimeString()}
                </span>
              ) : (
                <span className="text-slate-500">Active / Unresolved</span>
              )}
            </div>
          </div>
        </div>

        {/* Resolution Notes Input (when expanding Resolve) */}
        {showResolveInput && !isResolved && (
          <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 space-y-2">
            <label className="text-[10px] text-emerald-300 uppercase font-semibold block font-mono">
              Resolution Documentation
            </label>
            <textarea
              rows={2}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="e.g. Coolant topped up, sensor recalibrated, vehicle cleared for dispatch..."
              className="w-full px-3 py-2 bg-[#0B0F19] border border-emerald-500/40 rounded-lg text-white placeholder:text-slate-500 text-xs font-sans focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
        <div className="pt-2 border-t border-[#1F2E47] flex flex-wrap items-center justify-between gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(alert.id)}
            disabled={isActionPending}
            className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
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
