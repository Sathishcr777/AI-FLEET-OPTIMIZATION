import React from "react";
import { Card } from "../common/Card";
import { StatusBadge } from "../common/StatusBadge";
import { Badge } from "../common/Badge";
import { Skeleton } from "../common/Skeleton";
import { VehicleHealthResponse } from "../../api/analytics";
import { Activity, AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { clsx } from "clsx";

export interface VehicleHealthCardProps {
  health?: VehicleHealthResponse | null;
  isLoading?: boolean;
  className?: string;
}

export const VehicleHealthCard: React.FC<VehicleHealthCardProps> = ({
  health,
  isLoading = false,
  className,
}) => {
  if (isLoading) {
    return (
      <Card className={className} header="Powertrain Health Index">
        <div className="space-y-4">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </Card>
    );
  }

  const score = health?.health_score ?? 100.0;
  const status = health?.status ?? "GOOD";
  const riskFactors = health?.risk_factors || [];
  const summary = health?.summary || "Powertrain operating within nominal factory thresholds.";

  const isCritical = status === "CRITICAL" || score < 50;
  const isWarning = status === "WARNING" || (score >= 50 && score < 80);

  const statusColor = isCritical
    ? "text-rose-400"
    : isWarning
    ? "text-amber-400"
    : "text-emerald-400";

  const progressBg = isCritical
    ? "bg-rose-500 shadow-glow-crimson"
    : isWarning
    ? "bg-amber-400 shadow-glow-amber"
    : "bg-emerald-400 shadow-glow-emerald";

  return (
    <Card
      variant={isCritical ? "criticalGlow" : "default"}
      className={clsx("flex flex-col justify-between select-none shadow-card", className)}
      header={
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-slate-100 font-sans">Powertrain Health Assessment</span>
        </div>
      }
      headerAction={<StatusBadge status={status} size="sm" />}
    >
      <div className="space-y-4">
        {/* Score & Meter */}
        <div className="p-4 rounded-xl bg-[#0B0F19] border border-[#1F2E47] flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 font-sans">
              System Health Score
            </p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className={clsx("text-3xl font-bold font-mono tracking-tight", statusColor)}>
                {score.toFixed(1)}
              </span>
              <span className="text-xs font-mono text-slate-500">/ 100</span>
            </div>
          </div>

          <div className="w-36 space-y-1.5 text-right">
            <div className="flex items-center justify-end gap-1.5 text-xs">
              {isCritical ? (
                <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
              ) : isWarning ? (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
              <span className={clsx("font-bold text-xs font-mono", statusColor)}>{status}</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700/50">
              <div
                className={clsx("h-full rounded-full transition-all duration-500", progressBg)}
                style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Narrative Explanation */}
        <div className="text-xs text-slate-300 bg-[#0B0F19] p-3.5 rounded-xl border border-[#1F2E47] leading-relaxed font-sans">
          <p className="font-semibold text-slate-100 mb-1">Diagnostic Summary:</p>
          <p>{summary}</p>
        </div>

        {/* Risk Factors List */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 font-sans">
            Identified Risk Factors ({riskFactors.length})
          </p>
          {riskFactors.length === 0 ? (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-sans">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
              <span>Zero abnormal powertrain risk factors detected.</span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {riskFactors.map((factor, idx) => (
                <Badge key={idx} variant={isCritical ? "critical" : "warning"} size="sm" dot>
                  {factor}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

