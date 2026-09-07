import React from "react";
import { Link } from "react-router-dom";
import { Card } from "../common/Card";
import { Badge } from "../common/Badge";
import { Alert } from "../../types/alerts";
import { Vehicle } from "../../types/api";
import { ShieldAlert, AlertTriangle, ShieldCheck, Activity, ExternalLink } from "lucide-react";
import { clsx } from "clsx";

export interface FleetHealthAlertDistributionProps {
  alerts: Alert[];
  vehicles: Vehicle[];
  className?: string;
}

export const FleetHealthAlertDistribution: React.FC<FleetHealthAlertDistributionProps> = ({
  alerts,
  vehicles,
  className,
}) => {
  // 1. Severity Distribution
  const severityCounts = React.useMemo(() => {
    let critical = 0;
    let high = 0;
    let medium = 0;
    let low = 0;

    for (const a of alerts) {
      if (a.status === "RESOLVED") continue;
      if (a.severity === "CRITICAL") critical++;
      else if (a.severity === "HIGH") high++;
      else if (a.severity === "MEDIUM") medium++;
      else low++;
    }

    const total = critical + high + medium + low;
    return { critical, high, medium, low, total };
  }, [alerts]);

  // 2. Fleet Health Status Breakdown
  const healthCounts = React.useMemo(() => {
    let good = 0;
    let warning = 0;
    let critical = 0;

    for (const v of vehicles) {
      if (v.health_status === "CRITICAL") critical++;
      else if (v.health_status === "WARNING") warning++;
      else good++;
    }

    const total = vehicles.length;
    return { good, warning, critical, total };
  }, [vehicles]);

  // Overall Condition Assessment
  const conditionStatus = React.useMemo(() => {
    if (severityCounts.critical > 0 || healthCounts.critical > 0) {
      return {
        label: "CRITICAL ATTENTION REQUIRED",
        color: "text-rose-700 bg-rose-50 border-rose-200",
        badge: "critical",
        explanation: `${severityCounts.critical} critical incident(s) and ${healthCounts.critical} asset(s) in critical health state.`,
      };
    }
    if (severityCounts.high > 0 || healthCounts.warning > 0) {
      return {
        label: "ELEVATED OPERATIONAL RISK",
        color: "text-amber-800 bg-amber-50 border-amber-200",
        badge: "warning",
        explanation: `${severityCounts.high} high-priority incident(s) requiring supervisor triage.`,
      };
    }
    return {
      label: "FLEET CONDITION STABLE",
      color: "text-emerald-800 bg-emerald-50 border-emerald-200",
      badge: "success",
      explanation: "All telemetry signals, diagnostics, and driver safety behaviors operating within normal bounds.",
    };
  }, [severityCounts, healthCounts]);

  const totalSev = severityCounts.total || 1;
  const pctCrit = Math.round((severityCounts.critical / totalSev) * 100);
  const pctHigh = Math.round((severityCounts.high / totalSev) * 100);
  const pctMed = Math.round((severityCounts.medium / totalSev) * 100);
  const pctLow = Math.round((severityCounts.low / totalSev) * 100);

  return (
    <Card
      className={clsx("flex flex-col select-none shadow-card", className)}
      header={
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-sm text-slate-900 font-sans">
            Fleet Condition & Incident Distribution
          </span>
        </div>
      }
      headerAction={
        <Badge variant={conditionStatus.badge as any} size="sm" dot>
          {severityCounts.total} ACTIVE INCIDENTS
        </Badge>
      }
    >
      <div className="space-y-4 font-sans text-xs">
        {/* Overall Fleet Status Banner */}
        <div className={clsx("p-3 rounded-xl border flex items-center justify-between gap-3", conditionStatus.color)}>
          <div className="flex items-center gap-2">
            {conditionStatus.badge === "critical" ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <div>
              <div className="font-bold text-xs">{conditionStatus.label}</div>
              <p className="text-[11px] opacity-90 mt-0.5">{conditionStatus.explanation}</p>
            </div>
          </div>

          <Link to="/alerts">
            <span className="text-[11px] font-semibold underline shrink-0 flex items-center gap-0.5">
              <span>View Alerts</span>
              <ExternalLink className="w-3 h-3" />
            </span>
          </Link>
        </div>

        {/* 1. Alert Severity Distribution */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-500 font-sans">
            <span className="font-semibold text-slate-700">Incident Severity Breakdown</span>
            <span className="font-mono text-slate-400">Open Queue ({severityCounts.total})</span>
          </div>

          {/* Distribution Bar */}
          <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden flex border border-slate-200">
            {pctCrit > 0 && <div style={{ width: `${pctCrit}%` }} className="bg-rose-500 transition-all" title={`Critical: ${severityCounts.critical}`} />}
            {pctHigh > 0 && <div style={{ width: `${pctHigh}%` }} className="bg-amber-500 transition-all" title={`High: ${severityCounts.high}`} />}
            {pctMed > 0 && <div style={{ width: `${pctMed}%` }} className="bg-blue-500 transition-all" title={`Medium: ${severityCounts.medium}`} />}
            {pctLow > 0 && <div style={{ width: `${pctLow}%` }} className="bg-slate-400 transition-all" title={`Low: ${severityCounts.low}`} />}
          </div>

          {/* 4 Severity Columns */}
          <div className="grid grid-cols-4 gap-2 pt-1 text-center">
            <div className="p-2 rounded-lg bg-rose-50/70 border border-rose-200">
              <span className="text-[10px] font-bold text-rose-800 uppercase block font-mono">Critical</span>
              <span className="text-rose-900 font-bold text-sm font-mono">{severityCounts.critical}</span>
            </div>
            <div className="p-2 rounded-lg bg-amber-50/70 border border-amber-200">
              <span className="text-[10px] font-bold text-amber-800 uppercase block font-mono">High</span>
              <span className="text-amber-900 font-bold text-sm font-mono">{severityCounts.high}</span>
            </div>
            <div className="p-2 rounded-lg bg-blue-50/70 border border-blue-200">
              <span className="text-[10px] font-bold text-blue-800 uppercase block font-mono">Medium</span>
              <span className="text-blue-900 font-bold text-sm font-mono">{severityCounts.medium}</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-600 uppercase block font-mono">Low</span>
              <span className="text-slate-800 font-bold text-sm font-mono">{severityCounts.low}</span>
            </div>
          </div>
        </div>

        {/* 2. Asset Health Overview */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
          <span className="flex items-center gap-1.5 font-medium">
            <Activity className="w-3.5 h-3.5 text-blue-600" />
            <span>Asset Status:</span>
          </span>
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="text-emerald-700 font-bold">{healthCounts.good} Nominal</span>
            <span className="text-slate-300">·</span>
            <span className="text-amber-700 font-bold">{healthCounts.warning} Degraded</span>
            <span className="text-slate-300">·</span>
            <span className="text-rose-700 font-bold">{healthCounts.critical} Critical</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
