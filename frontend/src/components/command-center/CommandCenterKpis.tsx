import React from "react";
import { StatCard } from "../common/StatCard";
import { Badge } from "../common/Badge";
import {
  Activity,
  ShieldCheck,
  Truck,
  AlertTriangle,
  Wrench,
} from "lucide-react";
import { clsx } from "clsx";

export interface CommandCenterKpisProps {
  totalVehicles: number;
  activeVehicles: number;
  avgFleetHealth: number;
  avgDriverSafety: number;
  criticalAlerts: number;
  highMaintenanceCount: number;
  activeAnomaliesCount: number;
  healthSparkline?: number[];
  className?: string;
}

export const CommandCenterKpis: React.FC<CommandCenterKpisProps> = ({
  totalVehicles,
  activeVehicles,
  avgFleetHealth,
  avgDriverSafety,
  criticalAlerts,
  highMaintenanceCount,
  activeAnomaliesCount,
  healthSparkline,
  className,
}) => {
  const activePct = totalVehicles > 0 ? Math.round((activeVehicles / totalVehicles) * 100) : 0;
  const isHealthCritical = avgFleetHealth < 70;
  const isHealthDegraded = avgFleetHealth < 85 && avgFleetHealth >= 70;

  return (
    <div className={clsx("grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4", className)}>
      {/* 1. Active Fleet */}
      <StatCard
        title="Active Fleet"
        value={`${activeVehicles} / ${totalVehicles}`}
        subtext={`${activePct}% streaming live`}
        statusBadge={
          <Badge variant={activeVehicles > 0 ? "healthy" : "neutral"} size="sm" dot>
            {activeVehicles > 0 ? "ONLINE" : "IDLE"}
          </Badge>
        }
        icon={<Truck className="w-4 h-4 text-blue-600" />}
      />

      {/* 2. Fleet Health */}
      <StatCard
        title="Fleet Health"
        value={avgFleetHealth.toFixed(1)}
        unit="%"
        subtext={
          activeAnomaliesCount > 0
            ? `${activeAnomaliesCount} AI anomaly signal${activeAnomaliesCount > 1 ? "s" : ""}`
            : isHealthCritical
            ? "Critical condition"
            : isHealthDegraded
            ? "Degraded condition"
            : "Optimal condition"
        }
        statusBadge={
          <Badge
            variant={isHealthCritical ? "critical" : isHealthDegraded ? "warning" : "healthy"}
            size="sm"
            dot
          >
            {isHealthCritical ? "CRITICAL" : isHealthDegraded ? "WARNING" : "HEALTHY"}
          </Badge>
        }
        sparklineData={healthSparkline}
        trend={
          healthSparkline && healthSparkline.length >= 2
            ? {
                value: `${Math.abs(healthSparkline[healthSparkline.length - 1] - healthSparkline[0]).toFixed(1)}%`,
                isPositive: healthSparkline[healthSparkline.length - 1] >= healthSparkline[0],
                label: "drift",
              }
            : undefined
        }
        icon={<Activity className="w-4 h-4 text-emerald-600" />}
      />

      {/* 3. Driver Safety */}
      <StatCard
        title="Driver Safety"
        value={avgDriverSafety.toFixed(0)}
        unit="/100"
        subtext={avgDriverSafety >= 85 ? "Low risk fleet profile" : "Elevated safety attention"}
        statusBadge={
          <Badge variant={avgDriverSafety >= 85 ? "healthy" : "warning"} size="sm">
            {avgDriverSafety >= 85 ? "SAFE" : "ATTN"}
          </Badge>
        }
        icon={<ShieldCheck className="w-4 h-4 text-blue-600" />}
      />

      {/* 4. Critical Alerts */}
      <StatCard
        title="Critical Alerts"
        value={criticalAlerts}
        subtext={criticalAlerts > 0 ? "Requires active triage" : "Incident queue clear"}
        statusBadge={
          <Badge variant={criticalAlerts > 0 ? "critical" : "healthy"} size="sm" dot>
            {criticalAlerts > 0 ? "ACTIVE" : "CLEAR"}
          </Badge>
        }
        icon={<AlertTriangle className="w-4 h-4 text-rose-500" />}
      />

      {/* 5. Maintenance Risk */}
      <StatCard
        title="Maintenance Risk"
        value={highMaintenanceCount}
        subtext={highMaintenanceCount > 0 ? "Assets need service" : "Nominal RUL across fleet"}
        statusBadge={
          <Badge variant={highMaintenanceCount > 0 ? "warning" : "healthy"} size="sm">
            {highMaintenanceCount > 0 ? "ATTENTION" : "NOMINAL"}
          </Badge>
        }
        icon={<Wrench className="w-4 h-4 text-amber-500" />}
      />
    </div>
  );
};
