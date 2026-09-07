import React from "react";
import { Card } from "../common/Card";
import { Badge } from "../common/Badge";
import { RouteOptimizeResponse } from "../../types/routes";
import { Vehicle, Driver } from "../../types/api";
import {
  TrendingDown,
  Clock,
  Fuel,
  DollarSign,
  Cpu,
  ListOrdered,
  Truck,
  Sparkles,
} from "lucide-react";
import { clsx } from "clsx";

export interface OptimizationResultPanelProps {
  result: RouteOptimizeResponse | null;
  assignedVehicle?: Vehicle | null;
  assignedDriver?: Driver | null;
  className?: string;
}

export const OptimizationResultPanel: React.FC<OptimizationResultPanelProps> = ({
  result,
  assignedVehicle,
  assignedDriver,
  className,
}) => {
  if (!result) {
    return (
      <Card
        className={clsx("flex flex-col justify-center items-center text-center p-6 select-none shadow-card bg-[#111C2D] border border-[#1F2E47]", className)}
        header={
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-sm text-white font-sans">Optimization Manifest</span>
          </div>
        }
      >
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center rounded-xl bg-[#0B0F19] border border-[#1F2E47] my-auto w-full">
          <div className="p-3 rounded-2xl bg-[#16253B] border border-[#1F2E47] text-cyan-400 mb-2.5 shadow-inner">
            <Cpu className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Awaiting Mission Parameters</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-xs font-sans leading-relaxed">
            Configure waypoints and execute 2-Opt TSP optimization to compute comparative savings and generate the manifest.
          </p>
        </div>
      </Card>
    );
  }

  const { comparison, optimized_sequence, name, route_id } = result;
  const isDistanceSaved = comparison.distance_saved_km > 0;

  return (
    <Card
      className={clsx("flex flex-col select-none shadow-card bg-[#111C2D] border border-[#1F2E47]", className)}
      header={
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-sm text-white font-sans">Optimization Manifest</span>
        </div>
      }
      headerAction={
        <Badge variant={isDistanceSaved ? "success" : "neutral"} size="sm" dot>
          {isDistanceSaved ? `${comparison.distance_saved_pct.toFixed(1)}% SAVINGS` : "OPTIMAL"}
        </Badge>
      }
      bodyClassName="p-4 space-y-4 flex-1 overflow-y-auto"
    >
      {/* Mission Route Identifier */}
      <div className="p-3 rounded-xl bg-[#0B0F19] border border-[#1F2E47] flex items-center justify-between font-sans text-xs">
        <div className="min-w-0 pr-2">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block font-mono">Mission Name</span>
          <div className="font-semibold text-white text-xs truncate mt-0.5 font-sans">{name}</div>
        </div>
        {route_id && (
          <Badge variant="brand" size="sm">
            ID: {route_id.slice(0, 8)}
          </Badge>
        )}
      </div>

      {/* Big Savings Metric Strip */}
      <div className="grid grid-cols-2 gap-2.5 font-sans">
        {/* Distance Saved */}
        <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 space-y-0.5">
          <span className="text-[10px] text-emerald-400 uppercase flex items-center gap-1 font-semibold font-mono">
            <TrendingDown className="w-3 h-3 text-emerald-400" />
            <span>Distance Saved</span>
          </span>
          <div className="text-base font-bold text-emerald-300 font-mono tabular-nums">
            {comparison.distance_saved_km.toFixed(1)} <span className="text-xs font-normal text-emerald-400">km</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {comparison.original_distance_km.toFixed(1)} → {comparison.optimized_distance_km.toFixed(1)} km
          </div>
        </div>

        {/* Time Saved */}
        <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/40 space-y-0.5">
          <span className="text-[10px] text-blue-400 uppercase flex items-center gap-1 font-semibold font-mono">
            <Clock className="w-3 h-3 text-blue-400" />
            <span>Time Saved</span>
          </span>
          <div className="text-base font-bold text-blue-300 font-mono tabular-nums">
            {comparison.time_saved_min.toFixed(0)} <span className="text-xs font-normal text-blue-400">min</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {comparison.original_time_min.toFixed(0)} → {comparison.optimized_time_min.toFixed(0)} min
          </div>
        </div>

        {/* Fuel Saved */}
        <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-0.5">
          <span className="text-[10px] text-amber-400 uppercase flex items-center gap-1 font-semibold font-mono">
            <Fuel className="w-3 h-3 text-amber-400" />
            <span>Fuel Saved</span>
          </span>
          <div className="text-base font-bold text-amber-300 font-mono tabular-nums">
            {comparison.fuel_saved_liters.toFixed(1)} <span className="text-xs font-normal text-amber-400">L</span>
          </div>
          <div className="text-[10px] text-slate-400 font-sans">
            Est. reduction
          </div>
        </div>

        {/* Cost Saved */}
        <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 space-y-0.5">
          <span className="text-[10px] text-emerald-400 uppercase flex items-center gap-1 font-semibold font-mono">
            <DollarSign className="w-3 h-3 text-emerald-400" />
            <span>Cost Saved</span>
          </span>
          <div className="text-base font-bold text-emerald-300 font-mono tabular-nums">
            ${comparison.cost_saved_usd.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-400 font-sans">
            OpEx savings
          </div>
        </div>
      </div>

      {/* Algorithmic Narrative Summary */}
      <div className="p-3 rounded-xl bg-[#0B0F19] border border-[#1F2E47] space-y-1 font-sans text-xs">
        <div className="flex items-center gap-1.5 text-cyan-400 font-semibold text-[11px] font-mono">
          <Cpu className="w-3.5 h-3.5" />
          <span>{comparison.algorithm_used}</span>
        </div>
        <p className="text-slate-300 text-xs leading-relaxed font-sans">
          {comparison.explanation}
        </p>
      </div>

      {/* Assigned Dispatch Resources */}
      {(assignedVehicle || assignedDriver) && (
        <div className="p-3 rounded-xl bg-[#0B0F19] border border-[#1F2E47] flex items-center justify-between font-sans text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Truck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-white font-semibold truncate font-sans">{assignedVehicle?.name || "Asset"}</span>
            <span className="text-slate-400 text-[11px] font-mono shrink-0">({assignedVehicle?.license_plate || ""})</span>
          </div>
          {assignedDriver && (
            <div className="text-slate-300 text-xs shrink-0 font-medium font-sans">
              <strong className="text-emerald-400">{assignedDriver.name}</strong>
            </div>
          )}
        </div>
      )}

      {/* Step-by-Step Optimized Waypoint Manifest */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-sans text-slate-400">
          <span className="flex items-center gap-1 font-semibold uppercase text-[10px] font-mono tracking-wider">
            <ListOrdered className="w-3.5 h-3.5 text-cyan-400" />
            <span>Optimized Sequence ({optimized_sequence.length})</span>
          </span>
          <span className="text-[10px] font-mono text-slate-500">Leg · Total</span>
        </div>

        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5 font-sans text-xs">
          {optimized_sequence.map((stop, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === optimized_sequence.length - 1;

            return (
              <div
                key={stop.stop_id || idx}
                className="p-2.5 rounded-lg bg-[#0B0F19] border border-[#1F2E47] flex items-center justify-between gap-2 hover:border-[#2A3F5F] hover:bg-[#16253B] transition-colors"
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className={clsx(
                      "flex items-center justify-center w-5 h-5 rounded-md font-bold font-mono text-[10px] shrink-0",
                      isFirst
                        ? "bg-emerald-950/60 text-emerald-400 border border-emerald-500/40"
                        : isLast
                        ? "bg-cyan-950/60 text-cyan-400 border border-cyan-500/40"
                        : "bg-blue-950/60 text-blue-400 border border-blue-500/40"
                    )}
                  >
                    {isFirst ? "D" : isLast ? "F" : `${idx}`}
                  </span>
                  <div className="truncate">
                    <div className="font-semibold text-white text-xs truncate font-sans">{stop.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {stop.distance_from_prev_km > 0
                        ? `+${stop.distance_from_prev_km.toFixed(1)} km (${stop.travel_time_from_prev_min.toFixed(0)} min)`
                        : "Departure point"}
                    </div>
                  </div>
                </div>

                <div className="text-right text-xs shrink-0 font-mono">
                  <span className="font-semibold text-white">
                    {stop.cumulative_distance_km.toFixed(1)} km
                  </span>
                  <div className="text-[10px] text-slate-400">
                    {stop.cumulative_time_min.toFixed(0)} min
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
