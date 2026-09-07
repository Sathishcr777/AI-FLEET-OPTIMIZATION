import React from "react";
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
import { Driver } from "../../types/api";
import { Trophy, ShieldCheck, User } from "lucide-react";
import { clsx } from "clsx";

export interface DriverSafetyRankingChartProps {
  drivers: Driver[];
  onSelectDriver?: (driverId: string) => void;
  className?: string;
  height?: number;
}

export const DriverSafetyRankingChart: React.FC<DriverSafetyRankingChartProps> = ({
  drivers,
  onSelectDriver,
  className,
  height = 170,
}) => {
  const chartData = React.useMemo(() => {
    return [...drivers]
      .sort((a, b) => b.overall_safety_score - a.overall_safety_score)
      .map((d) => {
        const score = d.overall_safety_score ?? 100;
        return {
          id: d.id,
          name: d.name,
          score,
          color: score >= 85 ? "#10B981" : score >= 70 ? "#F59E0B" : "#EF4444",
        };
      });
  }, [drivers]);

  const avgScore = React.useMemo(() => {
    if (drivers.length === 0) return 100;
    const sum = drivers.reduce((acc, d) => acc + (d.overall_safety_score ?? 100), 0);
    return sum / drivers.length;
  }, [drivers]);

  return (
    <Card
      className={clsx("flex flex-col select-none shadow-card", className)}
      header={
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-sm text-slate-100 font-sans">
            Fleet Driver Safety Index & Performance Ranking
          </span>
          <Badge variant="brand" size="sm">
            LEADERBOARD
          </Badge>
        </div>
      }
      headerAction={
        <span className="text-xs font-mono text-slate-400">
          Fleet Average: <strong className="text-cyan-400 font-bold">{avgScore.toFixed(1)}</strong> / 100
        </span>
      }
    >
      <div className="space-y-3 font-sans text-xs">
        {chartData.length === 0 ? (
          <div className="w-full h-36 flex flex-col items-center justify-center p-4 rounded-xl bg-[#0B0F19] border border-[#1F2E47] text-slate-400 text-center">
            <User className="w-6 h-6 mb-1 text-slate-500" />
            <span>No drivers registered in fleet roster.</span>
          </div>
        ) : (
          <div className="w-full relative" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 40, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  stroke={CHART_COLORS.axisBorder}
                  tick={{ fill: CHART_COLORS.axisText, fontSize: 10, fontFamily: "monospace" }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke={CHART_COLORS.axisBorder}
                  tick={{ fill: CHART_COLORS.axisText, fontSize: 11, fontFamily: "sans-serif" }}
                  tickLine={false}
                  width={110}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload as { name: string; score: number };
                      return (
                        <div className="p-2.5 bg-[#111C2D]/95 text-white border border-[#1F2E47] shadow-xl rounded-xl text-xs font-mono">
                          <p className="font-bold text-white font-sans">{item.name}</p>
                          <p className="text-emerald-400 font-mono mt-0.5">
                            Safety Index: {item.score.toFixed(1)} / 100
                          </p>
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
                    const item = entry as unknown as { id: string };
                    if (item?.id && onSelectDriver) onSelectDriver(item.id);
                  }}
                  cursor="pointer"
                >
                  {chartData.map((entry, idx) => (
                    <Cell key={`bar-${idx}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="flex items-center justify-between text-[10px] text-slate-400 font-sans px-1">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>Scores computed from actual braking, acceleration, speed, and idling events.</span>
          </span>
          <span className="font-mono text-slate-500">{chartData.length} Drivers Evaluated</span>
        </div>
      </div>
    </Card>
  );
};
