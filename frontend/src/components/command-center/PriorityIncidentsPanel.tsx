import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "../common/Card";
import { SeverityBadge } from "../common/SeverityBadge";
import { EmptyState } from "../common/EmptyState";
import { Alert } from "../../types/alerts";
import { Vehicle } from "../../types/api";
import { AlertTriangle, ExternalLink, Truck, Clock } from "lucide-react";
import { clsx } from "clsx";

export interface PriorityIncidentsPanelProps {
  alerts: Alert[];
  vehicles: Vehicle[];
  className?: string;
}

export const PriorityIncidentsPanel: React.FC<PriorityIncidentsPanelProps> = ({
  alerts,
  vehicles,
  className,
}) => {
  // Priority Alerts sorted Critical -> High -> Medium -> Low
  const priorityAlerts = useMemo(() => {
    const sevOrder: Record<string, number> = { CRITICAL: 3, HIGH: 2, MEDIUM: 1, LOW: 0 };
    return [...alerts]
      .filter((a) => a.status !== "RESOLVED")
      .sort((a, b) => {
        const rankA = sevOrder[a.severity] || 0;
        const rankB = sevOrder[b.severity] || 0;
        if (rankA !== rankB) return rankB - rankA;
        const timeA = new Date(a.created_at || a.timestamp).getTime();
        const timeB = new Date(b.created_at || b.timestamp).getTime();
        return timeB - timeA;
      });
  }, [alerts]);

  const vehicleNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const v of vehicles) {
      map[v.id] = v.name;
    }
    return map;
  }, [vehicles]);

  const formatTime = (ts?: string) => {
    if (!ts) return "Just now";
    const date = new Date(ts);
    if (isNaN(date.getTime())) return "Recently";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Card className={clsx("flex flex-col bg-[#111C2D] border-slate-800", className)}>
      <CardHeader className="border-b border-slate-800">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4.5 h-4.5 text-rose-500" />
            <CardTitle className="text-slate-100 text-lg">Priority Incidents</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={clsx(
                "text-xs font-mono font-bold px-2.5 py-1 rounded-full",
                priorityAlerts.length > 0
                  ? "bg-rose-950/40 text-rose-400 border border-rose-500/40"
                  : "bg-emerald-950/40 text-emerald-400 border border-emerald-500/40"
              )}
            >
              {priorityAlerts.length} OPEN
            </span>
            <Link
              to="/alerts"
              className="text-xs sm:text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold font-sans ml-1 transition-colors"
            >
              <span>Triage</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-3">
        {priorityAlerts.length === 0 ? (
          <EmptyState
            preset="system_clear"
            compact
            className="py-10 bg-transparent border-0"
          />
        ) : (
          <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
            {priorityAlerts.slice(0, 5).map((alert) => {
              const vehicleName = vehicleNameMap[alert.vehicle_id] || alert.vehicle_id.slice(0, 8);
              const isCritical = alert.severity === "CRITICAL";

              return (
                <div
                  key={alert.id}
                  className={clsx(
                    "p-3.5 rounded-xl border transition-all text-xs sm:text-[13px] font-sans",
                    isCritical
                      ? "bg-rose-950/20 border-rose-500/40 hover:border-rose-500 shadow-glow-sm"
                      : "bg-[#0B0F19] border-slate-800 hover:border-slate-700"
                  )}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <SeverityBadge severity={alert.severity} size="sm" />
                      <span className="font-semibold text-slate-100 truncate tracking-tight text-sm">
                        {alert.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-slate-400 font-mono shrink-0">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{formatTime(alert.created_at || alert.timestamp)}</span>
                    </div>
                  </div>

                  <p className="text-slate-300 line-clamp-2 text-xs mb-2.5 font-sans leading-relaxed">
                    {alert.message}
                  </p>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-300 font-mono">
                      <Truck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="font-semibold truncate max-w-36">{vehicleName}</span>
                    </div>

                    <Link
                      to={`/alerts?id=${alert.id}`}
                      className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-semibold font-sans hover:underline"
                    >
                      <span>Investigate</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

