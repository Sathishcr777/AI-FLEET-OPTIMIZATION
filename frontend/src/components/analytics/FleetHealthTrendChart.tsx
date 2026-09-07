import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { ChartCard, ChartSummaryMetric } from "../charts/ChartCard";
import { ChartTooltip } from "../charts/ChartTooltip";
import { commonCartesianGrid, commonXAxis, commonYAxis } from "../charts/chartTheme";
import { FilterPill } from "../common/FilterPill";
import { LiveStatusBadge } from "../common/LiveStatusBadge";
import { useTelemetryStore, selectFleetSnapshots } from "../../hooks/useTelemetryStore";
import { TrendingUp } from "lucide-react";

export interface FleetHealthTrendChartProps {
  className?: string;
  height?: number;
}

type TimeWindow = "5M" | "15M" | "30M" | "1H";

export const FleetHealthTrendChart: React.FC<FleetHealthTrendChartProps> = ({
  className,
  height = 320,
}) => {
  const snapshots = useTelemetryStore(selectFleetSnapshots);
  const connectionStatus = useTelemetryStore((s) => s.connectionStatus);
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("15M");

  // Filter snapshots based on selected time window
  const windowSnapshots = useMemo(() => {
    if (snapshots.length === 0) return [];
    const limit = timeWindow === "5M" ? 10 : timeWindow === "15M" ? 25 : timeWindow === "30M" ? 45 : 60;
    return snapshots.slice(-limit);
  }, [snapshots, timeWindow]);

  // Compute actual aggregate metrics
  const stats = useMemo(() => {
    if (windowSnapshots.length === 0) {
      return { current: 95, min: 95, max: 95, avg: 95 };
    }
    const healthValues = windowSnapshots.map((s) => s.avgHealth);
    const current = healthValues[healthValues.length - 1] ?? 95;
    const min = Math.min(...healthValues);
    const max = Math.max(...healthValues);
    const sum = healthValues.reduce((acc, v) => acc + v, 0);
    const avg = sum / windowSnapshots.length;
    return { current, min, max, avg };
  }, [windowSnapshots]);

  const summaryMetrics: ChartSummaryMetric[] = useMemo(() => {
    return [
      {
        label: "Current",
        value: `${stats.current.toFixed(1)}%`,
        statusColor: stats.current >= 85 ? "emerald" : stats.current >= 70 ? "amber" : "rose",
      },
      {
        label: "Average",
        value: `${stats.avg.toFixed(1)}%`,
        statusColor: stats.avg >= 85 ? "emerald" : stats.avg >= 70 ? "amber" : "rose",
      },
      {
        label: "Minimum",
        value: `${stats.min.toFixed(1)}%`,
        statusColor: stats.min >= 85 ? "emerald" : stats.min >= 70 ? "amber" : "rose",
      },
      {
        label: "Maximum",
        value: `${stats.max.toFixed(1)}%`,
        statusColor: "slate",
      },
    ];
  }, [stats]);

  const chartData = useMemo(() => {
    return windowSnapshots.map((s) => ({
      time: s.time,
      health: Number(s.avgHealth.toFixed(1)),
      nominal: s.nominalCount,
      degraded: s.degradedCount,
      critical: s.criticalCount,
    }));
  }, [windowSnapshots]);

  const isLive = connectionStatus === "CONNECTED";

  return (
    <ChartCard
      title="Fleet Health Trend"
      subtitle="Overall fleet condition during the current operating session"
      icon={<TrendingUp className="w-4.5 h-4.5 text-blue-400" />}
      liveStatus={<LiveStatusBadge isLive={isLive} size="sm" />}
      controls={
        <div className="flex items-center gap-1.5">
          {(["5M", "15M", "30M", "1H"] as TimeWindow[]).map((w) => (
            <FilterPill
              key={w}
              size="sm"
              active={timeWindow === w}
              onClick={() => setTimeWindow(w)}
            >
              {w}
            </FilterPill>
          ))}
        </div>
      }
      summaryMetrics={summaryMetrics}
      isEmpty={chartData.length < 1}
      emptyPreset="collecting_history"
      emptyMessage="Collecting fleet history... Observations accumulate as telemetry streams."
      height={height}
      className={className}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 12, right: 16, left: -10, bottom: 4 }}>
          <defs>
            <linearGradient id="fleetHealthGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid {...commonCartesianGrid} />
          <XAxis dataKey="time" {...commonXAxis} minTickGap={30} />
          <YAxis domain={[50, 100]} {...commonYAxis} unit="%" />

          <Tooltip
            content={
              <ChartTooltip
                valueFormatter={(val) => (
                  <span className="font-mono text-cyan-400 font-bold">{Number(val).toFixed(1)}%</span>
                )}
              />
            }
          />

          <ReferenceLine
            y={85}
            stroke="#10B981"
            strokeDasharray="3 3"
            strokeWidth={1.5}
            label={{
              value: "85% Optimal",
              fill: "#10B981",
              fontSize: 11,
              fontFamily: "JetBrains Mono, monospace",
              position: "right",
            }}
          />
          <ReferenceLine
            y={70}
            stroke="#F59E0B"
            strokeDasharray="3 3"
            strokeWidth={1.5}
            label={{
              value: "70% Warning",
              fill: "#F59E0B",
              fontSize: 11,
              fontFamily: "JetBrains Mono, monospace",
              position: "right",
            }}
          />

          <Area
            type="monotone"
            dataKey="health"
            name="Fleet Health"
            stroke="#10B981"
            strokeWidth={2.5}
            fill="url(#fleetHealthGrad)"
            dot={chartData.length <= 2 ? { r: 3, fill: "#10B981" } : false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

