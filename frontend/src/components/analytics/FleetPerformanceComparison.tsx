import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { Card } from "../common/Card";
import { Badge } from "../common/Badge";
import { Vehicle } from "../../types/api";
import { TelemetryPayload } from "../../types/telemetry";
import { BarChart2 } from "lucide-react";
import { clsx } from "clsx";

export interface FleetPerformanceComparisonProps {
  vehicles: Vehicle[];
  telemetryMap: Record<string, { latest: TelemetryPayload; lastUpdated: number }>;
  onSelectVehicle?: (vehicleId: string) => void;
  selectedVehicleId?: string | null;
  className?: string;
  height?: number;
}

type ComparisonMetric = "health" | "fuel_level_pct" | "speed" | "engine_temp_c" | "oil_pressure_psi" | "rpm";

export const FleetPerformanceComparison: React.FC<FleetPerformanceComparisonProps> = ({
  vehicles,
  telemetryMap,
  onSelectVehicle,
  selectedVehicleId,
  className,
  height = 180,
}) => {
  const [metric, setMetric] = useState<ComparisonMetric>("health");

  const chartData = useMemo(() => {
    return vehicles.map((v) => {
      const t = telemetryMap[v.id]?.latest;
      let val = 0;
      let unit = "";
      let color = "#2563EB";

      if (metric === "health") {
        val = v.health_status === "CRITICAL" ? 40 : v.health_status === "WARNING" ? 70 : 95;
        unit = "%";
        color = val >= 85 ? "#059669" : val >= 65 ? "#D97706" : "#DC2626";
      } else if (metric === "fuel_level_pct") {
        val = t?.fuel_level_pct ?? 75;
        unit = "%";
        color = val < 20 ? "#DC2626" : val < 30 ? "#D97706" : "#0284C7";
      } else if (metric === "speed") {
        val = t?.speed ?? 0;
        unit = "km/h";
        color = val > 105 ? "#DC2626" : val > 90 ? "#D97706" : "#2563EB";
      } else if (metric === "engine_temp_c") {
        val = t?.engine_temp_c ?? 90;
        unit = "°C";
        color = val > 105 ? "#DC2626" : val > 95 ? "#D97706" : "#059669";
      } else if (metric === "oil_pressure_psi") {
        val = t?.oil_pressure_psi ?? 45;
        unit = "PSI";
        color = val < 20 ? "#DC2626" : val < 28 ? "#D97706" : "#D97706";
      } else if (metric === "rpm") {
        val = t?.rpm ?? 1200;
        unit = "RPM";
        color = val > 3200 ? "#DC2626" : val > 2600 ? "#D97706" : "#7C3AED";
      }

      return {
        id: v.id,
        name: v.name,
        shortName: v.license_plate,
        value: Number(val.toFixed(1)),
        unit,
        color,
        isSelected: v.id === selectedVehicleId,
      };
    });
  }, [vehicles, telemetryMap, metric, selectedVehicleId]);

  return (
    <Card
      className={clsx("flex flex-col select-none shadow-card bg-[#111C2D] border border-[#1F2E47]", className)}
      header={
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-sm text-white font-sans">
            Fleet Asset Metric Comparison
          </span>
          <Badge variant="brand" size="sm">
            LIVE ROSTER
          </Badge>
        </div>
      }
      headerAction={
        <div className="flex items-center gap-1 bg-[#0B0F19] p-0.5 rounded-lg border border-[#1F2E47] text-xs">
          <button
            type="button"
            onClick={() => setMetric("health")}
            className={clsx(
              "px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer font-mono",
              metric === "health" ? "bg-blue-600 text-white shadow-glow-sm font-bold border border-blue-500" : "text-slate-400 hover:text-white"
            )}
          >
            Health
          </button>
          <button
            type="button"
            onClick={() => setMetric("fuel_level_pct")}
            className={clsx(
              "px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer font-mono",
              metric === "fuel_level_pct" ? "bg-blue-600 text-white shadow-glow-sm font-bold border border-blue-500" : "text-slate-400 hover:text-white"
            )}
          >
            Fuel
          </button>
          <button
            type="button"
            onClick={() => setMetric("speed")}
            className={clsx(
              "px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer font-mono",
              metric === "speed" ? "bg-blue-600 text-white shadow-glow-sm font-bold border border-blue-500" : "text-slate-400 hover:text-white"
            )}
          >
            Speed
          </button>
          <button
            type="button"
            onClick={() => setMetric("engine_temp_c")}
            className={clsx(
              "px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer font-mono",
              metric === "engine_temp_c" ? "bg-blue-600 text-white shadow-glow-sm font-bold border border-blue-500" : "text-slate-400 hover:text-white"
            )}
          >
            Temp
          </button>
          <button
            type="button"
            onClick={() => setMetric("oil_pressure_psi")}
            className={clsx(
              "px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer font-mono",
              metric === "oil_pressure_psi" ? "bg-blue-600 text-white shadow-glow-sm font-bold border border-blue-500" : "text-slate-400 hover:text-white"
            )}
          >
            Oil
          </button>
        </div>
      }
    >
      <div className="space-y-2 font-sans text-xs">
        {chartData.length === 0 ? (
          <div className="w-full h-40 flex flex-col items-center justify-center p-4 rounded-lg bg-[#0B0F19] border border-[#1F2E47] text-slate-400 text-center">
            <span>No active vehicles streaming telematics.</span>
          </div>
        ) : (
          <div className="w-full relative" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2E47" opacity={0.8} />
                <XAxis
                  dataKey="shortName"
                  stroke="#64748B"
                  fontSize={10}
                  tickLine={false}
                  fontFamily="monospace"
                />
                <YAxis
                  stroke="#64748B"
                  fontSize={10}
                  tickLine={false}
                  fontFamily="monospace"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="p-2.5 bg-[#111C2D] text-white border border-[#1F2E47] shadow-2xl rounded-xl text-xs font-mono">
                          <p className="font-bold text-white font-sans">{item.name}</p>
                          <p className="text-[10px] text-cyan-400 font-mono">{item.shortName}</p>
                          <p className="text-sm font-bold text-emerald-400 mt-1">
                            {item.value} {item.unit}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Click to inspect asset</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="value"
                  radius={[4, 4, 0, 0]}
                  onClick={(entry) => onSelectVehicle && onSelectVehicle(entry.id)}
                  cursor="pointer"
                >
                  {chartData.map((entry, idx) => (
                    <Cell
                      key={`bar-${idx}`}
                      fill={entry.color}
                      stroke={entry.isSelected ? "#38BDF8" : "none"}
                      strokeWidth={entry.isSelected ? 2 : 0}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="flex items-center justify-between text-[10px] text-slate-400 font-sans px-1">
          <span>Click any bar to inspect telemetry and trajectory on the map.</span>
          <span className="font-mono text-cyan-400">{vehicles.length} Units Active</span>
        </div>
      </div>
    </Card>
  );
};
