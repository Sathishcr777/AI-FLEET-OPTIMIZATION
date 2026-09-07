import React from "react";
import { Link } from "react-router-dom";
import { Card } from "../common/Card";
import { Badge } from "../common/Badge";
import { Vehicle } from "../../types/api";
import { Activity, ExternalLink, ShieldCheck, Truck } from "lucide-react";
import { clsx } from "clsx";

export interface FleetHealthChartProps {
  vehicles: Vehicle[];
  className?: string;
}

const getHealthScore = (status: string): number => {
  if (status === "CRITICAL") return 40;
  if (status === "WARNING") return 70;
  return 95;
};

export const FleetHealthChart: React.FC<FleetHealthChartProps> = ({ vehicles, className }) => {
  const total = vehicles.length;

  const counts = React.useMemo(() => {
    let good = 0;
    let warning = 0;
    let critical = 0;
    let totalScore = 0;

    for (const v of vehicles) {
      const score = getHealthScore(v.health_status);
      totalScore += score;
      if (v.health_status === "CRITICAL") {
        critical++;
      } else if (v.health_status === "WARNING") {
        warning++;
      } else {
        good++;
      }
    }

    const avgScore = total > 0 ? totalScore / total : 0;
    return { good, warning, critical, avgScore };
  }, [vehicles, total]);

  const pctGood = total > 0 ? Math.round((counts.good / total) * 100) : 0;
  const pctWarning = total > 0 ? Math.round((counts.warning / total) * 100) : 0;
  const pctCritical = total > 0 ? Math.round((counts.critical / total) * 100) : 0;

  // Vehicles requiring attention
  const attentionVehicles = React.useMemo(() => {
    return vehicles
      .filter((v) => v.health_status !== "GOOD")
      .sort((a, b) => getHealthScore(a.health_status) - getHealthScore(b.health_status));
  }, [vehicles]);

  return (
    <Card
      className={clsx("flex flex-col h-full select-none shadow-card bg-[#111C2D] border border-[#1F2E47]", className)}
      header={
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-white font-sans text-sm sm:text-base">Fleet Health Distribution</span>
        </div>
      }
      headerAction={
        <Badge variant={counts.avgScore >= 80 ? "success" : counts.avgScore >= 65 ? "warning" : "critical"} size="sm">
          AVG {counts.avgScore.toFixed(1)} / 100
        </Badge>
      }
    >
      <div className="space-y-4 font-sans text-xs overflow-y-auto pr-1 flex-1">
        {/* Distribution Progress Bar */}
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1.5 font-sans">
            <span>Fleet Status Breakdown</span>
            <span className="font-mono text-cyan-400">{total} Total Assets</span>
          </div>

          <div className="h-3 w-full rounded-full bg-[#0B0F19] overflow-hidden flex border border-[#1F2E47]">
            {pctGood > 0 && (
              <div
                style={{ width: `${pctGood}%` }}
                className="bg-emerald-500 transition-all duration-300"
                title={`Good: ${counts.good} (${pctGood}%)`}
              />
            )}
            {pctWarning > 0 && (
              <div
                style={{ width: `${pctWarning}%` }}
                className="bg-amber-500 transition-all duration-300"
                title={`Warning: ${counts.warning} (${pctWarning}%)`}
              />
            )}
            {pctCritical > 0 && (
              <div
                style={{ width: `${pctCritical}%` }}
                className="bg-rose-500 transition-all duration-300"
                title={`Critical: ${counts.critical} (${pctCritical}%)`}
              />
            )}
          </div>

          {/* Legend Strip */}
          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
            <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
              <span className="text-[10px] text-emerald-400 font-bold block font-mono">GOOD ({pctGood}%)</span>
              <span className="text-emerald-300 font-bold text-base font-mono">{counts.good}</span>
              <span className="text-[10px] text-emerald-500 block">Nominal</span>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30">
              <span className="text-[10px] text-amber-400 font-bold block font-mono">WARNING ({pctWarning}%)</span>
              <span className="text-amber-300 font-bold text-base font-mono">{counts.warning}</span>
              <span className="text-[10px] text-amber-500 block">Degraded</span>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/30">
              <span className="text-[10px] text-rose-400 font-bold block font-mono">CRITICAL ({pctCritical}%)</span>
              <span className="text-rose-300 font-bold text-base font-mono">{counts.critical}</span>
              <span className="text-[10px] text-rose-500 block">Immediate</span>
            </div>
          </div>
        </div>

        {/* Vehicles Requiring Attention */}
        <div className="pt-3 border-t border-[#1F2E47] space-y-2.5">
          <span className="text-[11px] text-slate-400 uppercase font-semibold block flex items-center justify-between font-sans">
            <span>Assets Requiring Health Attention ({attentionVehicles.length})</span>
            {attentionVehicles.length > 0 && (
              <span className="text-amber-400 text-[10px] font-mono">Prioritized</span>
            )}
          </span>

          {attentionVehicles.length === 0 ? (
            <div className="p-4 rounded-xl bg-[#0B0F19] border border-[#1F2E47] text-center text-slate-400 flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs">All fleet vehicles are in GOOD operational health.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {attentionVehicles.slice(0, 4).map((v) => (
                <div
                  key={v.id}
                  className="p-2.5 rounded-xl bg-[#0B0F19] border border-[#1F2E47] hover:border-slate-600 flex items-center justify-between gap-2 transition-colors"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="p-1.5 rounded-lg bg-[#111C2D] border border-[#1F2E47] text-cyan-400">
                      <Truck className="w-3.5 h-3.5 shrink-0" />
                    </div>
                    <div className="truncate">
                      <div className="font-semibold text-slate-100 text-xs truncate font-sans">{v.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{v.license_plate}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant={v.health_status === "CRITICAL" ? "critical" : "warning"}
                      size="sm"
                    >
                      {v.health_status}
                    </Badge>
                    <Link to={`/vehicles?id=${v.id}`}>
                      <button className="p-1.5 rounded-lg border border-[#1F2E47] bg-[#111C2D] hover:bg-[#16253B] text-slate-300 hover:text-white transition-colors cursor-pointer">
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

