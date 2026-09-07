import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Driver, Vehicle } from "../../types/api";
import { analyticsApi } from "../../api/analytics";
import { alertsApi } from "../../api/alerts";
import { DriverSafetyScoreCard } from "./DriverSafetyScoreCard";
import { DriverBehaviorEventsGrid } from "./DriverBehaviorEventsGrid";
import { DriverBehaviorChart } from "./DriverBehaviorChart";
import { DriverCoachingCard } from "./DriverCoachingCard";
import { DriverAlertsPanel } from "./DriverAlertsPanel";
import { Card } from "../common/Card";
import { Button } from "../common/Button";
import { StatusBadge } from "../common/StatusBadge";
import { Badge } from "../common/Badge";
import {
  ArrowLeft,
  Truck,
  ExternalLink,
  Phone,
  Route,
  IdCard,
} from "lucide-react";
import { clsx } from "clsx";

export interface DriverInspectorProps {
  driver: Driver;
  assignedVehicle?: Vehicle | null;
  onBackToRoster?: () => void;
  className?: string;
}

export const DriverInspector: React.FC<DriverInspectorProps> = ({
  driver,
  assignedVehicle,
  onBackToRoster,
  className,
}) => {
  const driverId = driver.id;

  // 1. Fetch Comprehensive Driver Analytics from Backend
  const { data: analyticsData, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ["driver-analytics", driverId],
    queryFn: () => analyticsApi.getDriverAnalytics(driverId),
    refetchInterval: 5000,
  });

  // 2. Fetch Driver Alerts from Backend
  const { data: alertsData, isLoading: isLoadingAlerts } = useQuery({
    queryKey: ["driver-alerts", driverId],
    queryFn: () => alertsApi.list({ driver_id: driverId, limit: 10 }),
    refetchInterval: 5000,
  });

  const alerts = alertsData?.alerts || [];

  return (
    <div className={clsx("space-y-6 select-none", className)}>
      {/* Top Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1F2E47] pb-4">
        <div className="flex items-center gap-3">
          {onBackToRoster && (
            <button
              onClick={onBackToRoster}
              className="p-2.5 rounded-xl bg-[#111C2D] border border-[#1F2E47] text-slate-300 hover:text-white hover:bg-[#16253B] hover:border-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer shadow-md"
              aria-label="Back to driver roster"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-sans">{driver.name}</h1>
              <StatusBadge status={driver.status || "ACTIVE"} size="sm" />
              <Badge variant="brand" size="sm">
                CDL VERIFIED
              </Badge>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-1">
              License: <span className="font-mono text-slate-300">{driver.license_number}</span> · Phone:{" "}
              <span className="text-slate-200 font-medium">{driver.phone || "Unlisted"}</span>
            </p>
          </div>
        </div>

        {/* Quick Cross-Navigation Button to Assigned Vehicle */}
        {assignedVehicle && (
          <Link to={`/vehicles?id=${assignedVehicle.id}`}>
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Truck className="w-3.5 h-3.5 text-blue-400" />}
              rightIcon={<ExternalLink className="w-3 h-3 text-slate-400" />}
            >
              Inspect Vehicle ({assignedVehicle.license_plate})
            </Button>
          </Link>
        )}
      </div>

      {/* Driver Identity & Assigned Asset Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-3.5 shadow-card bg-[#111C2D] border border-[#1F2E47]">
          <div className="p-2.5 rounded-xl bg-blue-950/60 border border-blue-500/30 text-blue-400">
            <IdCard className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-sans text-slate-400 font-semibold font-mono">Commercial License</p>
            <p className="text-sm font-bold font-mono text-white mt-0.5">{driver.license_number}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5 shadow-card bg-[#111C2D] border border-[#1F2E47]">
          <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
            <Truck className="w-5 h-5" />
          </div>
          <div className="flex-1 truncate">
            <p className="text-[10px] uppercase font-sans text-slate-400 font-semibold font-mono">Assigned Asset</p>
            {assignedVehicle ? (
              <p className="text-sm font-bold text-white mt-0.5 truncate font-sans">
                {assignedVehicle.name}{" "}
                <span className="text-xs font-mono text-cyan-400 font-normal">({assignedVehicle.license_plate})</span>
              </p>
            ) : (
              <p className="text-sm font-mono text-slate-500 mt-0.5">UNASSIGNED</p>
            )}
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5 shadow-card bg-[#111C2D] border border-[#1F2E47]">
          <div className="p-2.5 rounded-xl bg-purple-950/60 border border-purple-500/30 text-purple-400">
            <Route className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-sans text-slate-400 font-semibold font-mono">Completed Missions</p>
            <p className="text-sm font-bold font-mono text-white mt-0.5">
              {driver.total_trips} trips · {driver.total_distance_km.toFixed(0)} km
            </p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5 shadow-card bg-[#111C2D] border border-[#1F2E47]">
          <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-500/30 text-amber-400">
            <Phone className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-sans text-slate-400 font-semibold font-mono">Dispatch Contact</p>
            <p className="text-sm font-bold font-mono text-white mt-0.5">{driver.phone || "No direct phone"}</p>
          </div>
        </Card>
      </div>

      {/* 1. Behavioral Infractions 4-Card Metric Grid */}
      <DriverBehaviorEventsGrid analytics={analyticsData} />

      {/* 2. Safety Score & Behavior Distribution Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DriverSafetyScoreCard analytics={analyticsData} isLoading={isLoadingAnalytics} />
        <DriverBehaviorChart analytics={analyticsData} isLoading={isLoadingAnalytics} />
      </div>

      {/* 3. Operational Safety Coaching & Alerts Context Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DriverCoachingCard analytics={analyticsData} />
        <DriverAlertsPanel alerts={alerts} isLoading={isLoadingAlerts} />
      </div>
    </div>
  );
};
