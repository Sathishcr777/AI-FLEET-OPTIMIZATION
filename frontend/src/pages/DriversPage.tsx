import React, { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { driversApi } from "../api/drivers";
import { vehiclesApi } from "../api/vehicles";
import { Driver, Vehicle } from "../types/api";
import { DriverInspector } from "../components/drivers/DriverInspector";
import { DriverSafetyRankingChart } from "../components/drivers/DriverSafetyRankingChart";
import { ScenarioDrawer } from "../components/layout/ScenarioDrawer";
import { StatCard } from "../components/common/StatCard";
import { Card } from "../components/common/Card";
import { StatusBadge } from "../components/common/StatusBadge";
import { SeverityBadge } from "../components/common/SeverityBadge";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { Table, Column } from "../components/common/Table";
import { Skeleton } from "../components/common/Skeleton";
import { ErrorState } from "../components/common/ErrorState";
import {
  Users,
  ShieldCheck,
  AlertTriangle,
  Search,
  Eye,
  Truck,
  Zap,
  Award,
} from "lucide-react";
import { clsx } from "clsx";

export const DriversPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedDriverId = searchParams.get("id");

  const [scenarioDrawerOpen, setScenarioDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [riskFilter, setRiskFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"score_desc" | "score_asc" | "name" | "distance">("score_desc");

  // 1. Fetch Fleet Drivers from Backend
  const {
    data: driversData,
    isLoading: isLoadingDrivers,
    isError: isDriversError,
    refetch: refetchDrivers,
  } = useQuery({
    queryKey: ["drivers"],
    queryFn: () => driversApi.list({ limit: 100 }),
  });

  // 2. Fetch Fleet Vehicles (to map driver ↔ vehicle assignments)
  const { data: vehiclesData } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => vehiclesApi.list({ limit: 100 }),
  });

  const drivers = driversData || [];
  const vehicles = vehiclesData?.vehicles || [];

  // Map driver ID to assigned vehicle
  const driverVehicleMap = useMemo(() => {
    const map = new Map<string, Vehicle>();
    for (const v of vehicles) {
      if (v.assigned_driver_id) {
        map.set(v.assigned_driver_id, v);
      }
    }
    return map;
  }, [vehicles]);

  // Selected driver for detailed inspector
  const inspectedDriver = useMemo(() => {
    if (!selectedDriverId) return null;
    return drivers.find((d) => d.id === selectedDriverId) || null;
  }, [selectedDriverId, drivers]);

  const assignedVehicleForInspected = inspectedDriver
    ? driverVehicleMap.get(inspectedDriver.id) || null
    : null;

  // Filtered and Sorted Driver Leaderboard
  const filteredDrivers = useMemo(() => {
    return drivers
      .filter((d) => {
        const matchesSearch =
          d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.license_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (d.phone && d.phone.toLowerCase().includes(searchQuery.toLowerCase()));

        if (!matchesSearch) return false;
        if (statusFilter !== "ALL" && d.status !== statusFilter) return false;

        const score = d.overall_safety_score ?? 100;
        const risk = score >= 80 ? "LOW" : score >= 60 ? "MEDIUM" : score >= 40 ? "HIGH" : "CRITICAL";
        if (riskFilter !== "ALL" && risk !== riskFilter) return false;

        return true;
      })
      .sort((a, b) => {
        const scoreA = a.overall_safety_score ?? 100;
        const scoreB = b.overall_safety_score ?? 100;

        if (sortBy === "score_desc") return scoreB - scoreA;
        if (sortBy === "score_asc") return scoreA - scoreB;
        if (sortBy === "distance") return b.total_distance_km - a.total_distance_km;
        return a.name.localeCompare(b.name);
      });
  }, [drivers, searchQuery, statusFilter, riskFilter, sortBy]);

  // Fleet Statistics
  const totalDrivers = drivers.length;
  const activeDrivers = drivers.filter((d) => d.status === "ACTIVE").length;
  const avgSafetyScore =
    totalDrivers > 0
      ? drivers.reduce((acc, d) => acc + (d.overall_safety_score ?? 100), 0) / totalDrivers
      : 100;
  const highRiskCount = drivers.filter((d) => (d.overall_safety_score ?? 100) < 60).length;

  const handleSelectDriver = (driverId: string) => {
    setSearchParams({ id: driverId });
  };

  const handleBackToRoster = () => {
    setSearchParams({});
  };

  if (isLoadingDrivers) {
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

  if (isDriversError) {
    return (
      <ErrorState
        title="Failed to load driver roster"
        message="Could not retrieve driver safety data from the backend. Please check server connectivity."
        onRetry={refetchDrivers}
      />
    );
  }

  // If a driver is selected, render the full-page Driver Intelligence Inspector
  if (inspectedDriver) {
    return (
      <>
        <DriverInspector
          driver={inspectedDriver}
          assignedVehicle={assignedVehicleForInspected}
          onBackToRoster={handleBackToRoster}
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
  const columns: Column<Driver>[] = [
    {
      key: "name",
      header: "Operator Profile",
      render: (d: Driver) => (
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#0B0F19] text-blue-400 border border-[#1F2E47] shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-white font-sans text-xs">{d.name}</div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              CDL: {d.license_number} · {d.phone || "No phone"}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Duty Status",
      render: (d: Driver) => <StatusBadge status={d.status} size="sm" />,
    },
    {
      key: "assigned_vehicle",
      header: "Assigned Asset",
      render: (d: Driver) => {
        const vehicle = driverVehicleMap.get(d.id);
        return vehicle ? (
          <div className="flex items-center gap-1.5 font-mono text-xs text-slate-200">
            <Truck className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-semibold text-cyan-400">{vehicle.name}</span>
            <span className="text-slate-400">({vehicle.license_plate})</span>
          </div>
        ) : (
          <span className="text-slate-500 font-mono text-xs">Unassigned</span>
        );
      },
    },
    {
      key: "safety_score",
      header: "Safety Index",
      render: (d: Driver) => {
        const score = d.overall_safety_score ?? 100;
        const color =
          score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-rose-400";
        const progressBg =
          score >= 80 ? "bg-emerald-400 shadow-glow-emerald" : score >= 60 ? "bg-amber-400 shadow-glow-amber" : "bg-rose-500 shadow-glow-crimson";

        return (
          <div className="w-32 space-y-1 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className={clsx("font-bold", color)}>{score.toFixed(1)} / 100</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden border border-slate-700/50">
              <div
                className={clsx("h-full rounded-full", progressBg)}
                style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: "risk_level",
      header: "Risk Tier",
      render: (d: Driver) => {
        const score = d.overall_safety_score ?? 100;
        const risk =
          score >= 80 ? "LOW" : score >= 60 ? "MEDIUM" : score >= 40 ? "HIGH" : "CRITICAL";
        return <SeverityBadge severity={risk} size="sm" />;
      },
    },
    {
      key: "distance",
      header: "Total Distance",
      render: (d: Driver) => (
        <span className="font-mono text-xs text-slate-300">
          {(d.total_distance_km || 0).toLocaleString()} km
        </span>
      ),
    },
    {
      key: "actions",
      header: "Action",
      align: "right",
      render: (d: Driver) => (
        <Button
          size="sm"
          variant="secondary"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            handleSelectDriver(d.id);
          }}
          leftIcon={<Eye className="w-3.5 h-3.5" />}
        >
          Inspect
        </Button>
      ),
    },
  ];

  return (
    <div className="w-full max-w-[1920px] mx-auto space-y-6 pb-12 select-none">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1F2E47] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-blue-400" />
            <span>Driver Safety & Behavioral Analytics</span>
            <Badge variant="brand" size="sm">
              {totalDrivers} OPERATORS
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-sans">
            Commercial operator safety scoring, driving behavior infractions, and coaching intelligence.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="md"
            variant="secondary"
            onClick={() => setScenarioDrawerOpen(true)}
            leftIcon={<Zap className="w-4 h-4 text-amber-400" />}
          >
            Scenario Cockpit
          </Button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Drivers"
          value={activeDrivers}
          subtext={`of ${totalDrivers} registered drivers`}
          icon={<Users className="w-4 h-4 text-blue-400" />}
        />
        <StatCard
          title="Fleet Safety Index"
          value={avgSafetyScore.toFixed(1)}
          unit="%"
          subtext={avgSafetyScore >= 80 ? "Optimal fleet baseline" : "Coaching required"}
          icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />}
        />
        <StatCard
          title="High-Risk Operators"
          value={highRiskCount}
          subtext="Score below 60/100"
          icon={<AlertTriangle className="w-4 h-4 text-rose-400" />}
          variant={highRiskCount > 0 ? "criticalGlow" : "default"}
        />
        <StatCard
          title="Top Safety Tier"
          value={drivers.filter((d) => (d.overall_safety_score ?? 100) >= 90).length}
          subtext="Exemplary commercial record"
          icon={<Award className="w-4 h-4 text-amber-400" />}
        />
      </div>

      {/* Driver Safety Score Ranking Leaderboard */}
      <DriverSafetyRankingChart
        drivers={drivers}
        onSelectDriver={handleSelectDriver}
        height={240}
      />

      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-[#111C2D] border border-[#1F2E47] shadow-card flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search driver by name, CDL license, or phone..."
            className="w-full pl-10 pr-3.5 py-2.5 bg-[#0B0F19] border border-[#1F2E47] rounded-xl text-white placeholder:text-slate-500 text-xs sm:text-sm font-sans focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all shadow-subtle"
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase text-slate-400 font-semibold font-sans">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-[#0B0F19] border border-[#1F2E47] rounded-lg text-slate-200 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">ALL ({drivers.length})</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="ON_DUTY">ON DUTY</option>
              <option value="OFF_DUTY">OFF DUTY</option>
              <option value="SUSPENDED">SUSPENDED</option>
            </select>
          </div>

          {/* Risk Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase text-slate-400 font-semibold font-sans">Risk:</span>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-[#0B0F19] border border-[#1F2E47] rounded-lg text-slate-200 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">ALL RISKS</option>
              <option value="LOW">LOW RISK (&gt;80)</option>
              <option value="MEDIUM">MEDIUM (60-79)</option>
              <option value="HIGH">HIGH (40-59)</option>
              <option value="CRITICAL">CRITICAL (&lt;40)</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase text-slate-400 font-semibold font-sans">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "score_desc" | "score_asc" | "name" | "distance")}
              className="px-2.5 py-1.5 bg-[#0B0F19] border border-[#1F2E47] rounded-lg text-slate-200 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="score_desc">Safety Score (Highest)</option>
              <option value="score_asc">Safety Score (Lowest)</option>
              <option value="distance">Distance Traveled</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Driver Leaderboard Table Card */}
      <Card
        className="overflow-hidden shadow-card"
        header={
          <div className="flex items-center justify-between w-full">
            <span className="font-semibold text-sm text-slate-100 font-sans">Commercial Operator Registry</span>
            <span className="text-slate-400 font-mono text-xs">
              Showing {filteredDrivers.length} of {drivers.length} operators
            </span>
          </div>
        }
      >
        <Table<Driver>
          columns={columns}
          data={filteredDrivers}
          keyExtractor={(d) => d.id}
          onRowClick={(d) => handleSelectDriver(d.id)}
          emptyMessage="No drivers match your active search and filter criteria."
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
