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
import {
  ArrowLeft,
  Zap,
  Radio,
  ChevronRight,
} from "lucide-react";
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

  // 5. Initial Telemetry History from REST
  const { data: initialHistoryData } = useQuery({
    queryKey: ["vehicle-history", vehicleId],
    queryFn: () => telemetryApi.getVehicleHistory(vehicleId, 50),
    staleTime: 60000,
  });

  // Merge REST historical records with live Zustand packets stably
  const combinedHistory = React.useMemo(() => {
    const restRecords = initialHistoryData?.records || [];
    const map = new Map<string, any>();
    for (const r of restRecords) {
      if (r && r.time) map.set(r.time, r);
    }
    for (const r of liveHistory) {
      if (r && r.time) map.set(r.time, r);
    }
    if (map.size === 0 && liveTelemetry && liveTelemetry.time) {
      map.set(liveTelemetry.time, liveTelemetry);
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
    );
  }, [liveHistory, initialHistoryData, liveTelemetry]);

  return (
    <div className={clsx("space-y-6 select-none", className)}>
      {/* ==================================================
          TOP BREADCRUMB & MISSION WORKSTATION HEADER
          ================================================== */}
      <div className="space-y-3 border-b border-slate-800 pb-5">
        {/* Breadcrumb Path */}
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <button
            onClick={onBackToRoster}
            className="hover:text-cyan-400 transition-colors cursor-pointer flex items-center gap-1 font-bold"
          >
            <span>FLEET REGISTRY</span>
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-slate-300 font-bold">ASSET DIAGNOSTICS</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-cyan-400 font-bold">{vehicle.license_plate}</span>
        </div>

        {/* Identity & Action Cockpit */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {onBackToRoster && (
              <button
                onClick={onBackToRoster}
                className="p-3 rounded-2xl bg-[#111C2D] border border-slate-700 text-slate-300 hover:text-white hover:bg-[#16253B] hover:border-cyan-500 transition-all cursor-pointer shadow-lg group"
                aria-label="Back to fleet roster"
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
              </button>
            )}

            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-sans">
                  {vehicle.name}
                </h1>
                <span className="text-xs font-mono px-3 py-1 rounded-xl bg-[#0B0F19] text-cyan-400 border border-slate-700 font-bold tracking-wider shadow-sm">
                  {vehicle.license_plate}
                </span>
                <StatusBadge status={vehicle.health_status || "GOOD"} size="md" />
                {activeScenario && (
                  <Badge variant="warning" size="md" dot className="font-mono">
                    SIMULATION: {activeScenario}
                  </Badge>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-400 font-sans mt-1">
                VIN: <span className="font-mono text-slate-200 font-semibold">{vehicle.vin}</span> ·
                Model: <span className="text-slate-200 font-semibold">{vehicle.model || vehicle.vehicle_type}</span> ·
                Status: <span className="text-emerald-400 font-bold">{vehicle.status}</span> ·
                Telemetry: <span className="text-cyan-400 font-mono font-bold">WSS LIVE</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-[#111C2D] border border-slate-800 text-xs font-mono text-slate-300 shadow-sm">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>LIVE BUFFER: {combinedHistory.length} PKTS</span>
            </div>

            {onOpenSimulator && (
              <Button
                size="md"
                variant="secondary"
                onClick={onOpenSimulator}
                leftIcon={<Zap className="w-4 h-4 text-amber-400" />}
                className="bg-[#111C2D] border-slate-700 hover:bg-[#16253B] text-slate-100 font-semibold shadow-card"
              >
                Simulator Cockpit
              </Button>
            )}
          </div>
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

      {/* 2. Powertrain Health & Predictive Maintenance Workstations Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <VehicleHealthCard
          health={healthData}
          telemetry={liveTelemetry}
          history={combinedHistory}
          vehicle={vehicle}
          isLoading={isLoadingHealth}
        />
        <PredictiveMaintenanceCard
          prediction={maintenanceData}
          telemetry={liveTelemetry}
          history={combinedHistory}
          vehicle={vehicle}
          isLoading={isLoadingMaintenance}
        />
      </div>

      {/* 3. Powertrain Multi-Sensor Time-Series Telemetry Charts */}
      <TelemetryHistoryChart history={combinedHistory} />

      {/* 4. Anomaly Intelligence & Alerts Context Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
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
