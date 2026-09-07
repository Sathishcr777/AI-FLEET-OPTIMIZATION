import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { vehiclesApi } from "../api/vehicles";
import { driversApi } from "../api/drivers";
import { alertsApi } from "../api/alerts";
import { analyticsApi, MaintenancePredictionResponse, DriverAnalyticsResponse } from "../api/analytics";
import { telemetryApi } from "../api/telemetry";
import { useTelemetryStore } from "../hooks/useTelemetryStore";
import { ExecutiveKpiGrid } from "../components/analytics/ExecutiveKpiGrid";
import { FleetHealthTrendChart } from "../components/analytics/FleetHealthTrendChart";
import { FleetHealthChart } from "../components/analytics/FleetHealthChart";
import { FleetPerformanceComparison } from "../components/analytics/FleetPerformanceComparison";
import { MaintenanceRiskChart } from "../components/analytics/MaintenanceRiskChart";
import { DriverSafetyRankingChart } from "../components/drivers/DriverSafetyRankingChart";
import { DriverSafetyMatrix } from "../components/analytics/DriverSafetyMatrix";
import { AnomalyIntelligencePanel } from "../components/analytics/AnomalyIntelligencePanel";
import { AlertVolumeTrendChart } from "../components/alerts/AlertVolumeTrendChart";
import { TelemetryTrendsChart } from "../components/analytics/TelemetryTrendsChart";
import { VehicleRiskMatrix } from "../components/analytics/VehicleRiskMatrix";
import { ExecutiveInsightsPanel } from "../components/analytics/ExecutiveInsightsPanel";
import { LiveStatusBadge } from "../components/common/LiveStatusBadge";
import { Button } from "../components/common/Button";
import { Badge } from "../components/common/Badge";
import { Skeleton } from "../components/common/Skeleton";
import { ErrorState } from "../components/common/ErrorState";
import {
  BarChart3,
  RotateCcw,
  Clock,
  Radio,
  Layers,
  Truck,
  Wrench,
  Users,
  ShieldAlert,
  Activity,
  Sparkles,
} from "lucide-react";
import { clsx } from "clsx";

type AnalyticsTab =
  | "ALL"
  | "FLEET"
  | "VEHICLES"
  | "MAINTENANCE"
  | "DRIVERS"
  | "ALERTS"
  | "TELEMETRY"
  | "EXECUTIVE";

export const AnalyticsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("ALL");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [sampleLimit, setSampleLimit] = useState<number>(100);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Zustand Store
  const telemetryMap = useTelemetryStore((s) => s.vehicles);
  const connectionStatus = useTelemetryStore((s) => s.connectionStatus);

  // 1. Fetch Fleet Vehicles
  const {
    data: vehiclesData,
    isLoading: isLoadingVehicles,
    isError: isVehiclesError,
    refetch: refetchVehicles,
  } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => vehiclesApi.list({ limit: 100 }),
  });

  const vehicles = useMemo(() => vehiclesData?.vehicles || [], [vehiclesData?.vehicles]);

  // Initialize selected vehicle
  const activeVehicleId = selectedVehicleId || vehicles[0]?.id || "";

  // 2. Fetch Fleet Drivers
  const { data: driversData } = useQuery({
    queryKey: ["drivers"],
    queryFn: () => driversApi.list({ limit: 100 }),
  });

  const drivers = useMemo(() => driversData || [], [driversData]);

  // 3. Fetch Alerts
  const { data: alertsData } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => alertsApi.list({ limit: 200 }),
  });

  const alerts = useMemo(() => alertsData?.alerts || [], [alertsData?.alerts]);

  // 4. Fetch Anomalies
  const { data: anomaliesData } = useQuery({
    queryKey: ["anomalies"],
    queryFn: () => analyticsApi.getAnomalies({ limit: 100 }),
  });

  const anomalies = useMemo(() => anomaliesData?.anomalies || [], [anomaliesData?.anomalies]);

  // 5. Fetch Telemetry History for Selected Vehicle
  const { data: historyData, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["telemetry-history", activeVehicleId, sampleLimit],
    queryFn: () => telemetryApi.getVehicleHistory(activeVehicleId, sampleLimit),
    enabled: Boolean(activeVehicleId),
  });

  const telemetryHistory = useMemo(() => historyData?.records || [], [historyData?.records]);

  // 6. Fetch Maintenance Predictions for all vehicles
  const { data: predictionsMap = {} } = useQuery({
    queryKey: ["all-maintenance-predictions", vehicles.map((v) => v.id).join(",")],
    queryFn: async () => {
      const map: Record<string, MaintenancePredictionResponse> = {};
      for (const v of vehicles) {
        try {
          const res = await analyticsApi.getMaintenancePrediction(v.id);
          map[v.id] = res;
        } catch {
          // skip
        }
      }
      return map;
    },
    enabled: vehicles.length > 0,
  });

  // 7. Fetch Driver Analytics for all drivers
  const { data: driverAnalyticsMap = {} } = useQuery({
    queryKey: ["all-driver-analytics", drivers.map((d) => d.id).join(",")],
    queryFn: async () => {
      const map: Record<string, DriverAnalyticsResponse> = {};
      for (const d of drivers) {
        try {
          const res = await analyticsApi.getDriverAnalytics(d.id);
          map[d.id] = res;
        } catch {
          // skip
        }
      }
      return map;
    },
    enabled: drivers.length > 0,
  });

  // Compute Aggregates for KPI Grid
  const kpiData = useMemo(() => {
    const totalVehicles = vehicles.length;
    const activeVehicles = vehicles.filter((v) => v.status === "ACTIVE").length;

    const getHealthScore = (status: string) => {
      if (status === "CRITICAL") return 40;
      if (status === "WARNING") return 70;
      return 95;
    };

    const totalHealth = vehicles.reduce((sum, v) => sum + getHealthScore(v.health_status), 0);
    const avgFleetHealth = totalVehicles > 0 ? totalHealth / totalVehicles : 0;

    const totalSafety = drivers.reduce((sum, d) => sum + d.overall_safety_score, 0);
    const avgDriverSafety = drivers.length > 0 ? totalSafety / drivers.length : 0;

    const criticalAlerts = alerts.filter(
      (a) => a.severity === "CRITICAL" && a.status !== "RESOLVED"
    ).length;

    const highMaintenanceCount = Object.values(predictionsMap).filter(
      (p) => p.risk_level === "HIGH" || p.risk_level === "CRITICAL"
    ).length;

    const activeAnomaliesCount = anomalies.length;

    return {
      totalVehicles,
      activeVehicles,
      avgFleetHealth,
      avgDriverSafety,
      criticalAlerts,
      highMaintenanceCount,
      activeAnomaliesCount,
    };
  }, [vehicles, drivers, alerts, predictionsMap, anomalies]);

  const handleRefreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    queryClient.invalidateQueries({ queryKey: ["drivers"] });
    queryClient.invalidateQueries({ queryKey: ["alerts"] });
    queryClient.invalidateQueries({ queryKey: ["anomalies"] });
    queryClient.invalidateQueries({ queryKey: ["telemetry-history"] });
    queryClient.invalidateQueries({ queryKey: ["all-maintenance-predictions"] });
    queryClient.invalidateQueries({ queryKey: ["all-driver-analytics"] });
    setLastRefreshed(new Date());
  };

  if (isLoadingVehicles && vehicles.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (isVehiclesError) {
    return (
      <ErrorState
        title="Failed to load fleet analytics"
        message="Could not retrieve fleet telemetry analytics from the backend engine."
        onRetry={() => refetchVehicles()}
      />
    );
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/90 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5 font-sans">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <span>Fleet Analytics & Executive Intelligence</span>
            <Badge variant="brand" size="sm">
              AI / ML METRICS
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-sans">
            Fleet health distribution, predictive maintenance risk, driver safety analytics, and telematics anomaly trends.
          </p>
        </div>

        {/* Action Controls & Data Freshness */}
        <div className="flex flex-wrap items-center gap-2.5 font-sans text-xs sm:text-sm">
          {/* Live Status Badge */}
          <LiveStatusBadge
            isLive={connectionStatus === "CONNECTED"}
            isPaused={isPaused}
            onTogglePause={() => setIsPaused((p) => !p)}
            size="md"
          />

          {/* Data Freshness Indicator */}
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 shadow-subtle">
            <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
            <span className="text-xs font-mono font-medium">
              Synced {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </div>

          {/* Sample History Limit */}
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-400" />
            <select
              value={sampleLimit}
              onChange={(e) => setSampleLimit(Number(e.target.value))}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm font-mono font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-subtle"
            >
              <option value={50}>50 Pkts</option>
              <option value={100}>100 Pkts</option>
              <option value={200}>200 Pkts</option>
            </select>
          </div>

          {/* Refresh Button */}
          <Button
            size="md"
            variant="secondary"
            onClick={handleRefreshAll}
            leftIcon={<RotateCcw className="w-4 h-4" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* 1. Executive Fleet KPI Strip */}
      <ExecutiveKpiGrid
        totalVehicles={kpiData.totalVehicles}
        activeVehicles={kpiData.activeVehicles}
        avgFleetHealth={kpiData.avgFleetHealth}
        avgDriverSafety={kpiData.avgDriverSafety}
        criticalAlerts={kpiData.criticalAlerts}
        highMaintenanceCount={kpiData.highMaintenanceCount}
        activeAnomaliesCount={kpiData.activeAnomaliesCount}
      />

      {/* 2. Structured Section Tab Navigator */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200 text-xs sm:text-[13px] font-sans">
        <button
          type="button"
          onClick={() => setActiveTab("ALL")}
          className={clsx(
            "flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold transition-all cursor-pointer",
            activeTab === "ALL"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/80 font-bold"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
          )}
        >
          <Layers className="w-4 h-4 text-blue-600" />
          <span>All Analytics</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("FLEET")}
          className={clsx(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer",
            activeTab === "FLEET"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/80 font-bold"
              : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
          )}
        >
          <Activity className="w-3.5 h-3.5 text-emerald-600" />
          <span>Fleet Health (Ch 25-26)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("VEHICLES")}
          className={clsx(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer",
            activeTab === "VEHICLES"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/80 font-bold"
              : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
          )}
        >
          <Truck className="w-3.5 h-3.5 text-blue-600" />
          <span>Vehicle Intel (Ch 27-29)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("MAINTENANCE")}
          className={clsx(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer",
            activeTab === "MAINTENANCE"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/80 font-bold"
              : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
          )}
        >
          <Wrench className="w-3.5 h-3.5 text-amber-500" />
          <span>Predictive Maint (Ch 30-32)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("DRIVERS")}
          className={clsx(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer",
            activeTab === "DRIVERS"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/80 font-bold"
              : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
          )}
        >
          <Users className="w-3.5 h-3.5 text-emerald-600" />
          <span>Driver Safety (Ch 33-34)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ALERTS")}
          className={clsx(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer",
            activeTab === "ALERTS"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/80 font-bold"
              : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
          )}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
          <span>Incident Triage (Ch 35-37)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("TELEMETRY")}
          className={clsx(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer",
            activeTab === "TELEMETRY"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/80 font-bold"
              : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
          )}
        >
          <Activity className="w-3.5 h-3.5 text-purple-600" />
          <span>Live Telematics (Ch 38-43)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("EXECUTIVE")}
          className={clsx(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer",
            activeTab === "EXECUTIVE"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/80 font-bold"
              : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
          )}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Executive Action Plan</span>
        </button>
      </div>

      {/* SECTION A: Fleet Overview (Charts 25 & 26) */}
      {(activeTab === "ALL" || activeTab === "FLEET") && (
        <div className="space-y-4">
          <div className="border-b border-slate-200 pb-2">
            <h2 className="text-sm font-bold text-slate-800 font-sans flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>Section A — Fleet Health Trend & Condition Distribution</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <FleetHealthTrendChart height={180} />
            <FleetHealthChart vehicles={vehicles} />
          </div>
        </div>
      )}

      {/* SECTION B: Vehicle Intelligence & Metrics (Charts 27, 28, 29) */}
      {(activeTab === "ALL" || activeTab === "VEHICLES") && (
        <div className="space-y-4">
          <div className="border-b border-slate-200 pb-2">
            <h2 className="text-sm font-bold text-slate-800 font-sans flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-600" />
              <span>Section B — Asset Metric Comparison & Vehicle Risk Matrix</span>
            </h2>
          </div>
          <div className="space-y-4">
            <FleetPerformanceComparison
              vehicles={vehicles}
              telemetryMap={telemetryMap}
              onSelectVehicle={(id) => setSelectedVehicleId(id)}
              selectedVehicleId={activeVehicleId}
              height={170}
            />
            <VehicleRiskMatrix
              vehicles={vehicles}
              predictions={predictionsMap}
              alerts={alerts}
              anomalies={anomalies}
            />
          </div>
        </div>
      )}

      {/* SECTION C: Predictive Maintenance & Anomalies (Charts 30, 31, 32) */}
      {(activeTab === "ALL" || activeTab === "MAINTENANCE") && (
        <div className="space-y-4">
          <div className="border-b border-slate-200 pb-2">
            <h2 className="text-sm font-bold text-slate-800 font-sans flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-500" />
              <span>Section C — Predictive Maintenance Risk, RUL Ranking & Subsystem Anomalies</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <MaintenanceRiskChart
              vehicles={vehicles}
              predictions={predictionsMap}
            />
            <AnomalyIntelligencePanel
              anomalies={anomalies}
              vehicles={vehicles}
            />
          </div>
        </div>
      )}

      {/* SECTION D: Driver Intelligence & Safety (Charts 33, 34) */}
      {(activeTab === "ALL" || activeTab === "DRIVERS") && (
        <div className="space-y-4">
          <div className="border-b border-slate-200 pb-2">
            <h2 className="text-sm font-bold text-slate-800 font-sans flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Section D — Driver Safety Leaderboard & Behavioral Infraction Matrix</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <DriverSafetyRankingChart
              drivers={drivers}
              height={180}
            />
            <DriverSafetyMatrix
              drivers={drivers}
              driverAnalytics={driverAnalyticsMap}
            />
          </div>
        </div>
      )}

      {/* SECTION E: Incident Analytics & Triage (Charts 35, 36, 37) */}
      {(activeTab === "ALL" || activeTab === "ALERTS") && (
        <div className="space-y-4">
          <div className="border-b border-slate-200 pb-2">
            <h2 className="text-sm font-bold text-slate-800 font-sans flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <span>Section E — Incident Volume Trend, Severity & Category Distributions</span>
            </h2>
          </div>
          <div>
            <AlertVolumeTrendChart
              alerts={alerts}
              height={180}
            />
          </div>
        </div>
      )}

      {/* SECTION F: Live Telematics Time-Series (Charts 38–43) */}
      {(activeTab === "ALL" || activeTab === "TELEMETRY") && (
        <div className="space-y-4">
          <div className="border-b border-slate-200 pb-2">
            <h2 className="text-sm font-bold text-slate-800 font-sans flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-600" />
              <span>Section F — Multi-Sensor Powertrain Telematics Time-Series (Speed, Temp, Oil, RPM, Battery, Fuel)</span>
            </h2>
          </div>
          <div>
            <TelemetryTrendsChart
              vehicles={vehicles}
              selectedVehicleId={activeVehicleId}
              onSelectVehicle={(id) => setSelectedVehicleId(id)}
              telemetryHistory={telemetryHistory}
              isLoading={isLoadingHistory}
            />
          </div>
        </div>
      )}

      {/* SECTION G: Executive Action Plan */}
      {(activeTab === "ALL" || activeTab === "EXECUTIVE") && (
        <div className="space-y-4">
          <div className="border-b border-slate-200 pb-2">
            <h2 className="text-sm font-bold text-slate-800 font-sans flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Section G — Executive Operations Recommendations & AI Dispatch Action Plan</span>
            </h2>
          </div>
          <div>
            <ExecutiveInsightsPanel
              vehicles={vehicles}
              drivers={drivers}
              predictions={predictionsMap}
              anomalies={anomalies}
              alerts={alerts}
            />
          </div>
        </div>
      )}
    </div>
  );
};
