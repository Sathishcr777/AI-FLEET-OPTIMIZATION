import React, { useState, useMemo } from "react";
import { Vehicle } from "../../types/api";
import { TelemetryPayload } from "../../types/telemetry";
import { Search, Truck } from "lucide-react";
import { StatusBadge } from "../common/StatusBadge";
import { clsx } from "clsx";

export interface VehicleSelectorProps {
  vehicles: Vehicle[];
  telemetryMap: Record<string, { latest: TelemetryPayload; history: TelemetryPayload[] }>;
  selectedVehicleId: string | null;
  onSelectVehicle: (id: string) => void;
  className?: string;
}

export const VehicleSelector: React.FC<VehicleSelectorProps> = ({
  vehicles,
  telemetryMap,
  selectedVehicleId,
  onSelectVehicle,
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "ACTIVE" | "ALERT">("ALL");

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchesSearch =
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.license_plate.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (filterType === "ACTIVE") return v.status === "ACTIVE";
      if (filterType === "ALERT") {
        const isAnomaly = Boolean(telemetryMap[v.id]?.latest?.is_anomaly);
        const isHealthRisk = v.health_status === "WARNING" || v.health_status === "CRITICAL";
        return isAnomaly || isHealthRisk;
      }
      return true;
    });
  }, [vehicles, telemetryMap, searchQuery, filterType]);

  return (
    <div
      className={clsx(
        "flex flex-col h-full bg-[#111C2D] border border-slate-800 rounded-2xl overflow-hidden select-none shadow-2xl",
        className
      )}
    >
      {/* Header & Search */}
      <div className="p-4 border-b border-slate-800 space-y-3 shrink-0 bg-[#111C2D]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
            Fleet Roster ({vehicles.length})
          </span>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search vehicle or plate..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#0B0F19] border border-slate-700/80 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 font-mono transition-all"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 text-xs pt-0.5">
          <button
            onClick={() => setFilterType("ALL")}
            className={clsx(
              "flex-1 py-1.5 rounded-lg text-center font-medium transition-colors cursor-pointer text-xs font-mono",
              filterType === "ALL"
                ? "bg-blue-600 text-white shadow-glow-sm font-bold"
                : "bg-[#0B0F19] text-slate-400 hover:text-white border border-slate-800"
            )}
          >
            All
          </button>
          <button
            onClick={() => setFilterType("ACTIVE")}
            className={clsx(
              "flex-1 py-1.5 rounded-lg text-center font-medium transition-colors cursor-pointer text-xs font-mono",
              filterType === "ACTIVE"
                ? "bg-blue-600 text-white shadow-glow-sm font-bold"
                : "bg-[#0B0F19] text-slate-400 hover:text-white border border-slate-800"
            )}
          >
            Active
          </button>
          <button
            onClick={() => setFilterType("ALERT")}
            className={clsx(
              "flex-1 py-1.5 rounded-lg text-center font-medium transition-colors cursor-pointer text-xs font-mono",
              filterType === "ALERT"
                ? "bg-rose-600 text-white shadow-glow-crimson font-bold"
                : "bg-[#0B0F19] text-slate-400 hover:text-white border border-slate-800"
            )}
          >
            Alerts
          </button>
        </div>
      </div>

      {/* Vehicle List Feed */}
      <div className="divide-y divide-slate-800/80 overflow-y-auto max-h-[500px]">
        {filteredVehicles.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs font-mono">
            No matching vehicles found.
          </div>
        ) : (
          filteredVehicles.map((v) => {
            const isSelected = v.id === selectedVehicleId;
            const t = telemetryMap[v.id]?.latest;
            const isAnomaly = Boolean(t?.is_anomaly);

            return (
              <div
                key={v.id}
                onClick={() => onSelectVehicle(v.id)}
                className={clsx(
                  "p-3.5 transition-all cursor-pointer flex items-center justify-between gap-3 text-xs",
                  isSelected
                    ? "bg-[#16253B] border-l-4 border-blue-500 shadow-glow-sm"
                    : "hover:bg-[#16253B]/50",
                  isAnomaly && !isSelected && "bg-rose-950/20"
                )}
              >
                <div className="flex items-center gap-3 truncate">
                  <div
                    className={clsx(
                      "p-2.5 rounded-xl shrink-0 transition-colors",
                      isSelected
                        ? "bg-blue-600 text-white shadow-glow-sm"
                        : "bg-[#0B0F19] text-slate-400 border border-slate-800"
                    )}
                  >
                    <Truck className="w-4 h-4" />
                  </div>

                  <div className="truncate">
                    <div className="font-semibold text-slate-100 text-sm truncate">
                      {v.name}
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">
                      {v.license_plate} · {v.model}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 space-y-1">
                  <StatusBadge status={v.status} size="sm" />
                  {t && (
                    <div className="text-xs text-cyan-400 font-mono font-bold">
                      {t.speed.toFixed(0)} km/h · {t.fuel_level_pct.toFixed(0)}%
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

