import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { vehiclesApi } from "../api/vehicles";
import { telemetryApi } from "../api/telemetry";
import { scenariosApi } from "../api/scenarios";
import { useTelemetryStore } from "../hooks/useTelemetryStore";
import { VehicleInspector } from "../components/vehicles/VehicleInspector";
import { VehicleFleetVisualOverview } from "../components/vehicles/VehicleFleetVisualOverview";
import { ScenarioDrawer } from "../components/layout/ScenarioDrawer";
import { StatCard } from "../components/common/StatCard";
import { Card } from "../components/common/Card";
import { StatusBadge } from "../components/common/StatusBadge";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { Skeleton } from "../components/common/Skeleton";
import { ErrorState } from "../components/common/ErrorState";
import {
  Truck,
  Activity,
  AlertTriangle,
  Search,
  Zap,
  Eye,
  LayoutGrid,
  List,
  ShieldCheck,
  Gauge,
  Thermometer,
  Radio,
  ArrowUpRight,
} from "lucide-react";
import { clsx } from "clsx";

export const VehiclesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedIdFromUrl = searchParams.get("id");

  const [scenarioDrawerOpen, setScenarioDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [healthFilter, setHealthFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"name" | "speed" | "health" | "fuel">("health");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Zustand Store
  const telemetryMap = useTelemetryStore((s) => s.vehicles);
  const updateBatchTelemetry = useTelemetryStore((s) => s.updateBatchTelemetry);
  const connectionStatus = useTelemetryStore((s) => s.connectionStatus);

  // 1. Fetch Fleet Vehicles
  const {
    data: vehiclesData,
    isLoading: isLoadingVehicles,
    isError: isVehiclesError,
    refetch: refetchVehicles,
  } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => vehiclesApi.list({ limit: 50 }),
  });

  // 2. Fetch Active Scenarios
  const { data: scenariosData } = useQuery({
    queryKey: ["scenarios"],
    queryFn: () => scenariosApi.getStatus(),
    refetchInterval: 3000,
  });

  // Seed latest telemetry on mount
  useEffect(() => {
    telemetryApi
      .getLatestFleet()
      .then((map) => {
        if (map && Object.keys(map).length > 0) {
          updateBatchTelemetry(map);
        }
      })
      .catch(() => {});
  }, [updateBatchTelemetry]);

  const vehicles = useMemo(() => vehiclesData?.vehicles || [], [vehiclesData?.vehicles]);

  // Currently inspected vehicle
  const inspectedVehicle = useMemo(() => {
    if (!selectedIdFromUrl) return null;
    return vehicles.find((v) => v.id === selectedIdFromUrl) || null;
  }, [selectedIdFromUrl, vehicles]);

  // Active scenario on inspected vehicle
  const activeScenarioForInspected =
    inspectedVehicle && scenariosData?.active_scenarios?.[inspectedVehicle.id]
      ? scenariosData.active_scenarios[inspectedVehicle.id].scenario
      : null;

  // Filtered and sorted vehicle list
  const filteredVehicles = useMemo(() => {
    return vehicles
      .filter((v) => {
        const matchesQuery =
          v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.license_plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.vin.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.vehicle_type.toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesQuery) return false;
        if (statusFilter !== "ALL" && v.status !== statusFilter) return false;
        if (healthFilter !== "ALL" && v.health_status !== healthFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "speed") {
          const speedA = telemetryMap[a.id]?.latest?.speed ?? 0;
          const speedB = telemetryMap[b.id]?.latest?.speed ?? 0;
          return speedB - speedA;
        }
        if (sortBy === "fuel") {
          const fuelA = telemetryMap[a.id]?.latest?.fuel_level_pct ?? 0;
          const fuelB = telemetryMap[b.id]?.latest?.fuel_level_pct ?? 0;
          return fuelA - fuelB;
        }
        if (sortBy === "health") {
          const scoreA = a.health_status === "CRITICAL" ? 0 : a.health_status === "WARNING" ? 1 : 2;
          const scoreB = b.health_status === "CRITICAL" ? 0 : b.health_status === "WARNING" ? 1 : 2;
          return scoreA - scoreB;
        }
        return a.name.localeCompare(b.name);
      });
  }, [vehicles, telemetryMap, searchQuery, statusFilter, healthFilter, sortBy]);

  // KPI Summary Statistics
  const totalVehicles = vehicles.length;
  const activeCount = vehicles.filter((v) => v.status === "ACTIVE").length;
  const warningCount = vehicles.filter((v) => v.health_status === "WARNING").length;
  const criticalCount = vehicles.filter((v) => v.health_status === "CRITICAL").length;
  const goodCount = vehicles.filter((v) => v.health_status === "GOOD").length;

  const handleSelectVehicle = (vehicleId: string) => {
    setSearchParams({ id: vehicleId });
  };

  const handleBackToRoster = () => {
    setSearchParams({});
  };

  if (isLoadingVehicles) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-80 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (isVehiclesError) {
    return (
      <ErrorState
        title="Failed to load fleet vehicles"
        message="Could not connect to the FleetIQ backend API. Please verify the server is running."
        onRetry={refetchVehicles}
      />
    );
  }

  // If a vehicle is selected for detailed inspection, show the Inspector Workstation
  if (inspectedVehicle) {
    return (
      <>
        <VehicleInspector
          vehicle={inspectedVehicle}
          onBackToRoster={handleBackToRoster}
          onOpenSimulator={() => setScenarioDrawerOpen(true)}
          activeScenario={activeScenarioForInspected}
        />
        <ScenarioDrawer
          open={scenarioDrawerOpen}
          onOpenChange={setScenarioDrawerOpen}
          vehicles={vehicles}
        />
      </>
    );
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto space-y-6 pb-12 select-none">
      {/* ==================================================
          TOP COMMAND HEADER
          ================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/90 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-glowBlue">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-sans">
                  Vehicle Intelligence & Fleet Registry
                </h1>
                <Badge variant="brand" size="md" className="font-mono text-xs">
                  {totalVehicles} ASSETS ONLINE
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5 font-sans">
                Real-time powertrain telemetry, diagnostic workstation triage, and predictive lifecycle analytics.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#111C2D] border border-slate-800 text-xs font-mono text-slate-300 shadow-card">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="font-bold text-emerald-400">STREAM: {connectionStatus}</span>
          </div>

          <Button
            size="md"
            variant="secondary"
            onClick={() => setScenarioDrawerOpen(true)}
            leftIcon={<Zap className="w-4 h-4 text-amber-400" />}
            className="bg-[#111C2D] border border-slate-700 hover:bg-[#16253B] text-slate-100 shadow-card font-semibold"
          >
            Scenario Cockpit
          </Button>
        </div>
      </div>

      {/* ==================================================
          EXECUTIVE FLEET KPI TELEMETRY STRIP
          ================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Registered Assets"
          value={totalVehicles}
          subtext="Active heavy-duty commercial fleet"
          icon={<Truck className="w-5 h-5 text-blue-400" />}
        />
        <StatCard
          title="Active Telematics Feed"
          value={activeCount}
          unit={`/ ${totalVehicles}`}
          subtext={`${totalVehicles > 0 ? Math.round((activeCount / totalVehicles) * 100) : 0}% telemetry coverage`}
          icon={<Activity className="w-5 h-5 text-emerald-400" />}
        />
        <StatCard
          title="Degraded Diagnostics"
          value={warningCount}
          subtext="Subsystem check recommended"
          icon={<AlertTriangle className="w-5 h-5 text-amber-400" />}
          variant={warningCount > 0 ? "default" : "default"}
        />
        <StatCard
          title="Critical Incidents"
          value={criticalCount}
          subtext="Immediate dispatch triage required"
          icon={<AlertTriangle className="w-5 h-5 text-rose-400" />}
          variant={criticalCount > 0 ? "criticalGlow" : "default"}
        />
      </div>

      {/* ==================================================
          VISUAL FLEET OVERVIEW CHARTS
          ================================================== */}
      <VehicleFleetVisualOverview
        vehicles={vehicles}
        telemetryMap={telemetryMap}
        onSelectVehicle={handleSelectVehicle}
      />

      {/* ==================================================
          TACTICAL SEARCH, FILTERS & VIEW MODE TOOLBAR
          ================================================== */}
      <div className="p-4 rounded-2xl bg-[#111C2D] border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by asset name, license plate, VIN, or model..."
            className="w-full pl-10 pr-3.5 py-2 bg-[#0B0F19] border border-slate-700/80 rounded-xl text-slate-100 placeholder:text-slate-500 text-xs sm:text-sm font-sans focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all shadow-subtle"
          />
        </div>

        {/* Filter Badges & Selectors */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          {/* Status Segmented Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] uppercase text-slate-400 font-bold font-sans">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#0B0F19] border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm"
            >
              <option value="ALL">ALL STATUS ({vehicles.length})</option>
              <option value="ACTIVE">ACTIVE ({activeCount})</option>
              <option value="IDLE">IDLE (0)</option>
              <option value="MAINTENANCE">MAINTENANCE (0)</option>
            </select>
          </div>

          {/* Health Segmented Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] uppercase text-slate-400 font-bold font-sans">Health:</span>
            <select
              value={healthFilter}
              onChange={(e) => setHealthFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#0B0F19] border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm"
            >
              <option value="ALL">ALL HEALTH ({vehicles.length})</option>
              <option value="GOOD">NOMINAL ({goodCount})</option>
              <option value="WARNING">WARNING ({warningCount})</option>
              <option value="CRITICAL">CRITICAL ({criticalCount})</option>
            </select>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] uppercase text-slate-400 font-bold font-sans">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "name" | "speed" | "health" | "fuel")}
              className="px-3 py-1.5 bg-[#0B0F19] border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm"
            >
              <option value="health">Health Priority (Critical First)</option>
              <option value="speed">Speed (Highest First)</option>
              <option value="fuel">Fuel Reserve (Lowest First)</option>
              <option value="name">Asset Name (A-Z)</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#0B0F19] border border-slate-700 rounded-xl p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={clsx(
                "p-1.5 rounded-lg transition-colors cursor-pointer",
                viewMode === "table" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
              )}
              title="Table Manifest View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={clsx(
                "p-1.5 rounded-lg transition-colors cursor-pointer",
                viewMode === "grid" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
              )}
              title="Tactical Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================
          FLEET TELEMETRY MANIFEST & ASSET CARDS
          ================================================== */}
      {viewMode === "table" ? (
        <Card
          className="overflow-hidden shadow-2xl bg-[#111C2D] border-slate-800 rounded-2xl"
          header={
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2.5">
                <Truck className="w-5 h-5 text-blue-400" />
                <span className="font-bold text-base text-white font-sans">
                  Fleet Telematics Manifest
                </span>
              </div>
              <span className="text-slate-400 font-mono text-xs">
                Displaying {filteredVehicles.length} of {vehicles.length} assets
              </span>
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-xs sm:text-[13.5px]">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase font-mono font-bold bg-[#0B0F19]/80">
                  <th className="py-3.5 pl-5">Asset Identity</th>
                  <th className="py-3.5">Status</th>
                  <th className="py-3.5">Kinematics & Speed</th>
                  <th className="py-3.5">Thermal & Coolant</th>
                  <th className="py-3.5">Oil Pressure</th>
                  <th className="py-3.5">Fuel Level</th>
                  <th className="py-3.5">Health Assessment</th>
                  <th className="py-3.5">Scenario</th>
                  <th className="py-3.5 pr-5 text-right">Workstation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredVehicles.map((v) => {
                  const t = telemetryMap[v.id]?.latest;
                  const speed = t?.speed ?? 0;
                  const temp = t?.engine_temp_c ?? 90;
                  const oil = t?.oil_pressure_psi ?? 45;
                  const fuel = t?.fuel_level_pct ?? 75;
                  const isAnomaly = Boolean(t?.is_anomaly);
                  const isCritical = v.health_status === "CRITICAL";
                  const isWarning = v.health_status === "WARNING";
                  const sc = scenariosData?.active_scenarios?.[v.id]?.scenario;

                  return (
                    <tr
                      key={v.id}
                      onClick={() => handleSelectVehicle(v.id)}
                      className={clsx(
                        "hover:bg-[#16253B]/70 transition-all cursor-pointer group",
                        isCritical && "bg-rose-950/15 hover:bg-rose-950/30"
                      )}
                    >
                      {/* Asset Identity */}
                      <td className="py-4 pl-5">
                        <div className="flex items-center gap-3">
                          <div
                            className={clsx(
                              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all",
                              isCritical
                                ? "bg-rose-950/40 border-rose-500/50 text-rose-400 shadow-glowCritical"
                                : isWarning
                                ? "bg-amber-950/40 border-amber-500/50 text-amber-400"
                                : "bg-[#0B0F19] border-slate-700 text-blue-400"
                            )}
                          >
                            <Truck className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-white group-hover:text-blue-400 transition-colors text-sm font-sans flex items-center gap-2">
                              <span>{v.name}</span>
                              {isAnomaly && (
                                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-glowCritical" />
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {v.license_plate} · <span className="text-slate-300">{v.model}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Operational Status */}
                      <td className="py-4">
                        <StatusBadge status={v.status} size="sm" />
                      </td>

                      {/* Kinematics & Speed */}
                      <td className="py-4 font-mono">
                        <div className="flex items-center gap-1.5">
                          <Gauge className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span className="font-bold text-cyan-400 text-sm">{speed.toFixed(1)}</span>
                          <span className="text-slate-500 text-xs">km/h</span>
                        </div>
                      </td>

                      {/* Thermal & Coolant */}
                      <td className="py-4 font-mono">
                        <div className="flex items-center gap-1.5">
                          <Thermometer
                            className={clsx(
                              "w-3.5 h-3.5 shrink-0",
                              temp > 105 ? "text-rose-400" : temp > 95 ? "text-amber-400" : "text-emerald-400"
                            )}
                          />
                          <span
                            className={clsx(
                              "font-bold text-xs",
                              temp > 105 ? "text-rose-400" : temp > 95 ? "text-amber-400" : "text-slate-200"
                            )}
                          >
                            {temp.toFixed(1)}°C
                          </span>
                        </div>
                      </td>

                      {/* Oil Pressure */}
                      <td className="py-4 font-mono">
                        <span
                          className={clsx(
                            "font-bold text-xs",
                            oil < 25 ? "text-rose-400" : "text-purple-300"
                          )}
                        >
                          {oil.toFixed(1)} PSI
                        </span>
                      </td>

                      {/* Fuel Level */}
                      <td className="py-4">
                        <div className="w-28 space-y-1 font-mono text-xs">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-300 font-bold">{fuel.toFixed(0)}%</span>
                            <span className="text-slate-500 text-[10px]">~{Math.round(fuel * 7.5)}km</span>
                          </div>
                          <div className="w-full bg-[#0B0F19] h-2 rounded-full overflow-hidden border border-slate-800">
                            <div
                              className={clsx(
                                "h-full rounded-full transition-all",
                                fuel < 15 ? "bg-rose-500" : fuel < 30 ? "bg-amber-400" : "bg-emerald-400"
                              )}
                              style={{ width: `${Math.min(100, Math.max(0, fuel))}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Powertrain Health */}
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={v.health_status || "GOOD"} size="sm" />
                          <span
                            className={clsx(
                              "font-mono font-bold text-xs",
                              isCritical ? "text-rose-400" : isWarning ? "text-amber-400" : "text-emerald-400"
                            )}
                          >
                            {isCritical ? "42%" : isWarning ? "68%" : "96%"}
                          </span>
                        </div>
                      </td>

                      {/* Scenario */}
                      <td className="py-4">
                        {sc ? (
                          <Badge variant="warning" size="sm" dot>
                            {sc}
                          </Badge>
                        ) : (
                          <span className="text-slate-500 font-mono text-xs">NOMINAL</span>
                        )}
                      </td>

                      {/* Action CTA */}
                      <td className="py-4 pr-5 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            handleSelectVehicle(v.id);
                          }}
                          leftIcon={<Eye className="w-3.5 h-3.5 text-cyan-400" />}
                          className="bg-[#16253B] border-slate-700 text-white hover:bg-blue-600 hover:border-blue-500 transition-all font-semibold text-xs shadow-md"
                        >
                          Diagnose
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* Tactical Asset Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVehicles.map((v) => {
            const t = telemetryMap[v.id]?.latest;
            const speed = t?.speed ?? 0;
            const temp = t?.engine_temp_c ?? 90;
            const oil = t?.oil_pressure_psi ?? 45;
            const fuel = t?.fuel_level_pct ?? 75;
            const isAnomaly = Boolean(t?.is_anomaly);
            const isCritical = v.health_status === "CRITICAL";
            const isWarning = v.health_status === "WARNING";
            const sc = scenariosData?.active_scenarios?.[v.id]?.scenario;

            return (
              <Card
                key={v.id}
                onClick={() => handleSelectVehicle(v.id)}
                variant={isCritical ? "criticalGlow" : "default"}
                className="bg-[#111C2D] border-slate-800 hover:border-cyan-500/60 transition-all cursor-pointer rounded-2xl p-5 shadow-2xl flex flex-col justify-between space-y-4 group"
              >
                {/* Header: Identity & Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={clsx(
                        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-all",
                        isCritical
                          ? "bg-rose-950/40 border-rose-500/50 text-rose-400 shadow-glowCritical"
                          : isWarning
                          ? "bg-amber-950/40 border-amber-500/50 text-amber-400"
                          : "bg-[#0B0F19] border-slate-700 text-blue-400 group-hover:border-cyan-500"
                      )}
                    >
                      <Truck className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base font-sans group-hover:text-cyan-400 transition-colors flex items-center gap-2">
                        <span>{v.name}</span>
                        {isAnomaly && (
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-glowCritical" />
                        )}
                      </h3>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        {v.license_plate} · {v.model}
                      </div>
                    </div>
                  </div>

                  <StatusBadge status={v.health_status || "GOOD"} size="sm" />
                </div>

                {/* Subsystem Telemetry 4-Tile Grid */}
                <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
                  <div className="p-2.5 rounded-xl bg-[#0B0F19] border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block">Speed</span>
                    <span className="font-bold text-cyan-400 text-sm">{speed.toFixed(1)} km/h</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#0B0F19] border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block">Coolant Temp</span>
                    <span
                      className={clsx(
                        "font-bold text-sm",
                        temp > 105 ? "text-rose-400" : temp > 95 ? "text-amber-400" : "text-emerald-400"
                      )}
                    >
                      {temp.toFixed(1)}°C
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#0B0F19] border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block">Oil Pressure</span>
                    <span className="font-bold text-purple-300 text-sm">{oil.toFixed(1)} PSI</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#0B0F19] border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block">Fuel Level</span>
                    <span className="font-bold text-emerald-400 text-sm">{fuel.toFixed(0)}%</span>
                  </div>
                </div>

                {/* Active Scenario or Nominal Protocol */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  {sc ? (
                    <Badge variant="warning" size="sm" dot>
                      {sc}
                    </Badge>
                  ) : (
                    <span className="text-xs text-slate-400 font-sans flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Nominal Operation</span>
                    </span>
                  )}

                  <span className="text-xs font-semibold text-cyan-400 group-hover:text-white flex items-center gap-1 transition-colors">
                    <span>Workstation</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Scenario Injection Drawer */}
      <ScenarioDrawer
        open={scenarioDrawerOpen}
        onOpenChange={setScenarioDrawerOpen}
        vehicles={vehicles}
      />
    </div>
  );
};
