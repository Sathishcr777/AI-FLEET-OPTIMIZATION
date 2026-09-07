import React from "react";
import { Card } from "../common/Card";
import { Alert } from "../../types/alerts";
import { Vehicle, Driver } from "../../types/api";
import { AlertCard } from "./AlertCard";
import { Skeleton } from "../common/Skeleton";
import { ShieldCheck, ArrowUpDown, Bell } from "lucide-react";
import { clsx } from "clsx";

export interface AlertQueueProps {
  alerts: Alert[];
  vehicles: Vehicle[];
  drivers: Driver[];
  selectedAlertId: string | null;
  onSelectAlert: (alert: Alert) => void;
  sortBy: "newest" | "oldest" | "severity";
  setSortBy: (sort: "newest" | "oldest" | "severity") => void;
  isLoading?: boolean;
  className?: string;
}

export const AlertQueue: React.FC<AlertQueueProps> = ({
  alerts,
  vehicles,
  drivers,
  selectedAlertId,
  onSelectAlert,
  sortBy,
  setSortBy,
  isLoading = false,
  className,
}) => {
  // Vehicle and Driver Maps for fast lookup
  const vehicleMap = React.useMemo(() => {
    const map = new Map<string, Vehicle>();
    for (const v of vehicles) map.set(v.id, v);
    return map;
  }, [vehicles]);

  const driverMap = React.useMemo(() => {
    const map = new Map<string, Driver>();
    for (const d of drivers) map.set(d.id, d);
    return map;
  }, [drivers]);

  // Sort alerts
  const sortedAlerts = React.useMemo(() => {
    const severityRank: Record<string, number> = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
      INFO: 1,
      WARNING: 2,
    };

    return [...alerts].sort((a, b) => {
      if (sortBy === "severity") {
        const rankDiff = (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0);
        if (rankDiff !== 0) return rankDiff;
      }
      const timeA = new Date(a.created_at || a.timestamp).getTime();
      const timeB = new Date(b.created_at || b.timestamp).getTime();

      if (sortBy === "oldest") return timeA - timeB;
      return timeB - timeA; // default: newest first
    });
  }, [alerts, sortBy]);

  return (
    <Card
      className={clsx("flex flex-col h-full select-none shadow-card bg-[#111C2D] border border-[#1F2E47]", className)}
      header={
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-white font-sans">Incident Queue ({alerts.length})</span>
        </div>
      }
      headerAction={
        <div className="flex items-center gap-1.5 font-sans text-xs">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "newest" | "oldest" | "severity")}
            className="px-2.5 py-1 bg-[#0B0F19] border border-[#1F2E47] rounded-lg text-slate-300 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="newest" className="bg-[#0B0F19] text-white">Newest First</option>
            <option value="severity" className="bg-[#0B0F19] text-white">Highest Severity</option>
            <option value="oldest" className="bg-[#0B0F19] text-white">Oldest First</option>
          </select>
        </div>
      }
    >
      <div className="space-y-2.5 overflow-y-auto pr-1 flex-1">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : sortedAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl bg-[#0B0F19] border border-[#1F2E47]">
            <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 mb-2">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">No Incidents in Queue</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs font-sans">
              All active alerts have been resolved or filtered out by your current criteria.
            </p>
          </div>
        ) : (
          sortedAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              vehicle={vehicleMap.get(alert.vehicle_id)}
              driver={alert.driver_id ? driverMap.get(alert.driver_id) : undefined}
              isSelected={selectedAlertId === alert.id}
              onSelect={onSelectAlert}
            />
          ))
        )}
      </div>
    </Card>
  );
};
