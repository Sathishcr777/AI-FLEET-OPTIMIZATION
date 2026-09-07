import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Vehicle } from "../../types/api";
import { useTelemetryStore } from "../../hooks/useTelemetryStore";
import { analyticsApi } from "../../api/analytics";
import { telemetryApi } from "../../api/telemetry";
import { alertsApi } from "../../api/alerts";
import { TelemetryHUD } from "../telemetry/TelemetryHUD";
import { VehicleHealthCard } from "./VehicleHealthCard";
import { PredictiveMaintenanceCard } from "./PredictiveMaintenanceCard";
import { TelemetryHistoryChart } from "./TelemetryHistoryChart";
import { AnomalyIntelligencePanel } from "./AnomalyIntelligencePanel";
import { VehicleAlertsPanel } from "./VehicleAlertsPanel";
import { Button } from "../common/Button";
import { StatusBadge } from "../common/StatusBadge";
import { Badge } from "../common/Badge";
import { ArrowLeft, Zap } from "lucide-react";
import { clsx } from "clsx";

export interface VehicleInspectorProps {
  vehicle: Vehicle;
  onBackToRoster?: () => void;
  onOpenSimulator?: () => void;
  activeScenario?: string | null;
  className?: string;
}

export const VehicleInspector: React.FC<VehicleInspectorProps> = ({
  vehicle,
  onBackToRoster,
  onOpenSimulator,
  activeScenario,
  className,
}) => {
  const vehicleId = vehicle.id;

  // Live Telemetry from Zustand Store
  const liveVehicle = useTelemetryStore((s) => s.vehicles[vehicleId]);
  const liveTelemetry = liveVehicle?.latest;
  const liveHistory = liveVehicle?.history || [];
  const lastUpdated = liveVehicle?.lastUpdated;

  // 1. Vehicle Health Query
  const { data: healthData, isLoading: isLoadingHealth } = useQuery({
    queryKey: ["vehicle-health", vehicleId],
    queryFn: () => analyticsApi.getVehicleHealth(vehicleId),
    refetchInterval: 5000,
  });

  // 2. Predictive Maintenance Query
  const { data: maintenanceData, isLoading: isLoadingMaintenance } = useQuery({
    queryKey: ["vehicle-maintenance", vehicleId],
    queryFn: () => analyticsApi.getMaintenancePrediction(vehicleId),
    refetchInterval: 5000,
  });

  // 3. Telemetry Anomalies Query
  const { data: anomaliesData, isLoading: isLoadingAnomalies } = useQuery({
    queryKey: ["vehicle-anomalies", vehicleId],
    queryFn: () => analyticsApi.getAnomalies({ vehicle_id: vehicleId, limit: 20 }),
    refetchInterval: 4000,
  });

  // 4. Alerts Query
  const { data: alertsData, isLoading: isLoadingAlerts } = useQuery({
    queryKey: ["vehicle-alerts", vehicleId],
    queryFn: () => alertsApi.list({ vehicle_id: vehicleId, limit: 10 }),
    refetchInterval: 4000,
  });

  // 5. Initial Telemetry History from REST (seeds history if Zustand buffer has few points)
  const { data: initialHistoryData } = useQuery({
    queryKey: ["vehicle-history", vehicleId],
    queryFn: () => telemetryApi.getVehicleHistory(vehicleId, 50),
    staleTime: 60000,
  });

  // Merge REST historical records with live Zustand packets
  const combinedHistory = React.useMemo(() => {
    if (liveHistory.length >= 10) return liveHistory;
    const restRecords = initialHistoryData?.records || [];
    if (restRecords.length === 0) return liveHistory;

    // Combine and deduplicate
    const map = new Map<string, typeof liveTelemetry>();
    for (const r of restRecords) {
      if (r.time) map.set(r.time, r);
    }
    for (const r of liveHistory) {
      if (r.time) map.set(r.time, r);
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(a?.time || 0).getTime() - new Date(b?.time || 0).getTime()
    );
  }, [liveHistory, initialHistoryData, liveTelemetry]);

  return (
    <div className={clsx("space-y-6 select-none", className)}>
      {/* Top Navigation & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1F2E47] pb-4">
        <div className="flex items-center gap-3">
          {onBackToRoster && (
            <button
              onClick={onBackToRoster}
              className="p-2.5 rounded-xl bg-[#111C2D] border border-[#1F2E47] text-slate-300 hover:text-white hover:bg-[#16253B] hover:border-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer shadow-md"
              aria-label="Back to fleet roster"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-sans">{vehicle.name}</h1>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-lg bg-[#0B0F19] text-cyan-400 border border-[#1F2E47] font-semibold">
                {vehicle.license_plate}
              </span>
              <StatusBadge status={vehicle.health_status || "GOOD"} size="sm" />
              {activeScenario && (
                <Badge variant="warning" size="sm" dot>
                  SIMULATION: {activeScenario}
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-400 font-sans mt-1">
              VIN: <span className="font-mono text-slate-300">{vehicle.vin}</span> · Type: <span className="text-slate-300">{vehicle.vehicle_type}</span> · Driver:{" "}
              <span className="text-slate-200 font-medium">{vehicle.assigned_driver_id ? "Assigned" : "Unassigned"}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenSimulator && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onOpenSimulator}
              leftIcon={<Zap className="w-3.5 h-3.5 text-amber-500" />}
            >
              Simulator Controls
            </Button>
          )}
        </div>
      </div>

      {/* 1. Live Powertrain Telemetry HUD & Gauge Cluster */}
      <TelemetryHUD
        vehicle={vehicle}
        telemetry={liveTelemetry}
        history={liveHistory}
        lastUpdated={lastUpdated}
        activeScenario={activeScenario}
        onOpenSimulator={onOpenSimulator}
      />

      {/* 2. Powertrain Health & Predictive Maintenance Cards Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VehicleHealthCard health={healthData} isLoading={isLoadingHealth} />
        <PredictiveMaintenanceCard prediction={maintenanceData} isLoading={isLoadingMaintenance} />
      </div>

      {/* 3. Powertrain Time-Series Telemetry Charts */}
      <TelemetryHistoryChart history={combinedHistory} />

      {/* 4. Anomaly Intelligence & Alerts Context Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnomalyIntelligencePanel
          anomalies={anomaliesData?.anomalies || []}
          isLoading={isLoadingAnomalies}
        />
        <VehicleAlertsPanel
          alerts={alertsData?.alerts || []}
          isLoading={isLoadingAlerts}
        />
      </div>
    </div>
  );
};

