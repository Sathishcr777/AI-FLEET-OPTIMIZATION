import React from "react";
import { Card } from "../common/Card";
import { SeverityBadge } from "../common/SeverityBadge";
import { Skeleton } from "../common/Skeleton";
import { DriverAnalyticsResponse } from "../../api/analytics";
import { ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2, TrendingDown } from "lucide-react";
import { clsx } from "clsx";

export interface DriverSafetyScoreCardProps {
  analytics?: DriverAnalyticsResponse | null;
  isLoading?: boolean;
  className?: string;
}

export const DriverSafetyScoreCard: React.FC<DriverSafetyScoreCardProps> = ({
  analytics,
  isLoading = false,
  className,
}) => {
  if (isLoading) {
    return (
      <Card className={className} header="Driver Safety Scorecard">
        <div className="space-y-4">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </Card>
    );
  }

  const score = analytics?.safety_score ?? 100.0;
  const riskLevel = analytics?.risk_level ?? "LOW";
  const summary =
    analytics?.summary || "Driver operates within safe commercial envelope with zero active safety infractions.";

  const isCritical = riskLevel === "CRITICAL" || score < 50;
  const isHigh = riskLevel === "HIGH";
  const isMedium = riskLevel === "MEDIUM";

  const scoreColor = isCritical
    ? "text-rose-400"
    : isHigh
    ? "text-rose-400"
    : isMedium
    ? "text-amber-400"
    : "text-emerald-400";

  const progressBg = isCritical
    ? "bg-rose-500 shadow-glow-crimson"
    : isHigh
    ? "bg-rose-500 shadow-glow-crimson"
    : isMedium
    ? "bg-amber-400 shadow-glow-amber"
    : "bg-emerald-400 shadow-glow-emerald";

  // Score Deduction Breakdown calculations based on backend formula
  const harshBrake = analytics?.harsh_braking_events ?? 0;
  const rapidAccel = analytics?.rapid_acceleration_events ?? 0;
  const speeding = analytics?.speeding_events ?? 0;
  const idle = analytics?.excessive_idle_events ?? 0;

  const deductions = [
    { label: "Harsh Braking", count: harshBrake, ptsPerEvent: 8.0, total: harshBrake * 8.0 },
    { label: "Rapid Acceleration", count: rapidAccel, ptsPerEvent: 5.0, total: rapidAccel * 5.0 },
    { label: "Overspeeding (>90 km/h)", count: speeding, ptsPerEvent: 10.0, total: speeding * 10.0 },
    { label: "Excessive Idling (>3 min)", count: idle, ptsPerEvent: 6.0, total: idle * 6.0 },
  ].filter((d) => d.count > 0);

  return (
    <Card
      variant={isCritical ? "criticalGlow" : "default"}
      className={clsx("flex flex-col justify-between select-none shadow-card", className)}
      header={
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-slate-100 font-sans">Safety Score & Risk Assessment</span>
        </div>
      }
      headerAction={<SeverityBadge severity={riskLevel} size="sm" />}
    >
      <div className="space-y-4">
        {/* Score & Meter Strip */}
        <div className="p-4 rounded-xl bg-[#0B0F19] border border-[#1F2E47] flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 font-sans">
              Commercial Safety Index
            </p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className={clsx("text-3xl font-bold font-mono tracking-tight", scoreColor)}>
                {score.toFixed(1)}
              </span>
              <span className="text-xs font-mono text-slate-500">/ 100</span>
            </div>
            <p className="text-[10px] text-slate-400 font-sans mt-0.5">
              Observations: {analytics?.total_observations ?? 0} telemetry frames
            </p>
          </div>

          <div className="w-36 space-y-1.5 text-right">
            <div className="flex items-center justify-end gap-1.5 text-xs">
              {isCritical ? (
                <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
              ) : isMedium || isHigh ? (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
              <span className={clsx("font-bold text-xs font-mono", scoreColor)}>{riskLevel} RISK</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700/50">
              <div
                className={clsx("h-full rounded-full transition-all duration-500", progressBg)}
                style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Narrative Diagnostic Summary */}
        <div className="text-xs text-slate-300 bg-[#0B0F19] p-3.5 rounded-xl border border-[#1F2E47] leading-relaxed font-sans">
          <p className="font-semibold text-slate-100 mb-1">Safety Diagnostics:</p>
          <p>{summary}</p>
        </div>

        {/* Score Deductions Itemization */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 font-sans">
            Score Deductions Breakdown
          </p>
          {deductions.length === 0 ? (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-sans">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
              <span>Zero safety violations or penalty deductions recorded for this driver.</span>
            </div>
          ) : (
            <div className="space-y-1.5 font-mono text-xs">
              {deductions.map((d, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-[#0B0F19] border border-[#1F2E47]"
                >
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span className="text-slate-200 font-sans">{d.label}</span>
                    <span className="text-[10px] text-slate-400 font-sans font-medium">
                      ({d.count} × -{d.ptsPerEvent} pts)
                    </span>
                  </div>
                  <span className="font-bold text-rose-400">-{d.total.toFixed(1)} pts</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
