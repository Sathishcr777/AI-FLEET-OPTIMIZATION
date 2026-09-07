import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { TelemetryPayload } from "../../types/telemetry";
import { Activity, Gauge, Flame, Fuel, Zap, AlertTriangle } from "lucide-react";
import { clsx } from "clsx";

export type TelemetryMetricKey =
  | "speed"
  | "engine_temp_c"
  | "oil_pressure_psi"
  | "fuel_level_pct"
  | "rpm"
  | "battery_voltage";

interface MetricMeta {
  key: TelemetryMetricKey;
  label: string;
  shortLabel: string;
  unit: string;
  color: string;
  gradientId: string;
  icon: React.ComponentType<{ className?: string }>;
  domain: [number, number];
  threshold?: number;
  thresholdLabel?: string;
  thresholdOperator?: ">" | "<";
  purpose: string;
}

const METRIC_METAS: Record<TelemetryMetricKey, MetricMeta> = {
  speed: {
    key: "speed",
    label: "Vehicle Speed",
    shortLabel: "Speed",
    unit: "km/h",
    color: "#06B6D4", // Cyan
    gradientId: "miniSpeedGrad",
    icon: Gauge,
    domain: [0, 140],
    threshold: 105,
    thresholdLabel: "Speed Limit (105 km/h)",
    thresholdOperator: ">",
    purpose: "Detect overspeeding & aggressive dispatch transit",
  },
  engine_temp_c: {
    key: "engine_temp_c",
    label: "Coolant Temp",
    shortLabel: "Coolant",
    unit: "°C",
    color: "#EF4444", // Crimson
    gradientId: "miniTempGrad",
    icon: Flame,
    domain: [50, 130],
    threshold: 105,
    thresholdLabel: "Overheat Risk (105°C)",
    thresholdOperator: ">",
    purpose: "Monitor thermal cooling performance & seizure risk",
  },
  oil_pressure_psi: {
    key: "oil_pressure_psi",
    label: "Oil Pressure",
    shortLabel: "Oil Press",
    unit: "PSI",
    color: "#F59E0B", // Amber
    gradientId: "miniOilGrad",
    icon: Activity,
    domain: [0, 80],
    threshold: 20,
    thresholdLabel: "Critical Low (20 PSI)",
    thresholdOperator: "<",
    purpose: "Detect lubrication failure & powertrain wear",
  },
  fuel_level_pct: {
    key: "fuel_level_pct",
    label: "Fuel Level",
    shortLabel: "Fuel",
    unit: "%",
    color: "#10B981", // Emerald
    gradientId: "miniFuelGrad",
    icon: Fuel,
    domain: [0, 100],
    threshold: 15,
    thresholdLabel: "Low Fuel Warning (15%)",
    thresholdOperator: "<",
    purpose: "Track fuel consumption and range sustainability",
  },
  rpm: {
    key: "rpm",
    label: "Engine RPM",
    shortLabel: "RPM",
    unit: "RPM",
    color: "#818CF8", // Predictive Indigo
    gradientId: "miniRpmGrad",
    icon: Zap,
    domain: [0, 6000],
    threshold: 5000,
    thresholdLabel: "Redline Limit (5000 RPM)",
    thresholdOperator: ">",
    purpose: "Evaluate engine strain and shift efficiency",
  },
  battery_voltage: {
    key: "battery_voltage",
    label: "Battery Voltage",
    shortLabel: "Battery",
    unit: "V",
    color: "#38BDF8", // Sky
    gradientId: "miniBatteryGrad",
    icon: Zap,
    domain: [10, 16],
    threshold: 11.5,
    thresholdLabel: "Low Voltage (11.5V)",
    thresholdOperator: "<",
    purpose: "Monitor electrical alternator and battery health",
  },
};

export interface TelemetryTrendMiniChartProps {
  history: TelemetryPayload[];
  selectedMetric?: TelemetryMetricKey;
  onMetricChange?: (metric: TelemetryMetricKey) => void;
  availableMetrics?: TelemetryMetricKey[];
  height?: number;
  showMetricSelector?: boolean;
  showStats?: boolean;
  className?: string;
}

const DEFAULT_AVAILABLE_METRICS: TelemetryMetricKey[] = [
  "speed",
  "engine_temp_c",
  "oil_pressure_psi",
  "fuel_level_pct",
  "rpm",
];

export const TelemetryTrendMiniChart: React.FC<TelemetryTrendMiniChartProps> = ({
  history,
  selectedMetric: controlledMetric,
  onMetricChange,
  availableMetrics = DEFAULT_AVAILABLE_METRICS,
  height = 160,
  showMetricSelector = true,
  showStats = true,
  className,
}) => {
  const [internalMetric, setInternalMetric] = useState<TelemetryMetricKey>("engine_temp_c");
  const activeMetricKey = controlledMetric || internalMetric;
  const meta = METRIC_METAS[activeMetricKey] || METRIC_METAS.speed;

  const handleMetricSelect = (m: TelemetryMetricKey) => {
    if (onMetricChange) onMetricChange(m);
    else setInternalMetric(m);
  };

  // Format real chronological telemetry points
  const chartData = useMemo(() => {
    if (!history || history.length === 0) return [];
    return history.map((p, idx) => {
      let timeLabel = `-${history.length - idx}s`;
      if (p.time) {
        try {
          const d = new Date(p.time);
          timeLabel = d.toLocaleTimeString("en-US", {
            hour12: false,
            minute: "2-digit",
            second: "2-digit",
          });
        } catch {
          // fallback
        }
      }
      return {
        time: timeLabel,
        value: Number(p[activeMetricKey] ?? 0),
        raw: p,
      };
    });
  }, [history, activeMetricKey]);

  // Statistical calculations on actual data
  const stats = useMemo(() => {
    if (chartData.length === 0) return { current: 0, min: 0, max: 0, avg: 0, isThresholdBreached: false };
    const values = chartData.map((d) => d.value).filter((v) => !isNaN(v));
    if (values.length === 0) return { current: 0, min: 0, max: 0, avg: 0, isThresholdBreached: false };

    const current = values[values.length - 1] ?? 0;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const sum = values.reduce((acc, v) => acc + v, 0);
    const avg = sum / values.length;

    let isThresholdBreached = false;
    if (meta.threshold !== undefined) {
      if (meta.thresholdOperator === ">" && current > meta.threshold) isThresholdBreached = true;
      if (meta.thresholdOperator === "<" && current < meta.threshold) isThresholdBreached = true;
    }

    return { current, min, max, avg, isThresholdBreached };
  }, [chartData, meta]);

  return (
    <div className={clsx("flex flex-col space-y-3 font-sans select-none", className)}>
      {/* Metric Selector & Purpose Tooltip */}
      {showMetricSelector && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 bg-[#0B0F19] p-1 rounded-xl border border-slate-800">
            {availableMetrics.map((key) => {
              const itemMeta = METRIC_METAS[key];
              const Icon = itemMeta.icon;
              const isSelected = activeMetricKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleMetricSelect(key)}
                  className={clsx(
                    "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer font-mono",
                    isSelected
                      ? "bg-blue-600 text-white shadow-glow-sm font-bold"
                      : "text-slate-400 hover:text-white"
                  )}
                  title={itemMeta.purpose}
                >
                  <Icon className={clsx("w-3.5 h-3.5", isSelected ? "text-white" : "text-slate-400")} />
                  <span>{itemMeta.shortLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Threshold alert indicator if active */}
          {stats.isThresholdBreached && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-950/50 border border-rose-500/50 text-rose-400 text-[10px] font-mono font-bold animate-pulse shadow-glow-crimson">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>THRESHOLD BREACH</span>
            </div>
          )}
        </div>
      )}

      {/* Numerical Telemetry Stats Strip */}
      {showStats && (
        <div className="grid grid-cols-4 gap-2.5 text-center text-xs">
          <div className="p-2.5 rounded-xl bg-[#0B0F19] border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Current</span>
            <span
              className={clsx(
                "text-sm font-bold font-mono",
                stats.isThresholdBreached ? "text-rose-400" : "text-cyan-400"
              )}
            >
              {stats.current.toFixed(1)} {meta.unit}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#0B0F19] border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Window Min</span>
            <span className="text-sm font-bold font-mono text-slate-200">
              {stats.min.toFixed(1)} {meta.unit}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#0B0F19] border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Window Max</span>
            <span className="text-sm font-bold font-mono text-slate-200">
              {stats.max.toFixed(1)} {meta.unit}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#0B0F19] border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Window Avg</span>
            <span className="text-sm font-bold font-mono text-slate-200">
              {stats.avg.toFixed(1)} {meta.unit}
            </span>
          </div>
        </div>
      )}

      {/* Chart Canvas */}
      <div className="w-full relative" style={{ height }}>
        {chartData.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 rounded-xl bg-[#0B0F19] border border-dashed border-slate-800 text-slate-400 text-xs text-center">
            <Activity className="w-5 h-5 mb-1 text-cyan-400 animate-pulse" />
            <span>Awaiting live telemetry packets...</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 10, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id={meta.gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={meta.color} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={meta.color} stopOpacity={0.0} />
                </linearGradient>
              </defs>
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
                domain={meta.domain}
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
                      <div className="p-2.5 bg-[#0B0F19] text-white border border-slate-700 shadow-2xl rounded-xl text-xs font-mono">
                        <p className="text-[10px] text-slate-400">{item.time}</p>
                        <p className="text-sm font-bold text-cyan-400 mt-0.5">
                          {Number(item.value).toFixed(1)} {meta.unit}
                        </p>
                        {meta.threshold !== undefined && (
                          <p className="text-[10px] text-amber-400 mt-0.5">
                            Threshold: {meta.threshold} {meta.unit}
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {meta.threshold !== undefined && (
                <ReferenceLine
                  y={meta.threshold}
                  stroke="#EF4444"
                  strokeDasharray="4 4"
                  label={{
                    value: meta.thresholdLabel,
                    position: "insideTopRight",
                    fill: "#EF4444",
                    fontSize: 10,
                    fontFamily: "JetBrains Mono, monospace",
                    fontWeight: 600,
                  }}
                />
              )}
              <Area
                type="monotone"
                dataKey="value"
                stroke={meta.color}
                strokeWidth={2.5}
                fill={`url(#${meta.gradientId})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Operational Purpose Narrative */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 font-sans px-1">
        <span>Purpose: {meta.purpose}</span>
        <span className="font-mono text-cyan-400 font-semibold">LIVE TELEMETRY STREAM ({chartData.length} pts)</span>
      </div>
    </div>
  );
};

