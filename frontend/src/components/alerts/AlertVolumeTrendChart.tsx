import React, { useMemo } from "react";
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
import { Alert } from "../../types/alerts";
import { ShieldAlert, BarChart3 } from "lucide-react";
import { clsx } from "clsx";

export interface AlertVolumeTrendChartProps {
  alerts: Alert[];
  className?: string;
  height?: number;
}

export const AlertVolumeTrendChart: React.FC<AlertVolumeTrendChartProps> = ({
  alerts,
  className,
  height = 180,
}) => {
  // Aggregate alerts by alert_type category
  const categoryData = useMemo(() => {
    const counts: Record<string, { count: number; critical: number; color: string }> = {};

    for (const a of alerts) {
      const typeKey = (a.alert_type || "SYSTEM").replace(/_/g, " ");
      if (!counts[typeKey]) {
        counts[typeKey] = {
          count: 0,
          critical: 0,
          color:
            a.severity === "CRITICAL"
              ? "#DC2626"
              : a.severity === "HIGH"
              ? "#D97706"
              : "#2563EB",
        };
      }
      counts[typeKey].count += 1;
      if (a.severity === "CRITICAL") counts[typeKey].critical += 1;
    }

    return Object.entries(counts)
      .map(([name, val]) => ({
        name,
        shortName: name.length > 12 ? `${name.slice(0, 10)}...` : name,
        count: val.count,
        critical: val.critical,
        color: val.critical > 0 ? "#DC2626" : val.color,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [alerts]);

  const total = alerts.length;
  const activeTotal = alerts.filter((a) => a.status !== "RESOLVED").length;

  return (
    <Card
      className={clsx("flex flex-col select-none shadow-card bg-[#111C2D] border border-[#1F2E47]", className)}
      header={
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-sm text-white font-sans">
            Incident Category Distribution & Frequency
          </span>
          <Badge variant="brand" size="sm">
            BACKEND AUDIT TRAIL
          </Badge>
        </div>
      }
      headerAction={
        <span className="text-xs font-mono text-slate-400">
          Open: <strong className="text-rose-400 font-bold">{activeTotal}</strong> / {total} Total
        </span>
      }
    >
      <div className="space-y-3 font-sans text-xs">
        {categoryData.length === 0 ? (
          <div className="w-full h-40 flex flex-col items-center justify-center p-6 rounded-xl bg-[#0B0F19] border border-[#1F2E47] text-slate-400 text-center select-none shadow-card">
            <div className="p-2.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 mb-2">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">SYSTEM CLEAR</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm font-sans">
              No alerts recorded in database log. Live monitoring is active.
            </p>
          </div>
        ) : (
          <div className="w-full relative" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2E47" opacity={0.8} />
                <XAxis
                  dataKey="shortName"
                  stroke="#64748B"
                  fontSize={10}
                  tickLine={false}
                  fontFamily="sans-serif"
                />
                <YAxis
                  allowDecimals={false}
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
                        <div className="p-2.5 bg-[#111C2D] text-white border border-[#1F2E47] shadow-2xl rounded-xl text-xs font-sans">
                          <p className="font-bold text-white">{item.name}</p>
                          <p className="text-cyan-400 font-mono mt-0.5">Total Incidents: {item.count}</p>
                          {item.critical > 0 && (
                            <p className="text-rose-400 font-mono">Critical Priority: {item.critical}</p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {categoryData.map((entry, idx) => (
                    <Cell key={`bar-${idx}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="flex items-center justify-between text-[10px] text-slate-400 font-sans px-1">
          <span>Derived from live incident queue & PostgreSQL alert ledger.</span>
          <span className="font-mono text-cyan-400">{categoryData.length} Incident Types</span>
        </div>
      </div>
    </Card>
  );
};
