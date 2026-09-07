import React, { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../common/Card";
import { Vehicle } from "../../types/api";
import { ShieldCheck, AlertCircle, AlertTriangle } from "lucide-react";
import { clsx } from "clsx";

export interface FleetConditionPanelProps {
  vehicles: Vehicle[];
  onSelectVehicle?: (id: string) => void;
  selectedVehicleId?: string | null;
  className?: string;
}

export const FleetConditionPanel: React.FC<FleetConditionPanelProps> = ({
  vehicles,
  onSelectVehicle,
  selectedVehicleId,
  className,
}) => {
  const counts = useMemo(() => {
    let healthy = 0;
    let warning = 0;
    let critical = 0;

    for (const v of vehicles) {
      if (v.health_status === "CRITICAL") critical++;
      else if (v.health_status === "WARNING") warning++;
      else healthy++;
    }

    const total = vehicles.length;
    const healthyPct = total > 0 ? (healthy / total) * 100 : 100;
    const warningPct = total > 0 ? (warning / total) * 100 : 0;
    const criticalPct = total > 0 ? (critical / total) * 100 : 0;

    return { healthy, warning, critical, total, healthyPct, warningPct, criticalPct };
  }, [vehicles]);

  return (
    <Card className={clsx("flex flex-col bg-[#111C2D] border-slate-800", className)}>
      <CardHeader className="border-b border-slate-800">
        <div className="flex items-center justify-between w-full">
          <div>
            <CardTitle className="text-slate-100 text-lg">Fleet Condition</CardTitle>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Current operational health distribution ({counts.total} assets)
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-cyan-400 bg-[#0B0F19] px-2.5 py-1 rounded-md border border-slate-800">
            {counts.total} UNITS
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-4">
        {/* Horizontal Distribution Segmented Bar with Neon Glow */}
        <div className="space-y-1.5">
          <div className="h-4 w-full rounded-full bg-[#0B0F19] overflow-hidden flex border border-slate-800/80 p-0.5">
            {counts.healthy > 0 && (
              <div
                style={{ width: `${counts.healthyPct}%` }}
                className="bg-emerald-400 shadow-glow-emerald rounded-l-full transition-all duration-300 relative group"
                title={`${counts.healthy} Healthy (${counts.healthyPct.toFixed(0)}%)`}
              />
            )}
            {counts.warning > 0 && (
              <div
                style={{ width: `${counts.warningPct}%` }}
                className="bg-amber-400 shadow-glow-amber transition-all duration-300 relative group"
                title={`${counts.warning} Warning (${counts.warningPct.toFixed(0)}%)`}
              />
            )}
            {counts.critical > 0 && (
              <div
                style={{ width: `${counts.criticalPct}%` }}
                className="bg-rose-500 shadow-glow-crimson rounded-r-full transition-all duration-300 relative group"
                title={`${counts.critical} Critical (${counts.criticalPct.toFixed(0)}%)`}
              />
            )}
          </div>
        </div>

        {/* 3 Metrics Pills */}
        <div className="grid grid-cols-3 gap-2.5 text-xs font-sans">
          <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 flex flex-col">
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-bold uppercase">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Healthy</span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="font-mono font-bold text-xl text-white tabular-nums">
                {counts.healthy}
              </span>
              <span className="text-[11px] text-emerald-400 font-mono font-semibold">
                ({counts.healthyPct.toFixed(0)}%)
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300 flex flex-col">
            <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-bold uppercase">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Warning</span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="font-mono font-bold text-xl text-white tabular-nums">
                {counts.warning}
              </span>
              <span className="text-[11px] text-amber-400 font-mono font-semibold">
                ({counts.warningPct.toFixed(0)}%)
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 flex flex-col">
            <div className="flex items-center gap-1.5 text-[11px] text-rose-400 font-bold uppercase">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>Critical</span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="font-mono font-bold text-xl text-white tabular-nums">
                {counts.critical}
              </span>
              <span className="text-[11px] text-rose-400 font-mono font-semibold">
                ({counts.criticalPct.toFixed(0)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Vehicle Chips Strip */}
        <div className="pt-3 border-t border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 font-sans">
            Fleet Asset Status
          </span>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1">
            {vehicles.map((v) => {
              const isSelected = selectedVehicleId === v.id;
              const statusColor =
                v.health_status === "CRITICAL"
                  ? "bg-rose-950/40 border-rose-800/80 text-rose-300"
                  : v.health_status === "WARNING"
                  ? "bg-amber-950/40 border-amber-800/80 text-amber-300"
                  : "bg-[#0B0F19] border-slate-800 text-slate-300";

              const dotColor =
                v.health_status === "CRITICAL"
                  ? "bg-rose-500 shadow-glow-crimson"
                  : v.health_status === "WARNING"
                  ? "bg-amber-400 shadow-glow-amber"
                  : "bg-emerald-400 shadow-glow-emerald";

              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onSelectVehicle && onSelectVehicle(v.id)}
                  className={clsx(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border transition-all cursor-pointer font-medium hover:border-slate-600",
                    isSelected ? "ring-2 ring-blue-500 border-blue-500 font-bold bg-[#16253B] text-white shadow-glow-sm" : statusColor
                  )}
                  title={`${v.name} (${v.health_status})`}
                >
                  <span className={clsx("w-2 h-2 rounded-full shrink-0", dotColor)} />
                  <span className="truncate max-w-32">{v.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

