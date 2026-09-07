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
import { ChartCard, ChartSummaryMetric } from "../charts/ChartCard";
import { ChartTooltip } from "../charts/ChartTooltip";
import { commonCartesianGrid, commonXAxis, commonYAxis } from "../charts/chartTheme";
import { FilterPill } from "../common/FilterPill";
import { LiveStatusBadge } from "../common/LiveStatusBadge";
import { TelemetryPayload } from "../../types/telemetry";
import { Vehicle } from "../../types/api";
import { Activity } from "lucide-react";

export type LiveTelemetryMetricKey =
  | "speed"
  | "engine_temp_c"
  | "oil_pressure_psi"
  | "rpm"
  | "battery_voltage"
  | "fuel_level_pct";

interface MetricConfig {
  key: LiveTelemetryMetricKey;
  label: string;
  shortLabel: string;
  unit: string;
  color: string;
  gradientId: string;
  threshold?: number;
  thresholdLabel?: string;
  thresholdOperator?: ">" | "<";
}

const METRIC_CONFIGS: Record<LiveTelemetryMetricKey, MetricConfig> = {
  speed: {
    key: "speed",
    label: "Vehicle Speed",
    shortLabel: "Speed",
    unit: "km/h",
    color: "#2563EB",
    gradientId: "liveSpeedGrad",
    threshold: 105,
    thresholdLabel: "105 km/h",
    thresholdOperator: ">",
  },
  engine_temp_c: {
    key: "engine_temp_c",
    label: "Coolant Temperature",
    shortLabel: "Coolant Temp",
    unit: "°C",
    color: "#EF4444",
    gradientId: "liveTempGrad",
    threshold: 105,
    thresholdLabel: "105°C Risk",
    thresholdOperator: ">",
  },
  oil_pressure_psi: {
    key: "oil_pressure_psi",
    label: "Oil Pressure",
    shortLabel: "Oil Pressure",
    unit: "PSI",
    color: "#F59E0B",
    gradientId: "liveOilGrad",
    threshold: 20,
    thresholdLabel: "20 PSI Floor",
    thresholdOperator: "<",
  },
  rpm: {
    key: "rpm",
    label: "Engine RPM",
    shortLabel: "RPM",
    unit: "RPM",
    color: "#6366F1",
    gradientId: "liveRpmGrad",
    threshold: 3200,
    thresholdLabel: "3200 RPM",
    thresholdOperator: ">",
  },
  battery_voltage: {
    key: "battery_voltage",
    label: "Battery Voltage",
    shortLabel: "Battery",
    unit: "V",
    color: "#0EA5E9",
    gradientId: "liveVoltGrad",
    threshold: 12.0,
    thresholdLabel: "12.0V Cutoff",
    thresholdOperator: "<",
  },
  fuel_level_pct: {
    key: "fuel_level_pct",
    label: "Fuel Level",
    shortLabel: "Fuel",
    unit: "%",
    color: "#10B981",
    gradientId: "liveFuelGrad",
    threshold: 15,
    thresholdLabel: "15% Reserve",
    thresholdOperator: "<",
  },
};

export interface LiveTelemetrySectionProps {
  vehicle: Vehicle | null;
  history: TelemetryPayload[];
  lastUpdated?: number;
  isStreaming?: boolean;
  className?: string;
}

export const LiveTelemetrySection: React.FC<LiveTelemetrySectionProps> = ({
  vehicle,
  history,
  lastUpdated,
  isStreaming = true,
  className,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<LiveTelemetryMetricKey>("speed");
  const metric = METRIC_CONFIGS[selectedMetric];

  // Process history points for the active metric
  const chartData = useMemo(() => {
    return history.map((point, idx) => {
      const val = Number(point[selectedMetric] ?? 0);
      let timeLabel = `#${idx + 1}`;
      if (point.time) {
        const d = new Date(point.time);
        if (!isNaN(d.getTime())) {
          timeLabel = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        }
      }
      return {
        time: timeLabel,
        value: Number(val.toFixed(1)),
      };
    });
  }, [history, selectedMetric]);

  // Compute Current, Average, Minimum, Maximum stats
  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return { current: 0, avg: 0, min: 0, max: 0 };
    }
    const values = chartData.map((d) => d.value);
    const current = values[values.length - 1] ?? 0;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    return { current, avg, min, max };
  }, [chartData]);

  // Summary Metrics Strip
  const summaryMetrics: ChartSummaryMetric[] = useMemo(() => {
    return [
      {
        label: "Current",
        value: stats.current.toFixed(1),
        unit: metric.unit,
        statusColor:
          metric.thresholdOperator === ">" && stats.current > (metric.threshold ?? 999)
            ? "rose"
            : metric.thresholdOperator === "<" && stats.current < (metric.threshold ?? -999)
            ? "rose"
            : "blue",
      },
      {
        label: "Average",
        value: stats.avg.toFixed(1),
        unit: metric.unit,
        statusColor: "slate",
      },
      {
        label: "Minimum",
        value: stats.min.toFixed(1),
        unit: metric.unit,
        statusColor: "slate",
      },
      {
        label: "Maximum",
        value: stats.max.toFixed(1),
        unit: metric.unit,
        statusColor: "slate",
      },
    ];
  }, [stats, metric]);

  const timeFormatted = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : undefined;

  return (
    <ChartCard
      title={`Live Telemetry · ${vehicle ? vehicle.name : "Active Asset"}`}
      subtitle={`${metric.label} streaming via WebSocket buffer (${chartData.length} observations)`}
      icon={<Activity className="w-4 h-4 text-blue-600" />}
      liveStatus={
        <LiveStatusBadge
          isLive={isStreaming}
          lastUpdated={lastUpdated}
          updatedTime={timeFormatted}
          size="sm"
        />
      }
      controls={
        <div className="flex items-center flex-wrap gap-1">
          {(Object.keys(METRIC_CONFIGS) as LiveTelemetryMetricKey[]).map((key) => (
            <FilterPill
              key={key}
              size="sm"
              active={selectedMetric === key}
              onClick={() => setSelectedMetric(key)}
            >
              {METRIC_CONFIGS[key].shortLabel}
            </FilterPill>
          ))}
        </div>
      }
      summaryMetrics={summaryMetrics}
      isEmpty={chartData.length < 2}
      emptyPreset="waiting_telemetry"
      emptyMessage="Waiting for vehicle telemetry stream observations to accumulate."
      height={320}
      className={className}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 12, right: 16, left: -10, bottom: 4 }}>
          <defs>
            <linearGradient id={metric.gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={metric.color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={metric.color} stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid {...commonCartesianGrid} />
          <XAxis dataKey="time" {...commonXAxis} minTickGap={35} />
          <YAxis {...commonYAxis} domain={["auto", "auto"]} />

          <Tooltip
            content={
              <ChartTooltip
                valueFormatter={(val) => (
                  <span>
                    {Number(val).toFixed(1)} {metric.unit}
                  </span>
                )}
              />
            }
          />

          {metric.threshold !== undefined && (
            <ReferenceLine
              y={metric.threshold}
              stroke="#EF4444"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: metric.thresholdLabel || `${metric.threshold} ${metric.unit}`,
                fill: "#DC2626",
                fontSize: 11,
                fontFamily: "JetBrains Mono, monospace",
                position: "right",
              }}
            />
          )}

          <Area
            type="monotone"
            dataKey="value"
            name={metric.label}
            stroke={metric.color}
            strokeWidth={2}
            fill={`url(#${metric.gradientId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};
