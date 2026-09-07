import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card } from "../common/Card";
import { Badge } from "../common/Badge";
import { Vehicle } from "../../types/api";
import { TelemetryPayload, TelemetryMetricKey, METRIC_METAS } from "../../types/telemetry";
import { Fuel, ShieldCheck, Sliders } from "lucide-react";
import { clsx } from "clsx";

export interface VehicleFleetVisualOverviewProps {
  vehicles: Vehicle[];
  telemetryMap: Record<string, { latest: TelemetryPayload; lastUpdated: number }>;
  onSelectVehicle?: (vehicleId: string) => void;
  className?: string;
}

interface HealthRankItem {
  id: string;
  name: string;
  plate: string;
  score: number;
  status: string;
  color: string;
  glowColor: string;
}

interface FuelItem {
  id: string;
  name: string;
  fullName: string;
  fuel: number;
  color: string;
}

interface SensorItem {
  id: string;
  name: string;
  fullName: string;
  value: number;
  unit: string;
  color: string;
}

export const VehicleFleetVisualOverview: React.FC<VehicleFleetVisualOverviewProps> = ({
  vehicles,
  telemetryMap,
  onSelectVehicle,
  className,
}) => {
  const [selectedSensorMetric, setSelectedSensorMetric] = useState<TelemetryMetricKey>("engine_temp_c");

  // 1. Vehicle Health Ranking Data (Sorted Highest to Lowest)
  const healthRankingData: HealthRankItem[] = useMemo(() => {
    return [...vehicles]
      .map((v) => {
        const score = v.health_status === "CRITICAL" ? 42 : v.health_status === "WARNING" ? 68 : 96.5;
        return {
          id: v.id,
          name: v.name,
          plate: v.license_plate,
          score,
          status: v.health_status || "GOOD",
          color: score >= 85 ? "#10B981" : score >= 60 ? "#F59E0B" : "#EF4444",
          glowColor: score >= 85 ? "rgba(16, 185, 129, 0.4)" : score >= 60 ? "rgba(245, 158, 11, 0.4)" : "rgba(239, 68, 68, 0.5)",
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [vehicles]);

  // 2. Fuel Level Comparison Data
  const fuelData: FuelItem[] = useMemo(() => {
    return vehicles.map((v) => {
      const fuel = telemetryMap[v.id]?.latest?.fuel_level_pct ?? 75;
      return {
        id: v.id,
        name: v.license_plate,
        fullName: v.name,
        fuel: Number(fuel.toFixed(1)),
        color: fuel < 20 ? "#EF4444" : fuel < 35 ? "#F59E0B" : "#06B6D4",
      };
    });
  }, [vehicles, telemetryMap]);

  // 3. Fleet Sensor Overview Data
  const sensorData: SensorItem[] = useMemo(() => {
    const meta = METRIC_METAS[selectedSensorMetric] || METRIC_METAS.speed;
    return vehicles.map((v) => {
      const val = (telemetryMap[v.id]?.latest?.[selectedSensorMetric] as number | undefined) ?? meta.min;
      return {
        id: v.id,
        name: v.license_plate,
        fullName: v.name,
        value: Number(val.toFixed(1)),
        unit: meta.unit,
        color: meta.color,
      };
    });
  }, [vehicles, telemetryMap, selectedSensorMetric]);

  const activeMeta = METRIC_METAS[selectedSensorMetric] || METRIC_METAS.speed;

  return (
    <div className={clsx("grid grid-cols-1 lg:grid-cols-12 gap-5 select-none", className)}>
      {/* Module 1: Powertrain Health Matrix & Leaderboard (4 cols) */}
      <Card
        className="lg:col-span-4 flex flex-col shadow-2xl bg-[#111C2D] border border-slate-800 hover:border-slate-700 transition-all rounded-2xl overflow-hidden"
        header={
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm sm:text-base text-white font-sans block">
                Powertrain Health Leaderboard
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Asset Condition Index (0 - 100)
              </span>
            </div>
          </div>
        }
        headerAction={
          <Badge variant="brand" size="sm" className="font-mono text-[10px]">
            AI RANKED
          </Badge>
        }
      >
        <div className="h-52 w-full relative pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={healthRankingData}
              layout="vertical"
              margin={{ top: 0, right: 20, left: 15, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="2 2" stroke="#1E293B" vertical={false} />
              <XAxis
                type="number"
                domain={[0, 100]}
                stroke="#64748B"
                tick={{ fill: "#94A3B8", fontSize: 10, fontFamily: "monospace" }}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="plate"
                stroke="#64748B"
                tick={{ fill: "#F8FAFC", fontSize: 11, fontFamily: "monospace", fontWeight: 600 }}
                tickLine={false}
                width={80}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as HealthRankItem;
                    return (
                      <div className="p-3 bg-[#0B0F19]/95 text-white border border-slate-700 shadow-2xl rounded-xl text-xs font-mono backdrop-blur-md">
                        <p className="font-bold text-white font-sans text-sm">{item.name}</p>
                        <p className="text-slate-400 text-[11px] mt-0.5">Plate: {item.plate}</p>
                        <div className="mt-2 flex items-center gap-2 pt-2 border-t border-slate-800">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-bold font-mono" style={{ color: item.color }}>
                            Score: {item.score}% ({item.status})
                          </span>
                        </div>
                        <p className="text-[10px] text-cyan-400 mt-1 font-sans">
                          Click bar to inspect asset diagnostics →
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="score"
                radius={[0, 6, 6, 0]}
                onClick={(entry) => {
                  const item = entry as unknown as HealthRankItem;
                  if (item?.id && onSelectVehicle) onSelectVehicle(item.id);
                }}
                cursor="pointer"
              >
                {healthRankingData.map((entry: HealthRankItem, idx: number) => (
                  <Cell key={`bar-${idx}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Module 2: Fleet Fuel Reserves & Energy Horizon (4 cols) */}
      <Card
        className="lg:col-span-4 flex flex-col shadow-2xl bg-[#111C2D] border border-slate-800 hover:border-slate-700 transition-all rounded-2xl overflow-hidden"
        header={
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-400">
              <Fuel className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm sm:text-base text-white font-sans block">
                Fuel Reserves & Range
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Tank Level & Depletion Horizon
              </span>
            </div>
          </div>
        }
        headerAction={
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#0B0F19] border border-slate-800 text-cyan-400">
            CAPACITY %
          </span>
        }
      >
        <div className="h-52 w-full relative pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fuelData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="#1E293B" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="#64748B"
                tick={{ fill: "#F8FAFC", fontSize: 10, fontFamily: "monospace", fontWeight: 600 }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                stroke="#64748B"
                tick={{ fill: "#94A3B8", fontSize: 10, fontFamily: "monospace" }}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as FuelItem;
                    return (
                      <div className="p-3 bg-[#0B0F19]/95 text-white border border-slate-700 shadow-2xl rounded-xl text-xs font-mono backdrop-blur-md">
                        <p className="font-bold text-white font-sans text-sm">{item.fullName}</p>
                        <p className="text-cyan-400 font-mono mt-1 font-bold">
                          Fuel Level: {item.fuel}%
                        </p>
                        <p className="text-slate-400 text-[10px] mt-0.5">
                          Est. Range: ~{Math.round(item.fuel * 7.5)} km
                        </p>
                        <p className="text-[10px] text-cyan-400 mt-1 font-sans">
                          Click bar to inspect asset diagnostics →
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="fuel"
                radius={[6, 6, 0, 0]}
                onClick={(entry) => {
                  const item = entry as unknown as FuelItem;
                  if (item?.id && onSelectVehicle) onSelectVehicle(item.id);
                }}
                cursor="pointer"
              >
                {fuelData.map((entry: FuelItem, idx: number) => (
                  <Cell key={`fuel-${idx}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Module 3: Fleet Multi-Sensor Distribution (4 cols) */}
      <Card
        className="lg:col-span-4 flex flex-col shadow-2xl bg-[#111C2D] border border-slate-800 hover:border-slate-700 transition-all rounded-2xl overflow-hidden"
        header={
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-purple-950/60 border border-purple-500/40 text-purple-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm sm:text-base text-white font-sans block">
                Sensor Variance Matrix
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Live Subsystem Dispersion
              </span>
            </div>
          </div>
        }
        headerAction={
          <select
            value={selectedSensorMetric}
            onChange={(e) => setSelectedSensorMetric(e.target.value as TelemetryMetricKey)}
            className="px-2.5 py-1 bg-[#0B0F19] border border-slate-700 rounded-lg text-[11px] font-mono font-bold text-purple-300 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer shadow-sm"
          >
            <option value="engine_temp_c">Coolant (°C)</option>
            <option value="oil_pressure_psi">Oil Press (PSI)</option>
            <option value="speed">Speed (km/h)</option>
            <option value="rpm">Engine RPM</option>
            <option value="battery_voltage">Battery (V)</option>
          </select>
        }
      >
        <div className="h-52 w-full relative pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sensorData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="#1E293B" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="#64748B"
                tick={{ fill: "#F8FAFC", fontSize: 10, fontFamily: "monospace", fontWeight: 600 }}
                tickLine={false}
              />
              <YAxis
                stroke="#64748B"
                tick={{ fill: "#94A3B8", fontSize: 10, fontFamily: "monospace" }}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as SensorItem;
                    return (
                      <div className="p-3 bg-[#0B0F19]/95 text-white border border-slate-700 shadow-2xl rounded-xl text-xs font-mono backdrop-blur-md">
                        <p className="font-bold text-white font-sans text-sm">{item.fullName}</p>
                        <p className="text-purple-400 font-mono mt-1 font-bold">
                          {activeMeta.label}: {item.value} {item.unit}
                        </p>
                        <p className="text-[10px] text-cyan-400 mt-1 font-sans">
                          Click bar to inspect asset diagnostics →
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="value"
                radius={[6, 6, 0, 0]}
                onClick={(entry) => {
                  const item = entry as unknown as SensorItem;
                  if (item?.id && onSelectVehicle) onSelectVehicle(item.id);
                }}
                cursor="pointer"
              >
                {sensorData.map((entry: SensorItem, idx: number) => (
                  <Cell key={`sensor-${idx}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};
