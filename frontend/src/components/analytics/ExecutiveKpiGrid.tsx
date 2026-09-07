import React from "react";
import { StatCard } from "../common/StatCard";
import {
  Activity,
  ShieldCheck,
  Truck,
  AlertTriangle,
  Flame,
  Wrench,
} from "lucide-react";

export interface ExecutiveKpiGridProps {
  totalVehicles: number;
  activeVehicles: number;
  avgFleetHealth: number;
  avgDriverSafety: number;
  criticalAlerts: number;
  highMaintenanceCount: number;
  activeAnomaliesCount: number;
  className?: string;
}

export const ExecutiveKpiGrid: React.FC<ExecutiveKpiGridProps> = ({
  totalVehicles,
  activeVehicles,
  avgFleetHealth,
  avgDriverSafety,
  criticalAlerts,
  highMaintenanceCount,
  activeAnomaliesCount,
  className,
}) => {
  const hasCriticalIncidents = criticalAlerts > 0;
  const isHealthLow = avgFleetHealth < 75;

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 ${className || ""}`}>
      {/* 1. Fleet Connection */}
      <StatCard
        title="Active Fleet"
        value={`${activeVehicles} / ${totalVehicles}`}
        subtext={`${totalVehicles > 0 ? Math.round((activeVehicles / totalVehicles) * 100) : 0}% telemetry coverage`}
        icon={<Truck className="w-4 h-4 text-blue-600" />}
      />

      {/* 2. Fleet Health Index */}
      <StatCard
        title="Fleet Health"
        value={avgFleetHealth.toFixed(1)}
        unit="%"
        subtext={avgFleetHealth >= 85 ? "Optimal condition" : avgFleetHealth >= 70 ? "Degraded condition" : "Critical attention"}
        icon={<Activity className="w-4 h-4 text-emerald-600" />}
        variant={isHealthLow ? "criticalGlow" : "default"}
      />

      {/* 3. Driver Safety Index */}
      <StatCard
        title="Driver Safety"
        value={avgDriverSafety.toFixed(0)}
        unit="/100"
        subtext={avgDriverSafety >= 85 ? "Low risk fleet" : "Elevated risk"}
        icon={<ShieldCheck className="w-4 h-4 text-blue-600" />}
      />

      {/* 4. Critical & High Alerts */}
      <StatCard
        title="Critical Alerts"
        value={criticalAlerts}
        subtext={criticalAlerts > 0 ? "Requires triage" : "Queue clear"}
        icon={<AlertTriangle className="w-4 h-4 text-rose-500" />}
        variant={hasCriticalIncidents ? "criticalGlow" : "default"}
      />

      {/* 5. High Maintenance Risk Assets */}
      <StatCard
        title="Maint. Risk"
        value={highMaintenanceCount}
        subtext="Service required"
        icon={<Wrench className="w-4 h-4 text-amber-500" />}
      />

      {/* 6. Active Telemetry Anomalies */}
      <StatCard
        title="Anomalies"
        value={activeAnomaliesCount}
        subtext="Outlier signals"
        icon={<Flame className="w-4 h-4 text-purple-600" />}
      />
    </div>
  );
};

