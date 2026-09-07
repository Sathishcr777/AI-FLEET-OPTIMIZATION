import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { Card } from "../common/Card";
import { EmptyState } from "../common/EmptyState";
import { Vehicle } from "../../types/api";
import { TelemetryPayload } from "../../types/telemetry";
import { useTelemetryStore } from "../../hooks/useTelemetryStore";
import { TrendingUp, Truck, Activity } from "lucide-react";
import { clsx } from "clsx";

export interface TelemetryTrendsChartProps {
  vehicles: Vehicle[];
  selectedVehicleId: string;
  onSelectVehicle: (id: string) => void;
  telemetryHistory: TelemetryPayload[];
  isLoading?: boolean;
  className?: string;
}

type MetricKey =
  | "speed"
  | "rpm"
  | "engine_temp_c"
  | "oil_pressure_psi"
  | "fuel_level_pct"
  | "battery_voltage";

interface MetricConfig {
  key: MetricKey;
  label: string;
  unit: string;
  color: string;
  threshold?: number;
  thresholdLabel?: string;
}

const METRIC_CONFIGS: Record<MetricKey, MetricConfig> = {
  speed: {
    key: "speed",
    label: "Vehicle Speed",
    unit: "km/h",
    color: "#06B6D4", // Cyan
    threshold: 105,
    thresholdLabel: "Speed Limit (105 km/h)",
  },
  engine_temp_c: {
    key: "engine_temp_c",
    label: "Coolant Temperature",
    unit: "°C",
    color: "#EF4444", // Rose
    threshold: 105,
    thresholdLabel: "Overheat Warning (105°C)",
  },
  oil_pressure_psi: {
    key: "oil_pressure_psi",
    label: "Engine Oil Pressure",
    unit: "PSI",
    color: "#F59E0B", // Amber
    threshold: 20,
    thresholdLabel: "Low Pressure (20 PSI)",
  },
  battery_voltage: {
    key: "battery_voltage",
    label: "Battery Voltage",
    unit: "V",
    color: "#818CF8", // Indigo
    threshold: 11.8,
    thresholdLabel: "Low Battery (11.8V)",
  },
  fuel_level_pct: {
    key: "fuel_level_pct",
    label: "Fuel Level",
    unit: "%",
    color: "#10B981", // Emerald
  },
  rpm: {
    key: "rpm",
    label: "Engine RPM",
    unit: "RPM",
    color: "#3B82F6", // Blue
    threshold: 5500,
    thresholdLabel: "Redline (5500 RPM)",
  },
};

export const TelemetryTrendsChart: React.FC<TelemetryTrendsChartProps> = ({
  vehicles,
  selectedVehicleId,
  onSelectVehicle,
  telemetryHistory,
  isLoading = false,
  className,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("engine_temp_c");
  const config = METRIC_CONFIGS[selectedMetric];

  // Subscribe to live telemetry buffer in Zustand for the selected vehicle
  const liveVehicle = useTelemetryStore((s) => (selectedVehicleId ? s.vehicles[selectedVehicleId] : undefined));
  const liveHistory = liveVehicle?.history || [];
  const latestTelemetry = liveVehicle?.latest;

  // Unify and deduplicate REST historical data with real-time WebSocket buffer
  const mergedHistory = useMemo(() => {
    const map = new Map<string, TelemetryPayload>();

    // 1. Add historical records from REST
    for (const item of telemetryHistory) {
      if (item && item.time) {
        map.set(item.time, item);
      }
    }

    // 2. Add real-time streaming points from WebSocket buffer
    for (const item of liveHistory) {
      if (item && item.time) {
        map.set(item.time, item);
      }
    }

    // 3. If only latest point exists and neither list had records, include it
    if (map.size === 0 && latestTelemetry && latestTelemetry.time) {
      map.set(latestTelemetry.time, latestTelemetry);
    }

    const combined = Array.from(map.values());

    // Sort chronologically (oldest first, newest last)
    combined.sort((a, b) => {
      const tA = new Date(a.time).getTime();
      const tB = new Date(b.time).getTime();
      return tA - tB;
    });

    return combined;
  }, [telemetryHistory, liveHistory, latestTelemetry]);

  // Transform into Recharts format
  const chartData = useMemo(() => {
    return mergedHistory.map((item, idx) => {
      let timeLabel = `T-${idx}`;
      try {
        if (item.time) {
          const d = new Date(item.time);
          timeLabel = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        }
      } catch {
        // fallback
      }

      const val = item[selectedMetric];
      return {
        time: timeLabel,
        value: typeof val === "number" ? val : Number(val) || 0,
        raw: item,
      };
    });
  }, [mergedHistory, selectedMetric]);

  // Statistical aggregates
  const stats = useMemo(() => {
    if (chartData.length === 0) return { current: 0, min: 0, max: 0, avg: 0 };
    const values = chartData.map((d) => Number(d.value) || 0);
    const current = values[values.length - 1] || 0;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const sum = values.reduce((acc, v) => acc + v, 0);
    const avg = sum / values.length;
    return { current, min, max, avg };
  }, [chartData]);

  return (
    <Card
      className={clsx("flex flex-col h-full select-none shadow-card bg-[#111C2D] border border-[#1F2E47]", className)}
      header={
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-white font-sans text-sm sm:text-base">Synchronized Telematics Time-Series</span>
        </div>
      }
      headerAction={
        <div className="flex items-center gap-2 font-sans text-xs">
          {/* Vehicle Selector */}
          <div className="flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-cyan-400" />
            <select
              value={selectedVehicleId}
              onChange={(e) => onSelectVehicle(e.target.value)}
              className="px-2.5 py-1.5 bg-[#0B0F19] border border-[#1F2E47] rounded-lg text-slate-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 cursor-pointer shadow-card"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id} className="bg-[#0B0F19] text-white">
                  {v.name} ({v.license_plate})
                </option>
              ))}
            </select>
          </div>

          {/* Metric Selector */}
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value as MetricKey)}
            className="px-2.5 py-1.5 bg-[#0B0F19] border border-[#1F2E47] rounded-lg text-slate-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 cursor-pointer shadow-card"
          >
            {Object.values(METRIC_CONFIGS).map((m) => (
              <option key={m.key} value={m.key} className="bg-[#0B0F19] text-white">
                {m.label} ({m.unit})
              </option>
            ))}
          </select>
        </div>
      }
    >
      <div className="space-y-4 font-sans text-xs flex-1 flex flex-col">
        {/* Statistical Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
          <div className="p-3 rounded-xl bg-[#0B0F19] border border-[#1F2E47]">
            <span className="text-slate-400 uppercase font-semibold text-[10px] block font-mono">CURRENT</span>
            <span className="font-bold text-cyan-400 font-mono text-base mt-0.5 block">
              {stats.current.toFixed(1)} {config.unit}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-[#0B0F19] border border-[#1F2E47]">
            <span className="text-slate-400 uppercase font-semibold text-[10px] block font-mono">MIN</span>
            <span className="font-bold text-blue-400 font-mono text-base mt-0.5 block">
              {stats.min.toFixed(1)} {config.unit}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-[#0B0F19] border border-[#1F2E47]">
            <span className="text-slate-400 uppercase font-semibold text-[10px] block font-mono">MAX</span>
            <span className="font-bold text-rose-400 font-mono text-base mt-0.5 block">
              {stats.max.toFixed(1)} {config.unit}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-[#0B0F19] border border-[#1F2E47]">
            <span className="text-slate-400 uppercase font-semibold text-[10px] block font-mono">AVERAGE</span>
            <span className="font-bold text-amber-400 font-mono text-base mt-0.5 block">
              {stats.avg.toFixed(1)} {config.unit}
            </span>
          </div>
        </div>

        {/* Line Chart Viewport */}
        <div className="flex-1 min-h-[260px] w-full bg-[#0B0F19] rounded-xl p-3 border border-[#1F2E47] flex flex-col justify-center">
          {isLoading && chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-cyan-400 text-xs animate-pulse font-mono py-12">
              <Activity className="w-5 h-5 mr-2 animate-spin" />
              Loading telematics stream...
            </div>
          ) : chartData.length === 0 ? (
            <EmptyState
              preset="collecting_history"
              title="COLLECTING HISTORY"
              description="Historical telemetry will appear here as sensor samples stream into the engine."
              compact
              className="border-0 bg-transparent py-8"
            />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData} margin={{ top: 12, right: 20, left: -12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2E47" opacity={0.8} />
                <XAxis
                  dataKey="time"
                  stroke="#64748B"
                  fontSize={10}
                  tickLine={false}
                  fontFamily="monospace"
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="#64748B"
                  fontSize={10}
                  tickLine={false}
                  fontFamily="monospace"
                  unit={config.unit}
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="p-2.5 bg-[#111C2D] text-white border border-[#1F2E47] shadow-2xl rounded-xl text-xs font-mono">
                          <p className="text-[10px] text-slate-400">{data.time}</p>
                          <p className="font-bold text-cyan-400 mt-0.5">
                            {config.label}: {Number(data.value).toFixed(1)} {config.unit}
                          </p>
                          {config.threshold !== undefined && (
                            <p className="text-[10px] text-amber-400 mt-0.5">
                              Threshold: {config.threshold} {config.unit}
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {config.threshold !== undefined && (
                  <ReferenceLine
                    y={config.threshold}
                    stroke="#EF4444"
                    strokeDasharray="4 4"
                    label={{
                      value: config.thresholdLabel,
                      fill: "#EF4444",
                      fontSize: 10,
                      fontFamily: "monospace",
                      position: "insideTopRight",
                    }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={config.color}
                  strokeWidth={2.5}
                  dot={chartData.length <= 2 ? { r: 3, fill: config.color } : false}
                  activeDot={{ r: 4, stroke: "#FFF", strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </Card>
  );
};
