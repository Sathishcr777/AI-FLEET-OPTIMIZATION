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
        className={clsx("flex flex-col justify-center items-center text-center p-6 select-none shadow-card", className)}
        header="Optimization Manifest"
      >
        <div className="p-3 rounded-full bg-slate-100 border border-slate-200 text-slate-400 mb-2.5">
          <Cpu className="w-5 h-5" />
        </div>
        <h4 className="text-xs font-semibold text-slate-900 font-sans">Awaiting Mission Parameters</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-xs font-sans">
          Configure waypoints and execute 2-Opt TSP optimization to compute comparative savings and generate the manifest.
        </p>
      </Card>
    );
  }

  const { comparison, optimized_sequence, name, route_id } = result;
  const isDistanceSaved = comparison.distance_saved_km > 0;

  return (
    <Card
      className={clsx("flex flex-col select-none shadow-card", className)}
      header={
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-sm text-slate-900 font-sans">Optimization Manifest</span>
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
      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between font-sans text-xs">
        <div className="min-w-0 pr-2">
          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Mission Name</span>
          <div className="font-semibold text-slate-900 text-xs truncate mt-0.5">{name}</div>
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
        <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-0.5">
          <span className="text-[10px] text-emerald-800 uppercase flex items-center gap-1 font-semibold">
            <TrendingDown className="w-3 h-3 text-emerald-600" />
            <span>Distance Saved</span>
          </span>
          <div className="text-base font-bold text-emerald-700 font-mono tabular-nums">
            {comparison.distance_saved_km.toFixed(1)} <span className="text-xs font-normal text-emerald-600">km</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            {comparison.original_distance_km.toFixed(1)} → {comparison.optimized_distance_km.toFixed(1)} km
          </div>
        </div>

        {/* Time Saved */}
        <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-200 space-y-0.5">
          <span className="text-[10px] text-blue-800 uppercase flex items-center gap-1 font-semibold">
            <Clock className="w-3 h-3 text-blue-600" />
            <span>Time Saved</span>
          </span>
          <div className="text-base font-bold text-blue-700 font-mono tabular-nums">
            {comparison.time_saved_min.toFixed(0)} <span className="text-xs font-normal text-blue-600">min</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            {comparison.original_time_min.toFixed(0)} → {comparison.optimized_time_min.toFixed(0)} min
          </div>
        </div>

        {/* Fuel Saved */}
        <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200 space-y-0.5">
          <span className="text-[10px] text-amber-800 uppercase flex items-center gap-1 font-semibold">
            <Fuel className="w-3 h-3 text-amber-600" />
            <span>Fuel Saved</span>
          </span>
          <div className="text-base font-bold text-amber-700 font-mono tabular-nums">
            {comparison.fuel_saved_liters.toFixed(1)} <span className="text-xs font-normal text-amber-600">L</span>
          </div>
          <div className="text-[10px] text-slate-500">
            Est. reduction
          </div>
        </div>

        {/* Cost Saved */}
        <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-0.5">
          <span className="text-[10px] text-emerald-800 uppercase flex items-center gap-1 font-semibold">
            <DollarSign className="w-3 h-3 text-emerald-600" />
            <span>Cost Saved</span>
          </span>
          <div className="text-base font-bold text-emerald-700 font-mono tabular-nums">
            ${comparison.cost_saved_usd.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500">
            OpEx savings
          </div>
        </div>
      </div>

      {/* Algorithmic Narrative Summary */}
      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1 font-sans text-xs">
        <div className="flex items-center gap-1.5 text-blue-600 font-semibold text-[11px]">
          <Cpu className="w-3.5 h-3.5" />
          <span>{comparison.algorithm_used}</span>
        </div>
        <p className="text-slate-600 text-xs leading-relaxed">
          {comparison.explanation}
        </p>
      </div>

      {/* Assigned Dispatch Resources */}
      {(assignedVehicle || assignedDriver) && (
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between font-sans text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Truck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="text-slate-900 font-semibold truncate">{assignedVehicle?.name || "Asset"}</span>
            <span className="text-slate-500 text-[11px] font-mono shrink-0">({assignedVehicle?.license_plate || ""})</span>
          </div>
          {assignedDriver && (
            <div className="text-slate-700 text-xs shrink-0 font-medium">
              <strong className="text-emerald-700">{assignedDriver.name}</strong>
            </div>
          )}
        </div>
      )}

      {/* Step-by-Step Optimized Waypoint Manifest */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-sans text-slate-500">
          <span className="flex items-center gap-1 font-semibold uppercase text-[10px]">
            <ListOrdered className="w-3.5 h-3.5 text-blue-600" />
            <span>Optimized Sequence ({optimized_sequence.length})</span>
          </span>
          <span className="text-[10px] font-mono text-slate-400">Leg · Total</span>
        </div>

        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5 font-sans text-xs">
          {optimized_sequence.map((stop, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === optimized_sequence.length - 1;

            return (
              <div
                key={stop.stop_id || idx}
                className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className={clsx(
                      "flex items-center justify-center w-5 h-5 rounded-md font-bold font-mono text-[10px] shrink-0",
                      isFirst
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : isLast
                        ? "bg-purple-50 text-purple-700 border border-purple-200"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                    )}
                  >
                    {isFirst ? "D" : isLast ? "F" : `${idx}`}
                  </span>
                  <div className="truncate">
                    <div className="font-semibold text-slate-900 text-xs truncate">{stop.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {stop.distance_from_prev_km > 0
                        ? `+${stop.distance_from_prev_km.toFixed(1)} km (${stop.travel_time_from_prev_min.toFixed(0)} min)`
                        : "Departure point"}
                    </div>
                  </div>
                </div>

                <div className="text-right text-xs shrink-0 font-mono">
                  <span className="font-semibold text-slate-900">
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
