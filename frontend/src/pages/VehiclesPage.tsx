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
import { Table, Column } from "../components/common/Table";
import { Skeleton } from "../components/common/Skeleton";
import { ErrorState } from "../components/common/ErrorState";
import { Vehicle } from "../types/api";
import {
  Truck,
  Activity,
  AlertTriangle,
  Search,
  Zap,
  Eye,
} from "lucide-react";
import { clsx } from "clsx";

export const VehiclesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedIdFromUrl = searchParams.get("id");

  const [scenarioDrawerOpen, setScenarioDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [healthFilter, setHealthFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"name" | "speed" | "health">("name");

  // Zustand Store
  const telemetryMap = useTelemetryStore((s) => s.vehicles);
  const updateBatchTelemetry = useTelemetryStore((s) => s.updateBatchTelemetry);

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

  const vehicles = vehiclesData?.vehicles || [];

  // Currently inspected vehicle
  const inspectedVehicle = useMemo(() => {
    if (!selectedIdFromUrl) return null;
    return vehicles.find((v) => v.id === selectedIdFromUrl) || null;
  }, [selectedIdFromUrl, vehicles]);

  // Active scenario on inspected vehicle
  const activeScenarioForInspected = inspectedVehicle && scenariosData?.active_scenarios?.[inspectedVehicle.id]
    ? scenariosData.active_scenarios[inspectedVehicle.id].scenario
    : null;

  // Filtered and sorted vehicle list
  const filteredVehicles = useMemo(() => {
    return vehicles
      .filter((v) => {
        const matchesQuery =
          v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.license_plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.vin.toLowerCase().includes(searchQuery.toLowerCase());

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

  const handleSelectVehicle = (vehicleId: string) => {
    setSearchParams({ id: vehicleId });
  };

  const handleBackToRoster = () => {
    setSearchParams({});
  };

  if (isLoadingVehicles) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
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

  // Table Columns Definition
  const columns: Column<Vehicle>[] = [
    {
      key: "name",
      header: "Vehicle Identity",
      render: (v: Vehicle) => (
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#0B0F19] text-blue-400 border border-slate-700/80 shrink-0">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-slate-100 font-sans text-sm">{v.name}</div>
            <div className="text-xs text-slate-400 font-mono mt-0.5">
              {v.license_plate} · {v.vehicle_type}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Operational Status",
      render: (v: Vehicle) => <StatusBadge status={v.status} size="sm" />,
    },
    {
      key: "telemetry",
      header: "Live Telematics",
      render: (v: Vehicle) => {
        const t = telemetryMap[v.id]?.latest;
        const speed = t?.speed ?? 0;
        const temp = t?.engine_temp_c ?? 90;
        const isAnomaly = Boolean(t?.is_anomaly);

        return (
          <div className="font-mono text-xs space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 font-bold text-sm">{speed.toFixed(1)} km/h</span>
              <span className="text-slate-600">|</span>
              <span
                className={clsx(
                  "font-bold",
                  temp > 105
                    ? "text-rose-400"
                    : temp > 95
                    ? "text-amber-400"
                    : "text-slate-300"
                )}
              >
                {temp.toFixed(1)}°C
              </span>
            </div>
            {isAnomaly && (
              <Badge variant="critical" size="sm" dot>
                ANOMALY
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      key: "fuel",
      header: "Fuel Level",
      render: (v: Vehicle) => {
        const fuel = telemetryMap[v.id]?.latest?.fuel_level_pct ?? 75;
        return (
          <div className="w-28 space-y-1 font-mono text-xs">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-bold">{fuel.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-[#0B0F19] h-2 rounded-full overflow-hidden border border-slate-800">
              <div
                className={clsx(
                  "h-full rounded-full",
                  fuel < 15 ? "bg-rose-500 shadow-glow-crimson" : fuel < 25 ? "bg-amber-400 shadow-glow-amber" : "bg-emerald-400 shadow-glow-emerald"
                )}
                style={{ width: `${Math.min(100, Math.max(0, fuel))}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: "health_status",
      header: "Powertrain Health",
      render: (v: Vehicle) => {
        const health = v.health_status || "GOOD";
        return (
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <StatusBadge status={health} size="sm" />
          </div>
        );
      },
    },
    {
      key: "scenario",
      header: "Active Scenario",
      render: (v: Vehicle) => {
        const sc = scenariosData?.active_scenarios?.[v.id]?.scenario;
        return sc ? (
          <Badge variant="warning" size="sm" dot>
            {sc}
          </Badge>
        ) : (
          <Badge variant="neutral" size="sm">
            CRUISING
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: "Action",
      align: "right",
      render: (v: Vehicle) => (
        <Button
          size="sm"
          variant="secondary"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            handleSelectVehicle(v.id);
          }}
          leftIcon={<Eye className="w-3.5 h-3.5 text-blue-400" />}
          className="bg-[#16253B] border-slate-700 text-slate-100 hover:bg-[#1C2F4D]"
        >
          Inspect
        </Button>
      ),
    },
  ];

  return (
    <div className="w-full max-w-[1920px] mx-auto space-y-6 pb-12">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <Truck className="w-6 h-6 text-blue-400" />
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-sans">
              Vehicle Intelligence & Fleet Registry
            </h1>
            <Badge variant="brand" size="md">
              {totalVehicles} REGISTERED
            </Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1 font-sans">
            Asset powertrain telematics, dynamic health assessment, and component lifecycle diagnostics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="md"
            variant="secondary"
            onClick={() => setScenarioDrawerOpen(true)}
            leftIcon={<Zap className="w-4 h-4 text-amber-400" />}
            className="bg-[#111C2D] border border-slate-700 hover:bg-[#16253B] text-slate-200"
          >
            Scenario Cockpit
          </Button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Assets"
          value={totalVehicles}
          subtext="Configured vehicles"
          icon={<Truck className="w-4 h-4 text-blue-400" />}
        />
        <StatCard
          title="Active Telematics"
          value={activeCount}
          subtext={`${totalVehicles > 0 ? Math.round((activeCount / totalVehicles) * 100) : 0}% online`}
          icon={<Activity className="w-4 h-4 text-emerald-400" />}
        />
        <StatCard
          title="Warning Attention"
          value={warningCount}
          subtext="Service check recommended"
          icon={<AlertTriangle className="w-4 h-4 text-amber-400" />}
        />
        <StatCard
          title="Critical Incidents"
          value={criticalCount}
          subtext="Immediate triage required"
          icon={<AlertTriangle className="w-4 h-4 text-rose-400" />}
          variant={criticalCount > 0 ? "criticalGlow" : "default"}
        />
      </div>

      {/* Visual Fleet Overview Charts */}
      <VehicleFleetVisualOverview
        vehicles={vehicles}
        telemetryMap={telemetryMap}
        onSelectVehicle={handleSelectVehicle}
      />

      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-[#111C2D] border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by asset name, plate, or VIN..."
            className="w-full pl-10 pr-3.5 py-2.5 bg-[#0B0F19] border border-slate-700/80 rounded-xl text-slate-100 placeholder:text-slate-500 text-xs sm:text-sm font-sans focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all shadow-subtle"
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs uppercase text-slate-400 font-bold font-sans">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#0B0F19] border border-slate-700/80 rounded-lg text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            >
              <option value="ALL">ALL ({vehicles.length})</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="IDLE">IDLE</option>
              <option value="MAINTENANCE">MAINTENANCE</option>
            </select>
          </div>

          {/* Health Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs uppercase text-slate-400 font-bold font-sans">Health:</span>
            <select
              value={healthFilter}
              onChange={(e) => setHealthFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#0B0F19] border border-slate-700/80 rounded-lg text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            >
              <option value="ALL">ALL</option>
              <option value="GOOD">GOOD</option>
              <option value="WARNING">WARNING</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs uppercase text-slate-400 font-bold font-sans">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "name" | "speed" | "health")}
              className="px-3 py-1.5 bg-[#0B0F19] border border-slate-700/80 rounded-lg text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            >
              <option value="name">Name (A-Z)</option>
              <option value="speed">Speed (Highest)</option>
              <option value="health">Health (Critical First)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vehicles Table Card */}
      <Card
        className="overflow-hidden shadow-2xl bg-[#111C2D] border-slate-800"
        header={
          <div className="flex items-center justify-between w-full">
            <span className="font-semibold text-base text-slate-100 font-sans">Asset Telematics Manifest</span>
            <span className="text-slate-400 font-mono text-xs">
              Showing {filteredVehicles.length} of {vehicles.length} assets
            </span>
          </div>
        }
      >
        <Table<Vehicle>
          columns={columns}
          data={filteredVehicles}
          keyExtractor={(v) => v.id}
          onRowClick={(v) => handleSelectVehicle(v.id)}
          emptyMessage="No vehicles match your active search and filter criteria."
          className="bg-transparent border-0"
        />
      </Card>

      {/* Scenario Injection Drawer */}
      <ScenarioDrawer
        open={scenarioDrawerOpen}
        onOpenChange={setScenarioDrawerOpen}
        vehicles={vehicles}
      />
    </div>
  );
};


