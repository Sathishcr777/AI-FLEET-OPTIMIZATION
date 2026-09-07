import React, { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { driversApi } from "../api/drivers";
import { vehiclesApi } from "../api/vehicles";
import { Vehicle } from "../types/api";
import { DriverInspector } from "../components/drivers/DriverInspector";
import { DriverSafetyRankingChart } from "../components/drivers/DriverSafetyRankingChart";
import { ScenarioDrawer } from "../components/layout/ScenarioDrawer";
import { StatCard } from "../components/common/StatCard";
import { Card } from "../components/common/Card";
import { StatusBadge } from "../components/common/StatusBadge";
import { SeverityBadge } from "../components/common/SeverityBadge";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
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

  const drivers = useMemo(() => driversData || [], [driversData]);
  const vehicles = useMemo(() => vehiclesData?.vehicles || [], [vehiclesData?.vehicles]);

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

  return (
    <div className="w-full max-w-[1920px] mx-auto space-y-6 pb-12 select-none">
      {/* ==================================================
          TOP COMMAND HEADER
          ================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/90 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-glowBlue">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-sans">
                  Driver Safety & Behavioral Analytics
                </h1>
                <Badge variant="brand" size="md" className="font-mono text-xs">
                  {totalDrivers} OPERATORS REGISTERED
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5 font-sans">
                Commercial driver risk modeling, behavioral event scoring, coaching protocols, and CDL registry.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            size="md"
            variant="secondary"
            onClick={() => setScenarioDrawerOpen(true)}
            leftIcon={<Zap className="w-4 h-4 text-amber-400" />}
            className="bg-[#111C2D] border-slate-700 hover:bg-[#16253B] text-white shadow-card font-semibold"
          >
            Scenario Cockpit
          </Button>
        </div>
      </div>

      {/* ==================================================
          DRIVER SAFETY KPI STRIP
          ================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Duty Drivers"
          value={activeDrivers}
          unit={`/ ${totalDrivers}`}
          subtext={`of ${totalDrivers} certified commercial operators`}
          icon={<Users className="w-5 h-5 text-blue-400" />}
        />
        <StatCard
          title="Fleet Safety Score"
          value={avgSafetyScore.toFixed(1)}
          unit="%"
          subtext={avgSafetyScore >= 80 ? "Optimal fleet benchmark (>80%)" : "Coaching cycle recommended"}
          icon={<ShieldCheck className="w-5 h-5 text-emerald-400" />}
        />
        <StatCard
          title="High-Risk Operators"
          value={highRiskCount}
          subtext="Score below 60/100 threshold"
          icon={<AlertTriangle className="w-5 h-5 text-rose-400" />}
          variant={highRiskCount > 0 ? "criticalGlow" : "default"}
        />
        <StatCard
          title="Top Safety Tier"
          value={drivers.filter((d) => (d.overall_safety_score ?? 100) >= 90).length}
          subtext="Score ≥ 90% exemplary record"
          icon={<Award className="w-5 h-5 text-amber-400" />}
        />
      </div>

      {/* ==================================================
          DRIVER SAFETY SCORE RANKING LEADERBOARD
          ================================================== */}
      <DriverSafetyRankingChart
        drivers={drivers}
        onSelectDriver={handleSelectDriver}
        height={260}
      />

      {/* ==================================================
          SEARCH & FILTER TOOLBAR
          ================================================== */}
      <div className="p-4 rounded-2xl bg-[#111C2D] border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search operator by name, CDL license, or phone..."
            className="w-full pl-10 pr-3.5 py-2 bg-[#0B0F19] border border-slate-700/80 rounded-xl text-slate-100 placeholder:text-slate-500 text-xs sm:text-sm font-sans focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all shadow-subtle"
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] uppercase text-slate-400 font-bold font-sans">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#0B0F19] border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm"
            >
              <option value="ALL">ALL STATUS ({drivers.length})</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="ON_DUTY">ON DUTY</option>
              <option value="OFF_DUTY">OFF DUTY</option>
              <option value="SUSPENDED">SUSPENDED</option>
            </select>
          </div>

          {/* Risk Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] uppercase text-slate-400 font-bold font-sans">Risk:</span>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#0B0F19] border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm"
            >
              <option value="ALL">ALL RISK TIERS</option>
              <option value="LOW">LOW RISK (≥80%)</option>
              <option value="MEDIUM">MEDIUM (60-79%)</option>
              <option value="HIGH">HIGH (40-59%)</option>
              <option value="CRITICAL">CRITICAL (&lt;40%)</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] uppercase text-slate-400 font-bold font-sans">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "score_desc" | "score_asc" | "name" | "distance")}
              className="px-3 py-1.5 bg-[#0B0F19] border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm"
            >
              <option value="score_desc">Safety Score (Highest First)</option>
              <option value="score_asc">Safety Score (Lowest First)</option>
              <option value="distance">Distance Traveled</option>
              <option value="name">Operator Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ==================================================
          COMMERCIAL OPERATOR REGISTRY MANIFEST
          ================================================== */}
      <Card
        className="overflow-hidden shadow-2xl bg-[#111C2D] border-slate-800 rounded-2xl"
        header={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2.5">
              <Users className="w-5 h-5 text-blue-400" />
              <span className="font-bold text-base text-white font-sans">
                Commercial Operator Registry
              </span>
            </div>
            <span className="text-slate-400 font-mono text-xs">
              Displaying {filteredDrivers.length} of {drivers.length} operators
            </span>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans text-xs sm:text-[13.5px]">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase font-mono font-bold bg-[#0B0F19]/80">
                <th className="py-3.5 pl-5">Operator Profile</th>
                <th className="py-3.5">Duty Status</th>
                <th className="py-3.5">Assigned Asset</th>
                <th className="py-3.5">Safety Index Score</th>
                <th className="py-3.5">Risk Classification</th>
                <th className="py-3.5">Logged Distance</th>
                <th className="py-3.5 pr-5 text-right">Workstation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredDrivers.map((d) => {
                const score = d.overall_safety_score ?? 100;
                const risk =
                  score >= 80 ? "LOW" : score >= 60 ? "MEDIUM" : score >= 40 ? "HIGH" : "CRITICAL";
                const vehicle = driverVehicleMap.get(d.id);
                const isCrit = risk === "CRITICAL" || score < 40;

                return (
                  <tr
                    key={d.id}
                    onClick={() => handleSelectDriver(d.id)}
                    className={clsx(
                      "hover:bg-[#16253B]/70 transition-all cursor-pointer group",
                      isCrit && "bg-rose-950/15 hover:bg-rose-950/30"
                    )}
                  >
                    <td className="py-4 pl-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#0B0F19] border border-slate-700 flex items-center justify-center text-blue-400 shrink-0 shadow-sm group-hover:border-cyan-500 transition-colors">
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-white group-hover:text-cyan-400 transition-colors text-sm font-sans">
                            {d.name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            CDL: {d.license_number} · {d.phone || "No phone"}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4">
                      <StatusBadge status={d.status} size="sm" />
                    </td>

                    <td className="py-4 font-mono text-xs">
                      {vehicle ? (
                        <div className="flex items-center gap-1.5 text-slate-200">
                          <Truck className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="font-bold text-cyan-400">{vehicle.name}</span>
                          <span className="text-slate-500">({vehicle.license_plate})</span>
                        </div>
                      ) : (
                        <span className="text-slate-500">Unassigned</span>
                      )}
                    </td>

                    <td className="py-4">
                      <div className="w-36 space-y-1.5 font-mono text-xs">
                        <div className="flex items-center justify-between">
                          <span
                            className={clsx(
                              "font-bold",
                              score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-rose-400"
                            )}
                          >
                            {score.toFixed(1)} / 100
                          </span>
                        </div>
                        <div className="w-full bg-[#0B0F19] h-2 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className={clsx(
                              "h-full rounded-full transition-all",
                              score >= 80 ? "bg-emerald-400" : score >= 60 ? "bg-amber-400" : "bg-rose-500"
                            )}
                            style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-4">
                      <SeverityBadge severity={risk} size="sm" />
                    </td>

                    <td className="py-4 font-mono text-xs text-slate-300 font-bold">
                      {(d.total_distance_km || 0).toLocaleString()} km
                    </td>

                    <td className="py-4 pr-5 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          handleSelectDriver(d.id);
                        }}
                        leftIcon={<Eye className="w-3.5 h-3.5 text-cyan-400" />}
                        className="bg-[#16253B] border-slate-700 text-white hover:bg-blue-600 hover:border-blue-500 transition-all text-xs font-semibold"
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
