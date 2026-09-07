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

import { CHART_COLORS } from "../charts/chartTheme";

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
        const score = v.health_status === "CRITICAL" ? 40 : v.health_status === "WARNING" ? 70 : 95;
        return {
          id: v.id,
          name: v.name,
          plate: v.license_plate,
          score,
          status: v.health_status || "GOOD",
          color: score >= 85 ? "#10B981" : score >= 65 ? "#F59E0B" : "#EF4444",
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
    <div className={clsx("grid grid-cols-1 lg:grid-cols-12 gap-4 select-none", className)}>
      {/* Chart 9: Vehicle Health Ranking (4 cols) */}
      <Card
        className="lg:col-span-4 flex flex-col shadow-card"
        header={
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-xs text-slate-100 font-sans">
              Vehicle Health Ranking
            </span>
          </div>
        }
        headerAction={
          <Badge variant="brand" size="sm">
            HIGH → LOW
          </Badge>
        }
      >
        <div className="h-44 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={healthRankingData}
              layout="vertical"
              margin={{ top: 5, right: 10, left: 30, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis type="number" domain={[0, 100]} stroke={CHART_COLORS.axisBorder} tick={{ fill: CHART_COLORS.axisText, fontSize: 10, fontFamily: "monospace" }} tickLine={false} />
              <YAxis type="category" dataKey="plate" stroke={CHART_COLORS.axisBorder} tick={{ fill: CHART_COLORS.axisText, fontSize: 10, fontFamily: "monospace" }} tickLine={false} width={70} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as HealthRankItem;
                    return (
                      <div className="p-2.5 bg-[#111C2D]/95 text-white border border-[#1F2E47] shadow-xl rounded-xl text-xs font-mono">
                        <p className="font-bold text-white font-sans">{item.name}</p>
                        <p className="text-emerald-400 font-mono mt-0.5">Health Score: {item.score}% ({item.status})</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="score"
                radius={[0, 4, 4, 0]}
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

      {/* Chart 10: Fuel Level Comparison (4 cols) */}
      <Card
        className="lg:col-span-4 flex flex-col shadow-card"
        header={
          <div className="flex items-center gap-2">
            <Fuel className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-xs text-slate-100 font-sans">
              Fleet Fuel Reserves
            </span>
          </div>
        }
        headerAction={
          <span className="text-[10px] font-mono text-slate-400">
            Tank Levels (%)
          </span>
        }
      >
        <div className="h-44 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fuelData} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="name" stroke={CHART_COLORS.axisBorder} tick={{ fill: CHART_COLORS.axisText, fontSize: 10, fontFamily: "monospace" }} tickLine={false} />
              <YAxis domain={[0, 100]} stroke={CHART_COLORS.axisBorder} tick={{ fill: CHART_COLORS.axisText, fontSize: 10, fontFamily: "monospace" }} tickLine={false} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as FuelItem;
                    return (
                      <div className="p-2.5 bg-[#111C2D]/95 text-white border border-[#1F2E47] shadow-xl rounded-xl text-xs font-mono">
                        <p className="font-bold text-white font-sans">{item.fullName}</p>
                        <p className="text-cyan-400 font-mono mt-0.5">Fuel Level: {item.fuel}%</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="fuel"
                radius={[4, 4, 0, 0]}
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

      {/* Chart 12: Fleet Sensor Switcher (4 cols) */}
      <Card
        className="lg:col-span-4 flex flex-col shadow-card"
        header={
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-purple-400" />
            <span className="font-semibold text-xs text-slate-100 font-sans">
              Fleet Sensor Distribution
            </span>
          </div>
        }
        headerAction={
          <select
            value={selectedSensorMetric}
            onChange={(e) => setSelectedSensorMetric(e.target.value as TelemetryMetricKey)}
            className="px-2.5 py-1 bg-[#0B0F19] border border-[#1F2E47] rounded-lg text-[10px] font-mono text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="engine_temp_c">Coolant (°C)</option>
            <option value="oil_pressure_psi">Oil Press (PSI)</option>
            <option value="speed">Speed (km/h)</option>
            <option value="rpm">RPM</option>
            <option value="battery_voltage">Battery (V)</option>
          </select>
        }
      >
        <div className="h-44 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sensorData} margin={{ top: 8, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="name" stroke={CHART_COLORS.axisBorder} tick={{ fill: CHART_COLORS.axisText, fontSize: 10, fontFamily: "monospace" }} tickLine={false} />
              <YAxis stroke={CHART_COLORS.axisBorder} tick={{ fill: CHART_COLORS.axisText, fontSize: 10, fontFamily: "monospace" }} tickLine={false} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as SensorItem;
                    return (
                      <div className="p-2.5 bg-[#111C2D]/95 text-white border border-[#1F2E47] shadow-xl rounded-xl text-xs font-mono">
                        <p className="font-bold text-white font-sans">{item.fullName}</p>
                        <p className="text-purple-400 font-mono mt-0.5">
                          {activeMeta.label}: {item.value} {item.unit}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="value"
                radius={[4, 4, 0, 0]}
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
