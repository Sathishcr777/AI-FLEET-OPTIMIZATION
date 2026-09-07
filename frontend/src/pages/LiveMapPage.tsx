import React, { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { vehiclesApi } from "../api/vehicles";
import { telemetryApi } from "../api/telemetry";
import { scenariosApi } from "../api/scenarios";
import { useTelemetryStore } from "../hooks/useTelemetryStore";
import { FleetMap } from "../components/map/FleetMap";
import { TelemetryHUD } from "../components/telemetry/TelemetryHUD";
import { VehicleSelector } from "../components/telemetry/VehicleSelector";
import { ScenarioDrawer } from "../components/layout/ScenarioDrawer";
import { Skeleton } from "../components/common/Skeleton";
import { ErrorState } from "../components/common/ErrorState";
import { Button } from "../components/common/Button";
import { Badge } from "../components/common/Badge";
import { TelemetryPayload } from "../types/telemetry";
import { Zap, Radio } from "lucide-react";

const EMPTY_HISTORY: TelemetryPayload[] = [];

export const LiveMapPage: React.FC = () => {
  const [scenarioDrawerOpen, setScenarioDrawerOpen] = useState(false);

  // Zustand Store
  const telemetryMap = useTelemetryStore((s) => s.vehicles);
  const selectedVehicleId = useTelemetryStore((s) => s.selectedVehicleId);
  const setSelectedVehicleId = useTelemetryStore((s) => s.setSelectedVehicleId);
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

  const vehicles = useMemo(() => vehiclesData?.vehicles || [], [vehiclesData?.vehicles]);

  // 2. Fetch Active Scenarios
  const { data: scenariosData } = useQuery({
    queryKey: ["scenarios"],
    queryFn: () => scenariosApi.getStatus(),
    refetchInterval: 3000,
  });

  // 3. Load initial latest telemetry snapshot on mount
  useEffect(() => {
    telemetryApi
      .getLatestFleet()
      .then((fleetMap) => {
        if (fleetMap && Object.keys(fleetMap).length > 0) {
          updateBatchTelemetry(fleetMap);
        }
      })
      .catch(() => {
        // Handled silently; websocket will populate updates
      });
  }, [updateBatchTelemetry]);

  // Set default selected vehicle if none selected
  useEffect(() => {
    if (!selectedVehicleId && vehicles.length > 0) {
      setSelectedVehicleId(vehicles[0].id);
    }
  }, [selectedVehicleId, vehicles, setSelectedVehicleId]);

  const selectedVehicle = useMemo(() => {
    return vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0] || null;
  }, [vehicles, selectedVehicleId]);

  const selectedVehicleData = selectedVehicleId ? telemetryMap[selectedVehicleId] : undefined;
  const selectedTelemetry = selectedVehicleData?.latest || null;
  const selectedHistory = selectedVehicleData?.history || EMPTY_HISTORY;
  const selectedLastUpdated = selectedVehicleData?.lastUpdated || null;

  // Find active scenario for selected vehicle
  const activeScenario = selectedVehicleId && scenariosData?.active_scenarios?.[selectedVehicleId]
    ? scenariosData.active_scenarios[selectedVehicleId].scenario
    : null;

  if (isLoadingVehicles) {
    return (
      <div className="space-y-4 h-full flex flex-col">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1">
          <Skeleton className="h-full rounded-xl" />
          <Skeleton className="lg:col-span-3 h-full rounded-xl" />
        </div>
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

  return (
    <div className="w-full max-w-[1920px] mx-auto space-y-6 pb-12">
      {/* Top Map Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <Radio className="w-6 h-6 text-cyan-400 animate-pulse" />
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5 font-sans">
              <span>Live Fleet Operations Map</span>
              <Badge variant="brand" size="md">
                {vehicles.length} ASSETS
              </Badge>
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1 font-sans">
            Real-time geospatial tracking, vector heading orientation, and instant telematics diagnostics.
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

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Fleet Roster Selector (4 cols) */}
        <div className="lg:col-span-4 flex flex-col">
          <VehicleSelector
            vehicles={vehicles}
            telemetryMap={telemetryMap}
            selectedVehicleId={selectedVehicleId}
            onSelectVehicle={(id) => setSelectedVehicleId(id)}
          />
        </div>

        {/* Right Column: Interactive Map & Live Telemetry HUD (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Leaflet Tactical Map Viewport */}
          <div className="h-[480px] lg:h-[540px] rounded-2xl overflow-hidden relative shadow-2xl border border-slate-800">
            <FleetMap
              vehicles={vehicles}
              telemetryMap={telemetryMap}
              selectedVehicleId={selectedVehicleId}
              onSelectVehicle={(id) => setSelectedVehicleId(id)}
            />
          </div>

          {/* Bottom Selected Vehicle Telemetry HUD & Gauge Cluster */}
          <div>
            <TelemetryHUD
              vehicle={selectedVehicle}
              telemetry={selectedTelemetry}
              history={selectedHistory}
              lastUpdated={selectedLastUpdated}
              activeScenario={activeScenario}
              onOpenSimulator={() => setScenarioDrawerOpen(true)}
            />
          </div>
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

