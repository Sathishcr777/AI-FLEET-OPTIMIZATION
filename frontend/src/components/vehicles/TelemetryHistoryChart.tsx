import React, { useState, useMemo } from "react";
import { Card } from "../common/Card";
import { Badge } from "../common/Badge";
import { TelemetryPayload } from "../../types/telemetry";
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
import { Activity, BarChart2, AlertTriangle, ArrowRight, ShieldCheck } from "lucide-react";
import { clsx } from "clsx";

import { CHART_COLORS } from "../charts/chartTheme";

export interface TelemetryHistoryChartProps {
  history: TelemetryPayload[];
  isLoading?: boolean;
  className?: string;
}

type MetricKey =
  | "speed"
  | "rpm"
  | "engine_temp_c"
  | "oil_pressure_psi"
  | "battery_voltage"
  | "fuel_level_pct";

interface MetricConfig {
  key: MetricKey;
  label: string;
  unit: string;
  color: string;
  gradientId: string;
  domain: [number, number];
  threshold?: number;
  thresholdLabel?: string;
  thresholdColor?: string;
  thresholdOperator?: ">" | "<";
  causalExplanation: string;
}

const METRIC_CONFIGS: Record<MetricKey, MetricConfig> = {
  speed: {
    key: "speed",
    label: "Speed",
    unit: "km/h",
    color: "#3B82F6",
    gradientId: "speedGradient",
    domain: [0, 140],
    threshold: 105,
    thresholdLabel: "Speed Limit (105 km/h)",
    thresholdColor: "#EF4444",
    thresholdOperator: ">",
    causalExplanation: "Excessive speed (>105 km/h) triggers Driver Overspeeding events, reducing safety score & elevating collision hazard.",
  },
  rpm: {
    key: "rpm",
    label: "RPM",
    unit: "RPM",
    color: "#818CF8",
    gradientId: "rpmGradient",
    domain: [0, 6000],
    threshold: 5500,
    thresholdLabel: "Redline Limit (5500 RPM)",
    thresholdColor: "#EF4444",
    thresholdOperator: ">",
    causalExplanation: "Spike above redline (>5500 RPM) causes powertrain stress, rapid fuel loss, and engine wear.",
  },
  engine_temp_c: {
    key: "engine_temp_c",
    label: "Coolant Temp",
    unit: "°C",
    color: "#F59E0B",
    gradientId: "tempGradient",
    domain: [40, 130],
    threshold: 105,
    thresholdLabel: "Overheat Risk (105°C)",
    thresholdColor: "#EF4444",
    thresholdOperator: ">",
    causalExplanation: "Coolant temp exceeding 105°C triggers Thermal Anomaly detection, degrading health and elevating Critical Maintenance Risk.",
  },
  oil_pressure_psi: {
    key: "oil_pressure_psi",
    label: "Oil Pressure",
    unit: "PSI",
    color: "#06B6D4",
    gradientId: "oilGradient",
    domain: [0, 80],
    threshold: 20,
    thresholdLabel: "Critical Low (20 PSI)",
    thresholdColor: "#EF4444",
    thresholdOperator: "<",
    causalExplanation: "Oil pressure dropping below 20 PSI starves engine bearings, immediately generating a Critical Low Oil Pressure emergency alert.",
  },
  battery_voltage: {
    key: "battery_voltage",
    label: "Battery",
    unit: "V",
    color: "#10B981",
    gradientId: "batteryGradient",
    domain: [10, 16],
    threshold: 11.5,
    thresholdLabel: "Low Voltage (11.5V)",
    thresholdColor: "#EF4444",
    thresholdOperator: "<",
    causalExplanation: "Voltage dropping below 11.5V indicates alternator failure or weak battery cell, risking roadside breakdown.",
  },
  fuel_level_pct: {
    key: "fuel_level_pct",
    label: "Fuel Level",
    unit: "%",
    color: "#EC4899",
    gradientId: "fuelGradient",
    domain: [0, 100],
    threshold: 15,
    thresholdLabel: "Low Fuel Warning (15%)",
    thresholdColor: "#F59E0B",
    thresholdOperator: "<",
    causalExplanation: "Fuel dropping below 15% requires immediate routing to nearby fueling hub to prevent mission abort.",
  },
};

export const TelemetryHistoryChart: React.FC<TelemetryHistoryChartProps> = ({
  history,
  isLoading = false,
  className,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("engine_temp_c");

  const config = METRIC_CONFIGS[selectedMetric];

  // Format data for chart
  const chartData = useMemo(() => {
    return history.map((p, idx) => {
      let timeLabel = `${idx}`;
      if (p.time) {
        try {
          const d = new Date(p.time);
          timeLabel = d.toLocaleTimeString("en-US", { hour12: false, minute: "2-digit", second: "2-digit" });
        } catch {
          timeLabel = `${idx}`;
        }
      }
      return {
        time: timeLabel,
        value: Number(p[selectedMetric] ?? 0),
        raw: p,
      };
    });
  }, [history, selectedMetric]);

  // Statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) return { min: 0, max: 0, avg: 0, latest: 0, isBreached: false };
    const values = chartData.map((d) => d.value).filter((v) => !isNaN(v));
    if (values.length === 0) return { min: 0, max: 0, avg: 0, latest: 0, isBreached: false };
    const min = Math.min(...values);
    const max = Math.max(...values);
    const sum = values.reduce((acc, v) => acc + v, 0);
    const avg = sum / values.length;
    const latest = values[values.length - 1] ?? 0;

    let isBreached = false;
    if (config.threshold !== undefined) {
      if (config.thresholdOperator === ">" && (latest > config.threshold || max > config.threshold)) isBreached = true;
      if (config.thresholdOperator === "<" && (latest < config.threshold || min < config.threshold)) isBreached = true;
    }

    return { min, max, avg, latest, isBreached };
  }, [chartData, config]);

  // Compute responsive dynamic Y domain
  const yDomain = useMemo<[number, number]>(() => {
    const minBound = Math.min(config.domain[0], stats.min);
    const maxBound = Math.max(config.domain[1], Math.ceil(stats.max * 1.05));
    return [minBound, maxBound];
  }, [config.domain, stats]);

  return (
    <Card
      className={clsx("flex flex-col select-none shadow-card", className)}
      header={
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-slate-100 font-sans">Powertrain Time-Series Telemetry</span>
          <Badge variant="brand" size="sm">
            HISTORICAL & LIVE STREAM
          </Badge>
        </div>
      }
      headerAction={
        <div className="flex flex-wrap items-center gap-1.5">
          {(Object.keys(METRIC_CONFIGS) as MetricKey[]).map((key) => {
            const m = METRIC_CONFIGS[key];
            const isActive = selectedMetric === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedMetric(key)}
                className={clsx(
                  "px-2.5 py-1 text-xs font-mono font-medium rounded-lg transition-colors cursor-pointer",
                  isActive
                    ? "bg-blue-600 text-white shadow-glow-blue font-semibold border border-blue-500"
                    : "bg-[#0B0F19] text-slate-400 hover:text-white hover:bg-[#16253B] border border-[#1F2E47]"
                )}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      }
    >
      <div className="space-y-4 font-sans text-xs">
        {/* Metric Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-xl bg-[#0B0F19] border border-[#1F2E47] text-xs font-mono">
          <div>
            <span className="text-slate-400 uppercase text-[10px] font-sans">Current Value</span>
            <div className={clsx("font-bold text-sm mt-0.5", stats.isBreached ? "text-rose-400" : "text-cyan-400")}>
              {stats.latest.toFixed(1)} {config.unit}
            </div>
          </div>
          <div>
            <span className="text-slate-400 uppercase text-[10px] font-sans">Window Average</span>
            <div className="font-bold text-slate-200 text-sm mt-0.5">
              {stats.avg.toFixed(1)} {config.unit}
            </div>
          </div>
          <div>
            <span className="text-slate-400 uppercase text-[10px] font-sans">Window Min</span>
            <div className="font-bold text-slate-300 text-sm mt-0.5">
              {stats.min.toFixed(1)} {config.unit}
            </div>
          </div>
          <div>
            <span className="text-slate-400 uppercase text-[10px] font-sans">Window Max</span>
            <div className="font-bold text-amber-400 text-sm mt-0.5">
              {stats.max.toFixed(1)} {config.unit}
            </div>
          </div>
        </div>

        {/* Causal Diagnostic Progression Explainer */}
        <div className="p-3.5 rounded-xl bg-[#0B0F19] border border-[#1F2E47] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400 flex items-center gap-1.5">
              {stats.isBreached ? (
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>Causal Telemetry Progression & ML Anomaly Impact</span>
            </span>

            {stats.isBreached && (
              <span className="text-[10px] font-bold font-mono text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded-md border border-rose-500/30">
                ACTIVE BREACH DETECTED
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-300">
            <span className="px-2 py-0.5 rounded bg-[#111C2D] border border-[#1F2E47] font-semibold text-slate-200">1. Telemetry Stream</span>
            <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
            <span className={clsx("px-2 py-0.5 rounded border font-semibold", stats.isBreached ? "bg-rose-500/20 text-rose-300 border-rose-500/30" : "bg-[#111C2D] border-[#1F2E47] text-slate-200")}>
              2. Threshold ({config.threshold} {config.unit})
            </span>
            <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
            <span className={clsx("px-2 py-0.5 rounded border font-semibold", stats.isBreached ? "bg-amber-500/20 text-amber-300 border-amber-500/30" : "bg-[#111C2D] border-[#1F2E47] text-slate-200")}>
              3. Statistical Anomaly
            </span>
            <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
            <span className={clsx("px-2 py-0.5 rounded border font-semibold", stats.isBreached ? "bg-purple-500/20 text-purple-300 border-purple-500/30" : "bg-[#111C2D] border-[#1F2E47] text-slate-200")}>
              4. Maintenance Risk & Alert
            </span>
          </div>

          <p className="text-[11px] text-slate-400 pt-0.5">
            {config.causalExplanation}
          </p>
        </div>

        {/* Recharts Area Chart */}
        <div className="h-64 w-full">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400 font-mono">
              Loading historical telematics records...
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400 font-mono">
              <Activity className="w-6 h-6 mb-2 text-slate-500" />
              <span>Awaiting telemetry stream frames for this vehicle...</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id={config.gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={config.color} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={config.color} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis
                  dataKey="time"
                  stroke={CHART_COLORS.axisBorder}
                  tick={{ fill: CHART_COLORS.axisText, fontSize: 10, fontFamily: "monospace" }}
                  tickLine={false}
                />
                <YAxis
                  domain={yDomain}
                  stroke={CHART_COLORS.axisBorder}
                  tick={{ fill: CHART_COLORS.axisText, fontSize: 10, fontFamily: "monospace" }}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="p-2.5 bg-[#111C2D]/95 text-white border border-[#1F2E47] shadow-xl rounded-xl text-xs font-mono">
                          <p className="text-[10px] text-slate-400">{data.time}</p>
                          <p className="font-bold text-white mt-0.5">
                            {config.label}: {Number(data.value).toFixed(2)} {config.unit}
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

                {config.threshold && (
                  <ReferenceLine
                    y={config.threshold}
                    stroke={config.thresholdColor || "#EF4444"}
                    strokeDasharray="4 4"
                    label={{
                      value: config.thresholdLabel,
                      fill: config.thresholdColor || "#EF4444",
                      fontSize: 10,
                      position: "insideTopRight",
                      fontWeight: 600,
                    }}
                  />
                )}

                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={config.color}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill={`url(#${config.gradientId})`}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </Card>
  );
};
