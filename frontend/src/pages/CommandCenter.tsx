import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { vehiclesApi } from "../api/vehicles";
import { driversApi } from "../api/drivers";
import { alertsApi } from "../api/alerts";
import { analyticsApi, MaintenancePredictionResponse } from "../api/analytics";
import { telemetryApi } from "../api/telemetry";
import { scenariosApi } from "../api/scenarios";
import { useTelemetryStore, selectFleetSnapshots } from "../hooks/useTelemetryStore";
import { FleetMap } from "../components/map/FleetMap";
import { CommandCenterKpis } from "../components/command-center/CommandCenterKpis";
import { FleetConditionPanel } from "../components/command-center/FleetConditionPanel";
import { PriorityIncidentsPanel } from "../components/command-center/PriorityIncidentsPanel";
import { LiveTelemetrySection } from "../components/command-center/LiveTelemetrySection";
import { VehicleHealthRanking } from "../components/command-center/VehicleHealthRanking";
import { MaintenanceRiskRanking } from "../components/command-center/MaintenanceRiskRanking";
import { FleetHealthTrendChart } from "../components/analytics/FleetHealthTrendChart";
import { PriorityActionsPanel } from "../components/analytics/PriorityActionsPanel";
import { ScenarioDrawer } from "../components/layout/ScenarioDrawer";
import { LiveStatusBadge } from "../components/common/LiveStatusBadge";
import { Button } from "../common/Button";
import { Card, CardHeader, CardTitle, CardContent } from "../components/common/Card";
import { Skeleton } from "../components/common/Skeleton";
import {
  Radio,
  Truck,
  ExternalLink,
  Zap,
} from "lucide-react";
import { clsx } from "clsx";

export const CommandCenterPage: React.FC = () => {
  const [scenarioDrawerOpen, setScenarioDrawerOpen] = useState(false);
  const [utcTime, setUtcTime] = useState<string>("");

  // Live UTC Clock
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setUtcTime(
        now.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) + " UTC"
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  // Zustand Store Selectors (Stable references)
  const telemetryMap = useTelemetryStore((s) => s.vehicles);
  const selectedVehicleId = useTelemetryStore((s) => s.selectedVehicleId);
  const setSelectedVehicleId = useTelemetryStore((s) => s.setSelectedVehicleId);
  const updateBatchTelemetry = useTelemetryStore((s) => s.updateBatchTelemetry);
  const recordFleetSnapshot = useTelemetryStore((s) => s.recordFleetSnapshot);
  const connectionStatus = useTelemetryStore((s) => s.connectionStatus);
  const snapshots = useTelemetryStore(selectFleetSnapshots);

  // 1. Fetch Fleet Vehicles
  const { data: vehiclesData, isLoading: isLoadingVehicles } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => vehiclesApi.list({ limit: 50 }),
  });
  const vehicles = useMemo(() => vehiclesData?.vehicles || [], [vehiclesData?.vehicles]);

  // Set default selected vehicle if none
  useEffect(() => {
    if (!selectedVehicleId && vehicles.length > 0) {
      setSelectedVehicleId(vehicles[0].id);
    }
  }, [selectedVehicleId, vehicles, setSelectedVehicleId]);

  // 2. Fetch Drivers
  const { data: driversData } = useQuery({
    queryKey: ["drivers"],
    queryFn: () => driversApi.list({ limit: 50 }),
  });
  const drivers = useMemo(() => driversData || [], [driversData]);

  // 3. Fetch Alerts
  const { data: alertsData } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => alertsApi.list({ limit: 50 }),
    refetchInterval: 4000,
  });
  const alerts = useMemo(() => alertsData?.alerts || [], [alertsData?.alerts]);

  // 4. Fetch Anomalies
  const { data: anomaliesData } = useQuery({
    queryKey: ["anomalies"],
    queryFn: () => analyticsApi.getAnomalies({ limit: 50 }),
  });
  const anomalies = useMemo(() => anomaliesData?.anomalies || [], [anomaliesData?.anomalies]);

  // 5. Fetch Scenarios Status
  const { data: scenariosData } = useQuery({
    queryKey: ["scenarios"],
    queryFn: () => scenariosApi.getStatus(),
    refetchInterval: 3000,
  });

  // 6. Fetch Maintenance Predictions
  const vehicleIdsKey = useMemo(() => vehicles.map((v) => v.id).join(","), [vehicles]);
  const { data: predictionsMap = {} } = useQuery({
    queryKey: ["all-maintenance-predictions", vehicleIdsKey],
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

  // 7. Initial Telemetry Seed
  useEffect(() => {
    telemetryApi
      .getLatestFleet()
      .then((fleetMap) => {
        if (fleetMap && Object.keys(fleetMap).length > 0) {
          updateBatchTelemetry(fleetMap);
        }
      })
      .catch(() => {});
  }, [updateBatchTelemetry]);

  // Selected Active Vehicle
  const activeVehicle = useMemo(() => {
    return vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0] || null;
  }, [vehicles, selectedVehicleId]);

  const liveVehicleData = activeVehicle ? telemetryMap[activeVehicle.id] : undefined;
  const liveTelemetry = liveVehicleData?.latest || null;
  const liveHistory = liveVehicleData?.history || [];

  // Compute Aggregated Operational Metrics
  const kpiData = useMemo(() => {
    const totalVehicles = vehicles.length;
    const activeVehicles = vehicles.filter((v) => v.status === "ACTIVE").length;

    let nominalCount = 0;
    let degradedCount = 0;
    let criticalCount = 0;

    const getHealthScore = (status: string) => {
      if (status === "CRITICAL") {
        criticalCount++;
        return 42;
      }
      if (status === "WARNING") {
        degradedCount++;
        return 71;
      }
      nominalCount++;
      return 95;
    };

    const totalHealth = vehicles.reduce((sum, v) => sum + getHealthScore(v.health_status), 0);
    const avgFleetHealth = totalVehicles > 0 ? totalHealth / totalVehicles : 95;

    const totalSafety = drivers.reduce((sum, d) => sum + d.overall_safety_score, 0);
    const avgDriverSafety = drivers.length > 0 ? totalSafety / drivers.length : 88;

    const activeAlerts = alerts.filter((a) => a.status !== "RESOLVED").length;
    const criticalAlerts = alerts.filter(
      (a) => (a.severity === "CRITICAL" || a.severity === "HIGH") && a.status !== "RESOLVED"
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
      activeAlerts,
      criticalAlerts,
      highMaintenanceCount,
      activeAnomaliesCount,
      nominalCount,
      degradedCount,
      criticalCount,
    };
  }, [vehicles, drivers, alerts, predictionsMap, anomalies]);

  // Periodic Telemetry Snapshot Record into Zustand
  useEffect(() => {
    if (vehicles.length > 0) {
      recordFleetSnapshot({
        avgHealth: kpiData.avgFleetHealth,
        activeAlerts: kpiData.activeAlerts,
        activeVehicles: kpiData.activeVehicles,
        nominalCount: kpiData.nominalCount,
        degradedCount: kpiData.degradedCount,
        criticalCount: kpiData.criticalCount,
      });
    }
  }, [kpiData, vehicles.length, recordFleetSnapshot]);

  // Health sparkline from snapshots
  const healthSparkline = useMemo(() => {
    if (snapshots.length < 2) return undefined;
    return snapshots.slice(-15).map((s) => s.avgHealth);
  }, [snapshots]);

  // Active Scenarios Count
  const runningScenarios = scenariosData?.active_scenarios || {};
  const activeScenarioCount = Object.keys(runningScenarios).length;
  const isStreaming = connectionStatus === "CONNECTED";

  return (
    <div className="space-y-6 pb-12 w-full max-w-[1920px] mx-auto">
      {/* ==================================================
          TOP: PAGE TITLE & STATUS STRIP
          ================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5 mb-2">
        <div>
          <div className="flex items-center gap-2.5">
            <Radio className="w-6 h-6 text-blue-400 shrink-0 animate-pulse" />
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-sans">
              Operations Command Center
            </h1>
          </div>
          <p className="text-sm text-slate-400 font-sans mt-1">
            Real-time fleet health, active telematics stream, and predictive operational intelligence
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <LiveStatusBadge
            isLive={isStreaming}
            updatedTime={utcTime.split(" ")[0]}
            size="md"
          />

          <span className="hidden md:inline-block text-xs font-mono font-semibold px-3 py-2 rounded-xl bg-[#111C2D] border border-slate-700/80 text-cyan-400 tabular-nums shadow-lg">
            {utcTime || "00:00:00 UTC"}
          </span>

          <Button
            size="md"
            variant="secondary"
            onClick={() => setScenarioDrawerOpen(true)}
            leftIcon={<Zap className="w-4 h-4 text-amber-400" />}
            className="bg-[#111C2D] border border-slate-700 hover:bg-[#16253B] text-slate-200"
          >
            {activeScenarioCount > 0 ? (
              <span className="text-amber-400 font-bold">{activeScenarioCount} Scenarios Active</span>
            ) : (
              <span>Simulator Cockpit</span>
            )}
          </Button>
        </div>
      </div>

      {/* ==================================================
          SECTION 1 — EXECUTIVE KPIs
          ================================================== */}
      <CommandCenterKpis
        totalVehicles={kpiData.totalVehicles}
        activeVehicles={kpiData.activeVehicles}
        avgFleetHealth={kpiData.avgFleetHealth}
        avgDriverSafety={kpiData.avgDriverSafety}
        criticalAlerts={kpiData.criticalAlerts}
        highMaintenanceCount={kpiData.highMaintenanceCount}
        activeAnomaliesCount={kpiData.activeAnomaliesCount}
        healthSparkline={healthSparkline}
      />

      {/* ==================================================
          SECTION 2 — LIVE OPERATIONAL VIEW (Two-Column)
          Left: Large Tactical Fleet Map
          Right: Fleet Condition + Priority Incidents
          ================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT: Large Fleet Map (8 cols) */}
        <div className="lg:col-span-8 flex flex-col">
          <Card className="flex flex-col bg-[#111C2D] border-slate-800">
            <CardHeader className="border-b border-slate-800">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2.5">
                  <span
                    className={clsx(
                      "w-2.5 h-2.5 rounded-full",
                      isStreaming ? "bg-emerald-400 shadow-glow-emerald" : "bg-amber-400 animate-pulse shadow-glow-amber"
                    )}
                  />
                  <CardTitle className="text-slate-100 text-lg">Tactical Fleet Map</CardTitle>
                  <span className="text-slate-400 hidden sm:inline font-mono text-xs">
                    · {kpiData.activeVehicles} active streaming units
                  </span>
                </div>

                <Link
                  to="/map"
                  className="text-xs sm:text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 font-semibold font-sans transition-colors"
                >
                  <span>Full Screen Map</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </CardHeader>

            <CardContent className="p-0 relative">
              <div className="relative w-full h-[460px] sm:h-[500px] lg:h-[520px] overflow-hidden">
                {isLoadingVehicles ? (
                  <Skeleton className="w-full h-full" />
                ) : (
                  <FleetMap
                    vehicles={vehicles}
                    telemetryMap={telemetryMap}
                    selectedVehicleId={selectedVehicleId}
                    onSelectVehicle={(id) => setSelectedVehicleId(id)}
                    className="w-full h-full"
                  />
                )}

                {/* Floating Telemetry HUD with Dark Glass Glow */}
                {activeVehicle && liveTelemetry && (
                  <div className="absolute bottom-4 left-4 right-4 z-[400] bg-[#0B0F19]/95 backdrop-blur-md border border-slate-700/90 rounded-2xl p-4 shadow-2xl flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm font-mono">
                    <div className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-glow-emerald animate-pulse" />
                      <div>
                        <div className="font-bold text-white text-base">{activeVehicle.name}</div>
                        <div className="text-xs text-slate-400 font-sans font-medium">
                          {activeVehicle.license_plate} · {activeVehicle.vehicle_type}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 text-xs sm:text-sm">
                      <div className="px-3.5 py-1.5 rounded-xl bg-[#111C2D] border border-slate-700/80">
                        <span className="text-slate-400 text-[10px] uppercase font-bold block font-sans">Speed</span>
                        <span className="font-bold text-cyan-400 font-mono text-sm sm:text-base">
                          {liveTelemetry.speed.toFixed(1)} km/h
                        </span>
                      </div>

                      <div className="px-3.5 py-1.5 rounded-xl bg-[#111C2D] border border-slate-700/80">
                        <span className="text-slate-400 text-[10px] uppercase font-bold block font-sans">Coolant</span>
                        <span
                          className={clsx(
                            "font-bold font-mono text-sm sm:text-base",
                            liveTelemetry.engine_temp_c > 105
                              ? "text-rose-400"
                              : liveTelemetry.engine_temp_c > 95
                              ? "text-amber-400"
                              : "text-slate-100"
                          )}
                        >
                          {liveTelemetry.engine_temp_c.toFixed(1)}°C
                        </span>
                      </div>

                      <div className="px-3.5 py-1.5 rounded-xl bg-[#111C2D] border border-slate-700/80">
                        <span className="text-slate-400 text-[10px] uppercase font-bold block font-sans">Oil Press</span>
                        <span
                          className={clsx(
                            "font-bold font-mono text-sm sm:text-base",
                            liveTelemetry.oil_pressure_psi < 20 ? "text-rose-400" : "text-purple-300"
                          )}
                        >
                          {liveTelemetry.oil_pressure_psi.toFixed(1)} PSI
                        </span>
                      </div>

                      <div className="px-3.5 py-1.5 rounded-xl bg-[#111C2D] border border-slate-700/80">
                        <span className="text-slate-400 text-[10px] uppercase font-bold block font-sans">Fuel</span>
                        <span className="font-bold text-emerald-400 font-mono text-sm sm:text-base">
                          {liveTelemetry.fuel_level_pct.toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    <Link to={`/vehicles?id=${activeVehicle.id}`}>
                      <Button size="sm" variant="secondary" className="text-xs h-9 px-3.5 font-semibold bg-[#16253B] border-slate-700 text-slate-100 hover:bg-[#1C2F4D]">
                        <Truck className="w-3.5 h-3.5 text-blue-400 mr-1.5" />
                        <span>Inspect Asset</span>
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Fleet Condition & Priority Incidents (4 cols) */}
        <div className="lg:col-span-4 flex flex-col space-y-5">
          <FleetConditionPanel
            vehicles={vehicles}
            onSelectVehicle={(id) => setSelectedVehicleId(id)}
            selectedVehicleId={selectedVehicleId}
          />

          <PriorityIncidentsPanel
            alerts={alerts}
            vehicles={vehicles}
          />
        </div>
      </div>

      {/* ==================================================
          SECTION 3 — FLEET HEALTH TREND
          ================================================== */}
      <div>
        <FleetHealthTrendChart height={320} />
      </div>

      {/* ==================================================
          SECTION 4 — FLEET TELEMETRY
          Interactive single multi-sensor chart with metric toggles
          ================================================== */}
      <div>
        <LiveTelemetrySection
          vehicle={activeVehicle}
          history={liveHistory}
          lastUpdated={liveVehicleData?.lastUpdated}
          isStreaming={isStreaming}
        />
      </div>

      {/* ==================================================
          SECTION 5 — OPERATIONAL PERFORMANCE
          Left: Vehicle Health Ranking (horizontal bar chart)
          Right: Maintenance Risk (predictive maintenance table)
          ================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <VehicleHealthRanking
          vehicles={vehicles}
          onSelectVehicle={(id) => setSelectedVehicleId(id)}
          selectedVehicleId={selectedVehicleId}
        />

        <MaintenanceRiskRanking
          vehicles={vehicles}
          predictions={predictionsMap}
        />
      </div>

      {/* ==================================================
          SECTION 6 — OPERATOR ACTIONS
          Priority actions generated from actual live conditions
          ================================================== */}
      <div>
        <PriorityActionsPanel
          vehicles={vehicles}
          alerts={alerts}
          predictions={predictionsMap}
          drivers={drivers}
        />
      </div>

      {/* Scenario Injection Drawer */}
      <ScenarioDrawer
        open={scenarioDrawerOpen}
        onOpenChange={setScenarioDrawerOpen}
        vehicles={vehicles}
      />
    </div>
  );
};

