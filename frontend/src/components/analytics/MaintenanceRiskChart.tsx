import React from "react";
import { Link } from "react-router-dom";
import { Card } from "../common/Card";
import { Badge } from "../common/Badge";
import { Vehicle } from "../../types/api";
import { MaintenancePredictionResponse } from "../../api/analytics";
import { Wrench, ExternalLink, ShieldCheck, Truck, Clock } from "lucide-react";
import { clsx } from "clsx";

export interface MaintenanceRiskChartProps {
  vehicles: Vehicle[];
  predictions: Record<string, MaintenancePredictionResponse>;
  className?: string;
}

export const MaintenanceRiskChart: React.FC<MaintenanceRiskChartProps> = ({
  vehicles,
  predictions,
  className,
}) => {
  const total = vehicles.length;

  const riskCounts = React.useMemo(() => {
    let low = 0;
    let medium = 0;
    let high = 0;
    let critical = 0;

    for (const v of vehicles) {
      const pred = predictions[v.id];
      const level = pred ? pred.risk_level : "LOW";
      if (level === "CRITICAL") critical++;
      else if (level === "HIGH") high++;
      else if (level === "MEDIUM") medium++;
      else low++;
    }

    return { low, medium, high, critical };
  }, [vehicles, predictions]);

  const pctLow = total > 0 ? Math.round((riskCounts.low / total) * 100) : 0;
  const pctMedium = total > 0 ? Math.round((riskCounts.medium / total) * 100) : 0;
  const pctHigh = total > 0 ? Math.round((riskCounts.high / total) * 100) : 0;
  const pctCritical = total > 0 ? Math.round((riskCounts.critical / total) * 100) : 0;

  // Ranked RUL & High Risk Vehicles (Lowest RUL first)
  const rankedRulVehicles = React.useMemo(() => {
    return vehicles
      .map((v) => ({
        vehicle: v,
        prediction: predictions[v.id],
      }))
      .filter((item) => item.prediction)
      .sort((a, b) => (a.prediction?.estimated_rul_km || 999999) - (b.prediction?.estimated_rul_km || 999999));
  }, [vehicles, predictions]);

  return (
    <Card
      className={clsx("flex flex-col h-full select-none shadow-card", className)}
      header={
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-slate-100 font-sans">Predictive Maintenance Risk</span>
          <Badge variant="brand" size="sm">
            POINT-IN-TIME INTELLIGENCE
          </Badge>
        </div>
      }
      headerAction={
        <Badge variant={riskCounts.critical > 0 ? "critical" : riskCounts.high > 0 ? "warning" : "success"} size="sm">
          {riskCounts.high + riskCounts.critical} HIGH RISK ASSETS
        </Badge>
      }
    >
      <div className="space-y-4 font-sans text-xs overflow-y-auto pr-1 flex-1">
        {/* 1. Maintenance Risk Distribution Progress Bar */}
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-2 font-sans">
            <span>Fleet Maintenance Risk Distribution</span>
            <span className="font-mono text-slate-300">{total} Assets Analyzed</span>
          </div>

          <div className="h-3.5 w-full rounded-full bg-slate-800 overflow-hidden flex border border-[#1F2E47]">
            {pctLow > 0 && (
              <div
                style={{ width: `${pctLow}%` }}
                className="bg-emerald-500 transition-all duration-300 shadow-glow-emerald"
                title={`Low Risk: ${riskCounts.low} (${pctLow}%)`}
              />
            )}
            {pctMedium > 0 && (
              <div
                style={{ width: `${pctMedium}%` }}
                className="bg-blue-500 transition-all duration-300 shadow-glow-blue"
                title={`Medium Risk: ${riskCounts.medium} (${pctMedium}%)`}
              />
            )}
            {pctHigh > 0 && (
              <div
                style={{ width: `${pctHigh}%` }}
                className="bg-amber-400 transition-all duration-300 shadow-glow-amber"
                title={`High Risk: ${riskCounts.high} (${pctHigh}%)`}
              />
            )}
            {pctCritical > 0 && (
              <div
                style={{ width: `${pctCritical}%` }}
                className="bg-rose-500 transition-all duration-300 shadow-glow-crimson"
                title={`Critical Risk: ${riskCounts.critical} (${pctCritical}%)`}
              />
            )}
          </div>

          {/* 4-Column Legend */}
          <div className="grid grid-cols-4 gap-2 mt-3 text-center text-xs">
            <div className="p-2.5 rounded-xl bg-[#0B0F19] border border-[#1F2E47]">
              <span className="text-emerald-400 font-semibold block text-[11px]">LOW ({pctLow}%)</span>
              <span className="text-white font-bold font-mono text-sm mt-0.5 block">{riskCounts.low}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#0B0F19] border border-[#1F2E47]">
              <span className="text-blue-400 font-semibold block text-[11px]">MED ({pctMedium}%)</span>
              <span className="text-white font-bold font-mono text-sm mt-0.5 block">{riskCounts.medium}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#0B0F19] border border-[#1F2E47]">
              <span className="text-amber-400 font-semibold block text-[11px]">HIGH ({pctHigh}%)</span>
              <span className="text-white font-bold font-mono text-sm mt-0.5 block">{riskCounts.high}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#0B0F19] border border-[#1F2E47]">
              <span className="text-rose-400 font-semibold block text-[11px]">CRIT ({pctCritical}%)</span>
              <span className="text-white font-bold font-mono text-sm mt-0.5 block">{riskCounts.critical}</span>
            </div>
          </div>
        </div>

        {/* 2. RUL Urgency Ranking (Which assets are closest to requiring intervention?) */}
        <div className="pt-3 border-t border-[#1F2E47] space-y-2.5">
          <span className="text-[11px] text-slate-400 uppercase font-semibold block flex items-center justify-between font-sans">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>Asset RUL Urgency Ranking (Closest to Intervention)</span>
            </span>
            <span className="text-slate-400 font-normal">Est. Remaining Useful Life</span>
          </span>

          {rankedRulVehicles.length === 0 ? (
            <div className="p-4 rounded-xl bg-[#0B0F19] border border-[#1F2E47] text-center text-slate-400 flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs">All vehicles operate above minimum RUL maintenance thresholds.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {rankedRulVehicles.slice(0, 4).map(({ vehicle, prediction }) => {
                const rul = prediction?.estimated_rul_km || 10000;
                const isUrgent = rul < 2000 || prediction?.risk_level === "CRITICAL";

                return (
                  <div
                    key={vehicle.id}
                    className={clsx(
                      "p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-colors",
                      isUrgent
                        ? "bg-rose-500/10 border-rose-500/30 hover:border-rose-500/50"
                        : "bg-[#0B0F19] border-[#1F2E47] hover:border-slate-600"
                    )}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className={clsx("p-2 rounded-lg border", isUrgent ? "bg-[#111C2D] border-rose-500/30 text-rose-400" : "bg-[#111C2D] border-[#1F2E47] text-blue-400")}>
                        <Truck className="w-3.5 h-3.5 shrink-0" />
                      </div>
                      <div className="truncate">
                        <div className="font-semibold text-white text-xs truncate font-sans">{vehicle.name}</div>
                        <div className="text-[11px] text-slate-400 font-sans truncate mt-0.5">
                          Drivers: {prediction?.contributing_factors?.[0]?.factor || "General Mechanical Wear"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <div className={clsx("font-bold text-xs font-mono", isUrgent ? "text-rose-400" : "text-cyan-400")}>
                          {rul.toLocaleString()} km RUL
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Risk: {prediction?.risk_score.toFixed(0)}%
                        </div>
                      </div>

                      <Link to={`/vehicles?id=${vehicle.id}`}>
                        <button className="p-1.5 rounded-lg border border-[#1F2E47] bg-[#16253B] hover:bg-[#1D2D49] text-slate-300 hover:text-white transition-colors cursor-pointer">
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </Link>
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
