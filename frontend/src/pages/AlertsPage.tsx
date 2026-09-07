import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { alertsApi } from "../api/alerts";
import { vehiclesApi } from "../api/vehicles";
import { driversApi } from "../api/drivers";
import { Alert, AlertSummaryCounts } from "../types/alerts";
import { AlertKpiStrip } from "../components/alerts/AlertKpiStrip";
import { AlertVolumeTrendChart } from "../components/alerts/AlertVolumeTrendChart";
import { AlertFilters } from "../components/alerts/AlertFilters";
import { AlertQueue } from "../components/alerts/AlertQueue";
import { AlertInvestigationPanel } from "../components/alerts/AlertInvestigationPanel";
import { ScenarioDrawer } from "../components/layout/ScenarioDrawer";
import { Button } from "../components/common/Button";
import { Badge } from "../components/common/Badge";
import { Skeleton } from "../components/common/Skeleton";
import { ErrorState } from "../components/common/ErrorState";
import { ShieldAlert, Zap } from "lucide-react";

export const AlertsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedAlertIdFromUrl = searchParams.get("id");

  // Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [alertTypeFilter, setAlertTypeFilter] = useState("ALL");
  const [vehicleFilter, setVehicleFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "severity">("newest");
  const [scenarioDrawerOpen, setScenarioDrawerOpen] = useState(false);

  // Selected Alert State
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(selectedAlertIdFromUrl);

  // Synchronize URL param with state
  useEffect(() => {
    if (selectedAlertIdFromUrl) {
      setSelectedAlertId(selectedAlertIdFromUrl);
    }
  }, [selectedAlertIdFromUrl]);

  // 1. Fetch Alerts List & Summary Counts from Backend
  const {
    data: alertsData,
    isLoading: isLoadingAlerts,
    isError: isAlertsError,
    refetch: refetchAlerts,
  } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => alertsApi.list({ limit: 200 }),
    refetchInterval: 4000,
  });

  // 2. Fetch Fleet Vehicles for context & filtering
  const { data: vehiclesData } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => vehiclesApi.list({ limit: 100 }),
  });

  // 3. Fetch Fleet Drivers
  const { data: driversData } = useQuery({
    queryKey: ["drivers"],
    queryFn: () => driversApi.list({ limit: 100 }),
  });

  const rawAlerts = useMemo(() => alertsData?.alerts || [], [alertsData?.alerts]);
  const summary: AlertSummaryCounts = useMemo(() => {
    return (
      alertsData?.summary || {
        total: rawAlerts.length,
        active: rawAlerts.filter((a) => a.status === "ACTIVE").length,
        acknowledged: rawAlerts.filter((a) => a.status === "ACKNOWLEDGED").length,
        resolved: rawAlerts.filter((a) => a.status === "RESOLVED").length,
        critical: rawAlerts.filter((a) => a.severity === "CRITICAL").length,
        high: rawAlerts.filter((a) => a.severity === "HIGH").length,
        medium: rawAlerts.filter((a) => a.severity === "MEDIUM").length,
        low: rawAlerts.filter((a) => a.severity === "LOW" || a.severity === "INFO").length,
      }
    );
  }, [alertsData?.summary, rawAlerts]);

  const vehicles = useMemo(() => vehiclesData?.vehicles || [], [vehiclesData?.vehicles]);
  const drivers = useMemo(() => driversData || [], [driversData]);

  // Lookup maps
  const vehicleMap = useMemo(() => {
    const map = new Map<string, (typeof vehicles)[0]>();
    for (const v of vehicles) map.set(v.id, v);
    return map;
  }, [vehicles]);

  const driverMap = useMemo(() => {
    const map = new Map<string, (typeof drivers)[0]>();
    for (const d of drivers) map.set(d.id, d);
    return map;
  }, [drivers]);

  // Client-side Filtering of the loaded dataset
  const filteredAlerts = useMemo(() => {
    return rawAlerts.filter((alert) => {
      // 1. Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchTitle = alert.title.toLowerCase().includes(q);
        const matchMsg = alert.message.toLowerCase().includes(q);
        const matchId = alert.id.toLowerCase().includes(q);
        const matchType = alert.alert_type.toLowerCase().includes(q);
        if (!matchTitle && !matchMsg && !matchId && !matchType) return false;
      }

      // 2. Severity Filter
      if (severityFilter !== "ALL") {
        if (severityFilter === "LOW") {
          if (alert.severity !== "LOW" && alert.severity !== "INFO") return false;
        } else if (alert.severity !== severityFilter) {
          return false;
        }
      }

      // 3. Status Filter
      if (statusFilter !== "ALL" && alert.status !== statusFilter) {
        return false;
      }

      // 4. Alert Type Filter
      if (alertTypeFilter !== "ALL" && alert.alert_type !== alertTypeFilter) {
        return false;
      }

      // 5. Vehicle Filter
      if (vehicleFilter !== "ALL" && alert.vehicle_id !== vehicleFilter) {
        return false;
      }

      return true;
    });
  }, [rawAlerts, searchQuery, severityFilter, statusFilter, alertTypeFilter, vehicleFilter]);

  // Active Selected Alert Object
  const selectedAlert = useMemo(() => {
    if (!selectedAlertId) {
      return filteredAlerts[0] || null;
    }
    return rawAlerts.find((a) => a.id === selectedAlertId) || filteredAlerts[0] || null;
  }, [selectedAlertId, rawAlerts, filteredAlerts]);

  // Acknowledge Mutation
  const acknowledgeMutation = useMutation({
    mutationFn: (alertId: string) => alertsApi.acknowledge(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });

  // Resolve Mutation
  const resolveMutation = useMutation({
    mutationFn: ({ alertId, notes }: { alertId: string; notes?: string }) =>
      alertsApi.resolve(alertId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (alertId: string) => alertsApi.delete(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      if (selectedAlertId) {
        setSelectedAlertId(null);
      }
    },
  });

  const handleSelectAlert = (alert: Alert) => {
    setSelectedAlertId(alert.id);
    setSearchParams({ id: alert.id });
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSeverityFilter("ALL");
    setStatusFilter("ALL");
    setAlertTypeFilter("ALL");
    setVehicleFilter("ALL");
  };

  if (isLoadingAlerts && rawAlerts.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-80 rounded-xl" />
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (isAlertsError) {
    return (
      <ErrorState
        title="Failed to load fleet alerts"
        message="Could not retrieve active incident records from the alert engine."
        onRetry={() => refetchAlerts()}
      />
    );
  }

  const isActionPending =
    acknowledgeMutation.isPending || resolveMutation.isPending || deleteMutation.isPending;

  return (
    <div className="w-full max-w-[1920px] mx-auto space-y-6 pb-12 select-none">
      {/* ==================================================
          TOP COMMAND HEADER
          ================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/90 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-glowCritical">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-sans">
                  Alert Center & Incident Triage Command
                </h1>
                <Badge variant="critical" size="md" dot className="font-mono text-xs">
                  {summary.active} ACTIVE INCIDENTS
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5 font-sans">
                Real-time anomaly deduplication, multi-sensor threshold violations, operator escalation, and dispatch triage.
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
          REAL-TIME FLEET INCIDENT KPI STRIP
          ================================================== */}
      <AlertKpiStrip summary={summary} />

      {/* ==================================================
          INCIDENT CATEGORY DISTRIBUTION & VOLUME TREND CHART
          ================================================== */}
      <AlertVolumeTrendChart alerts={rawAlerts} height={240} />

      {/* ==================================================
          3-COLUMN TRIAGE WORKSTATION GRID
          ================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Triage Filters (3 cols) */}
        <div className="lg:col-span-3 flex flex-col">
          <AlertFilters
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            severityFilter={severityFilter}
            setSeverityFilter={setSeverityFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            alertTypeFilter={alertTypeFilter}
            setAlertTypeFilter={setAlertTypeFilter}
            vehicleFilter={vehicleFilter}
            setVehicleFilter={setVehicleFilter}
            vehicles={vehicles}
            onReset={handleResetFilters}
          />
        </div>

        {/* Center Column: Incident Queue Feed (5 cols) */}
        <div className="lg:col-span-5 flex flex-col">
          <AlertQueue
            alerts={filteredAlerts}
            vehicles={vehicles}
            drivers={drivers}
            selectedAlertId={selectedAlert?.id || null}
            onSelectAlert={handleSelectAlert}
            sortBy={sortBy}
            setSortBy={setSortBy}
            isLoading={isLoadingAlerts}
          />
        </div>

        {/* Right Column: Incident Investigation & Triage Panel (4 cols) */}
        <div className="lg:col-span-4 flex flex-col">
          <AlertInvestigationPanel
            alert={selectedAlert}
            vehicle={selectedAlert ? vehicleMap.get(selectedAlert.vehicle_id) : undefined}
            driver={selectedAlert?.driver_id ? driverMap.get(selectedAlert.driver_id) : undefined}
            onAcknowledge={(alertId) => acknowledgeMutation.mutate(alertId)}
            onResolve={(alertId, notes) => resolveMutation.mutate({ alertId, notes })}
            onDelete={(alertId) => deleteMutation.mutate(alertId)}
            isActionPending={isActionPending}
          />
        </div>
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
