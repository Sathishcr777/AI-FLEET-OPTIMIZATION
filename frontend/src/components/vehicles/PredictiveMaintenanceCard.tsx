import React from "react";
import { Card } from "../common/Card";
import { SeverityBadge } from "../common/SeverityBadge";
import { Skeleton } from "../common/Skeleton";
import { MaintenancePredictionResponse } from "../../api/analytics";
import { Wrench, Clock, AlertOctagon } from "lucide-react";
import { clsx } from "clsx";

export interface PredictiveMaintenanceCardProps {
  prediction?: MaintenancePredictionResponse | null;
  isLoading?: boolean;
  className?: string;
}

export const PredictiveMaintenanceCard: React.FC<PredictiveMaintenanceCardProps> = ({
  prediction,
  isLoading = false,
  className,
}) => {
  if (isLoading) {
    return (
      <Card className={className} header="Predictive Maintenance">
        <div className="space-y-4">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </Card>
    );
  }

  const riskScore = prediction?.risk_score ?? 0.0;
  const riskLevel = prediction?.risk_level ?? "LOW";
  const recommendation =
    prediction?.recommendation ||
    "Continue scheduled maintenance and monitor trend lines during the next inspection cycle.";
  const rulKm = prediction?.estimated_rul_km ?? 18000;
  const factors = prediction?.contributing_factors || [];

  const isCritical = riskLevel === "CRITICAL";
  const isHigh = riskLevel === "HIGH";
  const isMedium = riskLevel === "MEDIUM";

  const riskColor = isCritical
    ? "text-rose-400"
    : isHigh
    ? "text-rose-400"
    : isMedium
    ? "text-amber-400"
    : "text-emerald-400";

  return (
    <Card
      variant={isCritical ? "criticalGlow" : "default"}
      className={clsx("flex flex-col justify-between select-none shadow-card", className)}
      header={
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-slate-100 font-sans">Predictive Maintenance Intelligence</span>
        </div>
      }
      headerAction={<SeverityBadge severity={riskLevel} size="sm" />}
    >
      <div className="space-y-4">
        {/* Risk & RUL Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Failure Risk Score */}
          <div className="p-3.5 rounded-xl bg-[#0B0F19] border border-[#1F2E47] space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 font-sans">
              Breakdown Risk
            </p>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className={clsx("text-2xl font-bold font-mono tracking-tight", riskColor)}>
                {riskScore.toFixed(1)}%
              </span>
              <span className="text-[11px] font-mono text-slate-400 uppercase">({riskLevel})</span>
            </div>
            <p className="text-[10px] text-slate-400 font-sans">Statistical failure probability</p>
          </div>

          {/* Estimated RUL */}
          <div className="p-3.5 rounded-xl bg-[#0B0F19] border border-[#1F2E47] space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider font-sans">Estimated RUL</span>
              <Clock className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-bold font-mono text-cyan-400 tracking-tight">
                {rulKm.toLocaleString()}
              </span>
              <span className="text-xs font-mono text-slate-400">km</span>
            </div>
            <p className="text-[10px] text-slate-400 font-sans">Remaining Useful Life</p>
          </div>
        </div>

        {/* Actionable Maintenance Recommendation */}
        <div className="p-3.5 rounded-xl bg-[#0B0F19] border border-[#1F2E47] space-y-1.5 font-sans">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
            <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
            <span>Recommended Maintenance Action:</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">{recommendation}</p>
        </div>

        {/* Contributing Degradation Factors */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 font-sans">
              Contributing Risk Factors ({factors.length})
            </p>
          </div>

          {factors.length === 0 ? (
            <div className="p-3 rounded-xl bg-[#0B0F19] border border-[#1F2E47] text-xs text-slate-400 font-sans">
              No significant component wear or thermal degradation factors detected.
            </div>
          ) : (
            <div className="space-y-2">
              {factors.map((item, idx) => {
                const factorName = typeof item === "string" ? item : item.factor;
                const weight = typeof item === "string" ? 10 : item.weight;
                return (
                  <div key={idx} className="p-2.5 rounded-lg bg-[#0B0F19] border border-[#1F2E47] space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-200 font-semibold">{factorName.replace(/_/g, " ")}</span>
                      <span className="text-cyan-400 font-bold">+{weight.toFixed(1)} pts</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-400 h-full rounded-full"
                        style={{ width: `${Math.min(100, weight * 3.5)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

