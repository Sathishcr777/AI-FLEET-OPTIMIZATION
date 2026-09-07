import React, { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { routesApi } from "../api/routes";
import { vehiclesApi } from "../api/vehicles";
import { driversApi } from "../api/drivers";
import {
  Waypoint,
  OptimizationGoal,
  RouteOptimizeRequest,
  RouteOptimizeResponse,
  RouteRead,
} from "../types/routes";
import { MissionConfigPanel } from "../components/routes/MissionConfigPanel";
import { RouteMap } from "../components/routes/RouteMap";
import { OptimizationResultPanel } from "../components/routes/OptimizationResultPanel";
import { SavedRoutesDrawer } from "../components/routes/SavedRoutesDrawer";
import { ScenarioDrawer } from "../components/layout/ScenarioDrawer";
import { Button } from "../components/common/Button";
import { Badge } from "../components/common/Badge";
import {
  Route as RouteIcon,
  Bookmark,
  Zap,
  AlertCircle,
} from "lucide-react";

// Preset Demo Mission Definitions
const PRESETS: Record<
  "sf_downtown" | "east_bay" | "silicon_valley",
  { name: string; origin: Waypoint; stops: Waypoint[]; destination: Waypoint }
> = {
  sf_downtown: {
    name: "SF Downtown Courier Loop",
    origin: {
      name: "Mission Bay Logistics Hub",
      latitude: 37.7749,
      longitude: -122.4194,
    },
    destination: {
      name: "Mission Bay Logistics Hub (Return)",
      latitude: 37.7749,
      longitude: -122.4194,
    },
    stops: [
      { name: "Financial District Drop", latitude: 37.7946, longitude: -122.4005 },
      { name: "Fisherman's Wharf Hub", latitude: 37.808, longitude: -122.4177 },
      { name: "Presidio Distribution", latitude: 37.7989, longitude: -122.4662 },
      { name: "SoMa Commercial Center", latitude: 37.7785, longitude: -122.4056 },
    ],
  },
  east_bay: {
    name: "East Bay Logistics Express",
    origin: {
      name: "Port of Oakland Depot",
      latitude: 37.8044,
      longitude: -122.2712,
    },
    destination: {
      name: "Port of Oakland Depot (Return)",
      latitude: 37.8044,
      longitude: -122.2712,
    },
    stops: [
      { name: "Berkeley Marina Cargo", latitude: 37.8688, longitude: -122.3138 },
      { name: "Emeryville Commerce", latitude: 37.8313, longitude: -122.2852 },
      { name: "Alameda Naval Center", latitude: 37.7652, longitude: -122.2416 },
      { name: "San Leandro Industrial", latitude: 37.7249, longitude: -122.1561 },
      { name: "Hayward Gateway", latitude: 37.6688, longitude: -122.0808 },
    ],
  },
  silicon_valley: {
    name: "Silicon Valley Corridor Dispatch",
    origin: {
      name: "SF Distribution Hub",
      latitude: 37.7749,
      longitude: -122.4194,
    },
    destination: {
      name: "SF Distribution Hub (Return)",
      latitude: 37.7749,
      longitude: -122.4194,
    },
    stops: [
      { name: "San Mateo Station", latitude: 37.563, longitude: -122.3255 },
      { name: "Redwood City Yard", latitude: 37.4852, longitude: -122.2364 },
      { name: "Palo Alto Tech Hub", latitude: 37.4419, longitude: -122.143 },
      { name: "Mountain View Depot", latitude: 37.3861, longitude: -122.0839 },
      { name: "Sunnyvale Distribution", latitude: 37.3688, longitude: -122.0363 },
      { name: "San Jose Terminal", latitude: 37.3382, longitude: -121.8863 },
    ],
  },
};

export const RouteOptimizerPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Drawers State
  const [savedRoutesDrawerOpen, setSavedRoutesDrawerOpen] = useState(false);
  const [scenarioDrawerOpen, setScenarioDrawerOpen] = useState(false);

  // Mission Configuration State
  const [missionName, setMissionName] = useState("SF Downtown Courier Loop");
  const [origin, setOrigin] = useState<Waypoint>(PRESETS.sf_downtown.origin);
  const [destination, setDestination] = useState<Waypoint | null>(PRESETS.sf_downtown.destination);
  const [isRoundTrip, setIsRoundTrip] = useState(true);
  const [stops, setStops] = useState<Waypoint[]>(PRESETS.sf_downtown.stops);
  const [optimizationGoal, setOptimizationGoal] = useState<OptimizationGoal>("DISTANCE");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [saveToDatabase, setSaveToDatabase] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Optimization Result State
  const [optimizationResult, setOptimizationResult] = useState<RouteOptimizeResponse | null>(null);

  // 1. Fetch Fleet Vehicles for Asset Assignment
  const { data: vehiclesData } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => vehiclesApi.list({ limit: 100 }),
  });

  // 2. Fetch Fleet Drivers
  const { data: driversData } = useQuery({
    queryKey: ["drivers"],
    queryFn: () => driversApi.list({ limit: 100 }),
  });

  const vehicles = useMemo(() => vehiclesData?.vehicles || [], [vehiclesData?.vehicles]);
  const drivers = useMemo(() => driversData || [], [driversData]);

  // Find assigned vehicle and driver
  const assignedVehicle = vehicles.find((v) => v.id === selectedVehicleId) || null;
  const assignedDriver = assignedVehicle?.assigned_driver_id
    ? drivers.find((d) => d.id === assignedVehicle.assigned_driver_id) || null
    : null;

  // Optimize Mutation
  const optimizeMutation = useMutation({
    mutationFn: (payload: RouteOptimizeRequest) => routesApi.optimize(payload),
    onSuccess: (data) => {
      setOptimizationResult(data);
      setValidationError(null);
      if (saveToDatabase) {
        queryClient.invalidateQueries({ queryKey: ["saved-routes"] });
      }
    },
    onError: (err: Error) => {
      setValidationError(err.message || "Route optimization failed on the backend.");
    },
  });

  // Handle Preset Loading
  const handleLoadPreset = (presetKey: "sf_downtown" | "east_bay" | "silicon_valley") => {
    const preset = PRESETS[presetKey];
    setMissionName(preset.name);
    setOrigin(preset.origin);
    setDestination(preset.destination);
    setIsRoundTrip(true);
    setStops(preset.stops);
    setOptimizationResult(null);
    setValidationError(null);
  };

  // Handle Optimization Execution
  const handleOptimize = useCallback(() => {
    // Basic frontend validation
    if (!origin.name || isNaN(origin.latitude) || isNaN(origin.longitude)) {
      setValidationError("Invalid origin depot coordinates.");
      return;
    }
    if (origin.latitude < -90 || origin.latitude > 90 || origin.longitude < -180 || origin.longitude > 180) {
      setValidationError("Origin coordinates outside valid geographic range (-90..90, -180..180).");
      return;
    }
    if (stops.length === 0) {
      setValidationError("Please configure at least 1 delivery stop to optimize.");
      return;
    }
    for (let i = 0; i < stops.length; i++) {
      const s = stops[i];
      if (isNaN(s.latitude) || isNaN(s.longitude) || s.latitude < -90 || s.latitude > 90 || s.longitude < -180 || s.longitude > 180) {
        setValidationError(`Stop #${i + 1} (${s.name}) has invalid geographic coordinates.`);
        return;
      }
    }

    setValidationError(null);

    const payload: RouteOptimizeRequest = {
      name: missionName,
      origin: origin,
      destination: isRoundTrip ? origin : destination,
      stops: stops,
      vehicle_id: selectedVehicleId,
      optimization_goal: optimizationGoal,
      save_to_database: saveToDatabase,
    };

    optimizeMutation.mutate(payload);
  }, [
    missionName,
    origin,
    destination,
    isRoundTrip,
    stops,
    selectedVehicleId,
    optimizationGoal,
    saveToDatabase,
    optimizeMutation,
  ]);

  // Handle Reset to Default
  const handleReset = () => {
    handleLoadPreset("sf_downtown");
    setSelectedVehicleId(null);
    setSaveToDatabase(false);
  };

  // Handle Loading a Saved Route from Backend
  const handleSelectSavedRoute = (saved: RouteRead) => {
    setMissionName(saved.name);
    setOrigin({
      name: "Depot Origin",
      latitude: saved.origin_lat,
      longitude: saved.origin_lon,
    });
    setDestination({
      name: "Final Destination",
      latitude: saved.dest_lat,
      longitude: saved.dest_lon,
    });
    const extractedStops: Waypoint[] = (saved.waypoints || []).map((w, idx) => ({
      name: (w.name as string) || `Stop #${idx + 1}`,
      latitude: Number(w.latitude) || 0,
      longitude: Number(w.longitude) || 0,
    }));
    setStops(extractedStops);
    setValidationError(null);
  };

  return (
    <div className="w-full max-w-[1920px] mx-auto space-y-6 pb-12 select-none">
      {/* ==================================================
          TOP COMMAND HEADER
          ================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/90 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-glowCyan">
              <RouteIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-sans">
                  Mission Dispatch & Route Optimizer
                </h1>
                <Badge variant="brand" size="md" className="font-mono text-xs">
                  2-OPT TSP ENGINE
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5 font-sans">
                Traveling salesperson optimization, comparative carbon/distance savings analysis, and dispatch routing.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            size="md"
            variant="secondary"
            onClick={() => setSavedRoutesDrawerOpen(true)}
            leftIcon={<Bookmark className="w-4 h-4 text-cyan-400" />}
            className="bg-[#111C2D] border-slate-700 hover:bg-[#16253B] text-white shadow-card font-semibold"
          >
            Saved Missions
          </Button>

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

      {/* Validation Error Banner */}
      {validationError && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/50 flex items-center gap-3 text-xs sm:text-sm font-sans text-rose-300 shadow-glowCritical animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{validationError}</span>
        </div>
      )}

      {/* ==================================================
          3-COLUMN RESPONSIVE WORKSTATION GRID
          ================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Mission Setup (4 cols) */}
        <div className="lg:col-span-4 flex flex-col">
          <MissionConfigPanel
            missionName={missionName}
            setMissionName={setMissionName}
            origin={origin}
            setOrigin={setOrigin}
            destination={destination}
            setDestination={setDestination}
            isRoundTrip={isRoundTrip}
            setIsRoundTrip={setIsRoundTrip}
            stops={stops}
            setStops={setStops}
            optimizationGoal={optimizationGoal}
            setOptimizationGoal={setOptimizationGoal}
            selectedVehicleId={selectedVehicleId}
            setSelectedVehicleId={setSelectedVehicleId}
            vehicles={vehicles}
            drivers={drivers}
            saveToDatabase={saveToDatabase}
            setSaveToDatabase={setSaveToDatabase}
            onOptimize={handleOptimize}
            onReset={handleReset}
            onLoadPreset={handleLoadPreset}
            isOptimizing={optimizeMutation.isPending}
          />
        </div>

        {/* Center Column: Interactive Route Map (5 cols) */}
        <div className="lg:col-span-5 flex flex-col">
          <RouteMap
            origin={origin}
            destination={isRoundTrip ? origin : destination}
            stops={stops}
            optimizationResult={optimizationResult}
            showOriginalPath={true}
            className="h-[540px] lg:h-[640px] rounded-2xl shadow-2xl border border-slate-800"
          />
        </div>

        {/* Right Column: Optimization Manifest & Scorecard (3 cols) */}
        <div className="lg:col-span-3 flex flex-col">
          <OptimizationResultPanel
            result={optimizationResult}
            assignedVehicle={assignedVehicle}
            assignedDriver={assignedDriver}
          />
        </div>
      </div>

      {/* Saved Routes Slide-over Drawer */}
      <SavedRoutesDrawer
        open={savedRoutesDrawerOpen}
        onOpenChange={setSavedRoutesDrawerOpen}
        onSelectRoute={handleSelectSavedRoute}
      />

      {/* Scenario Injection Drawer */}
      <ScenarioDrawer
        open={scenarioDrawerOpen}
        onOpenChange={setScenarioDrawerOpen}
        vehicles={vehicles}
      />
    </div>
  );
};
