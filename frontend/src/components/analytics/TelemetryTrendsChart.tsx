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
import { Vehicle } from "../../types/api";
import { TelemetryPayload } from "../../types/telemetry";
import { TrendingUp, Truck } from "lucide-react";
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
    color: "#0284C7", // Sky
    threshold: 105,
    thresholdLabel: "Speed Limit (105 km/h)",
  },
  engine_temp_c: {
    key: "engine_temp_c",
    label: "Coolant Temperature",
    unit: "°C",
    color: "#E11D48", // Rose
    threshold: 105,
    thresholdLabel: "Overheat Warning (105°C)",
  },
  oil_pressure_psi: {
    key: "oil_pressure_psi",
    label: "Engine Oil Pressure",
    unit: "PSI",
    color: "#D97706", // Amber
    threshold: 20,
    thresholdLabel: "Low Pressure (20 PSI)",
  },
  battery_voltage: {
    key: "battery_voltage",
    label: "Battery Voltage",
    unit: "V",
    color: "#7C3AED", // Purple
    threshold: 11.8,
    thresholdLabel: "Low Battery (11.8V)",
  },
  fuel_level_pct: {
    key: "fuel_level_pct",
    label: "Fuel Level",
    unit: "%",
    color: "#059669", // Emerald
  },
  rpm: {
    key: "rpm",
    label: "Engine RPM",
    unit: "RPM",
    color: "#2563EB", // Blue
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

  // Reverse chronological to chronological for left-to-right chart
  const chartData = useMemo(() => {
    return [...telemetryHistory]
      .reverse()
      .map((item, idx) => {
        let timeLabel = `T-${idx}`;
        try {
          if (item.time) {
            const d = new Date(item.time);
            timeLabel = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
          }
        } catch {
          // fallback
        }

        return {
          time: timeLabel,
          value: item[selectedMetric],
          raw: item,
        };
      });
  }, [telemetryHistory, selectedMetric]);

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

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0];

  return (
    <Card
      className={clsx("flex flex-col h-full select-none shadow-card", className)}
      header={
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-slate-900 font-sans">Synchronized Telematics Time-Series</span>
        </div>
      }
      headerAction={
        <div className="flex items-center gap-2 font-sans text-xs">
          {/* Vehicle Selector */}
          <div className="flex items-center gap-1">
            <Truck className="w-3.5 h-3.5 text-blue-600" />
            <select
              value={selectedVehicleId}
              onChange={(e) => onSelectVehicle(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.license_plate})
                </option>
              ))}
            </select>
          </div>

          {/* Metric Selector */}
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value as MetricKey)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          >
            {Object.values(METRIC_CONFIGS).map((m) => (
              <option key={m.key} value={m.key}>
                {m.label} ({m.unit})
              </option>
            ))}
          </select>
        </div>
      }
    >
      <div className="space-y-4 font-sans text-xs flex-1 flex flex-col">
        {/* Statistical Summary Strip */}
        <div className="grid grid-cols-4 gap-2.5 text-center text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 uppercase font-semibold text-[10px] block">Current</span>
            <span className="font-bold text-slate-900 font-mono text-sm">
              {stats.current.toFixed(1)} {config.unit}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 uppercase font-semibold text-[10px] block">Min</span>
            <span className="font-bold text-blue-600 font-mono text-sm">
              {stats.min.toFixed(1)} {config.unit}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 uppercase font-semibold text-[10px] block">Max</span>
            <span className="font-bold text-rose-600 font-mono text-sm">
              {stats.max.toFixed(1)} {config.unit}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 uppercase font-semibold text-[10px] block">Average</span>
            <span className="font-bold text-amber-600 font-mono text-sm">
              {stats.avg.toFixed(1)} {config.unit}
            </span>
          </div>
        </div>

        {/* Line Chart */}
        <div className="flex-1 min-h-[240px] w-full bg-slate-50 rounded-xl p-3 border border-slate-200">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-blue-600 text-xs animate-pulse font-sans">
              Loading telemetry history...
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs font-sans">
              No historical telemetry records found for {selectedVehicle?.name || "selected asset"}.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" opacity={0.8} />
                <XAxis
                  dataKey="time"
                  stroke="#64748B"
                  fontSize={10}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="#64748B"
                  fontSize={10}
                  tickLine={false}
                  unit={config.unit}
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    borderColor: "#E2E8F0",
                    borderRadius: "10px",
                    color: "#0F172A",
                    fontSize: "12px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
                  }}
                  formatter={(val: any) => [`${Number(val).toFixed(1)} ${config.unit}`, config.label]}
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
                      position: "top",
                    }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={config.color}
                  strokeWidth={2.5}
                  dot={false}
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
