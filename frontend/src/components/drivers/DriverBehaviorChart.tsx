import React from "react";
import { Card } from "../common/Card";
import { Badge } from "../common/Badge";
import { DriverAnalyticsResponse } from "../../api/analytics";
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
import { BarChart3, CheckCircle2, Lightbulb } from "lucide-react";
import { clsx } from "clsx";
import { Skeleton } from "../common/Skeleton";

export interface DriverBehaviorChartProps {
  analytics?: DriverAnalyticsResponse | null;
  isLoading?: boolean;
  className?: string;
}

export const DriverBehaviorChart: React.FC<DriverBehaviorChartProps> = ({
  analytics,
  isLoading = false,
  className,
}) => {
  const harshBrake = analytics?.harsh_braking_events ?? 0;
  const rapidAccel = analytics?.rapid_acceleration_events ?? 0;
  const speeding = analytics?.speeding_events ?? 0;
  const idle = analytics?.excessive_idle_events ?? 0;

  const data = [
    {
      name: "Harsh Braking",
      shortName: "Braking",
      count: harshBrake,
      deduction: harshBrake * 8.0,
      color: "#EF4444",
      tip: "Increase following distance and anticipate upcoming slowdowns.",
    },
    {
      name: "Rapid Accel",
      shortName: "Accel",
      count: rapidAccel,
      deduction: rapidAccel * 5.0,
      color: "#F59E0B",
      tip: "Apply smoother throttle pressure to conserve fuel & reduce powertrain strain.",
    },
    {
      name: "Overspeeding",
      shortName: "Speeding",
      count: speeding,
      deduction: speeding * 10.0,
      color: "#DC2626",
      tip: "Maintain speed below posted corridor thresholds to avoid critical penalties.",
    },
    {
      name: "Excessive Idle",
      shortName: "Idling",
      count: idle,
      deduction: idle * 6.0,
      color: "#3B82F6",
      tip: "Shut off engine during stationary loading/unloading beyond 3 minutes.",
    },
  ];

  const totalInfractions = harshBrake + rapidAccel + speeding + idle;

  // Find primary coaching focus (highest deduction)
  const primaryFocus = React.useMemo(() => {
    if (totalInfractions === 0) return null;
    return [...data].sort((a, b) => b.deduction - a.deduction)[0];
  }, [data, totalInfractions]);

  return (
    <Card
      className={clsx("flex flex-col select-none shadow-card", className)}
      header={
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-slate-100 font-sans">Infraction Distribution & Penalty Impact</span>
          <Badge variant="brand" size="sm">
            ACTUAL EVENT TELEMETRY
          </Badge>
        </div>
      }
      headerAction={
        <span className="text-xs font-mono text-slate-400">
          Total Violations: <strong className="text-white font-bold">{totalInfractions}</strong>
        </span>
      }
    >
      <div className="space-y-4 font-sans text-xs">
        {isLoading ? (
          <Skeleton className="h-60 w-full rounded-xl" />
        ) : totalInfractions === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl bg-[#0B0F19] border border-[#1F2E47]">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-2" />
            <h4 className="font-semibold text-slate-100">Zero Commercial Infractions</h4>
            <p className="text-xs text-slate-400 max-w-xs mt-1">
              Driver maintains perfect adherence to commercial safety guidelines across all tracked events.
            </p>
          </div>
        ) : (
          <>
            <div className="h-44 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                  <XAxis
                    dataKey="shortName"
                    stroke={CHART_COLORS.axisBorder}
                    tick={{ fill: CHART_COLORS.axisText, fontSize: 10, fontFamily: "sans-serif" }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    stroke={CHART_COLORS.axisBorder}
                    tick={{ fill: CHART_COLORS.axisText, fontSize: 10, fontFamily: "monospace" }}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="p-2.5 bg-[#111C2D]/95 text-white border border-[#1F2E47] shadow-xl rounded-xl text-xs font-mono">
                            <p className="font-bold text-white font-sans">{item.name}</p>
                            <p className="text-cyan-400 mt-0.5">Events: {item.count}</p>
                            <p className="text-rose-400">Score Impact: -{item.deduction} pts</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {data.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            {primaryFocus && (
              <div className="p-3.5 rounded-xl bg-[#0B0F19] border border-[#1F2E47] flex items-start gap-2.5 text-xs font-sans">
                <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white">
                    Primary Coaching Opportunity: {primaryFocus.name} (-{primaryFocus.deduction} pts)
                  </span>
                  <p className="text-slate-400 mt-0.5">{primaryFocus.tip}</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
};
