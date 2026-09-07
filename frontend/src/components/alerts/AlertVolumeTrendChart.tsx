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
      className={clsx("flex flex-col select-none shadow-card", className)}
      header={
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-sm text-slate-900 font-sans">
            Incident Category Distribution & Frequency
          </span>
          <Badge variant="brand" size="sm">
            BACKEND AUDIT TRAIL
          </Badge>
        </div>
      }
      headerAction={
        <span className="text-xs font-mono text-slate-500">
          Open: <strong className="text-rose-600">{activeTotal}</strong> / {total} Total
        </span>
      }
    >
      <div className="space-y-3 font-sans text-xs">
        {categoryData.length === 0 ? (
          <div className="w-full h-40 flex flex-col items-center justify-center p-4 rounded-lg bg-slate-50 border border-slate-200 text-slate-400 text-center">
            <ShieldAlert className="w-6 h-6 mb-1 text-emerald-600" />
            <span>No alerts recorded in database log.</span>
          </div>
        ) : (
          <div className="w-full relative" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" opacity={0.7} />
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
                        <div className="p-2 bg-slate-900/95 text-white border border-slate-700 shadow-xl rounded-lg text-xs font-sans">
                          <p className="font-bold text-white">{item.name}</p>
                          <p className="text-blue-400 font-mono mt-0.5">Total Incidents: {item.count}</p>
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
          <span className="font-mono text-slate-500">{categoryData.length} Incident Types</span>
        </div>
      </div>
    </Card>
  );
};
