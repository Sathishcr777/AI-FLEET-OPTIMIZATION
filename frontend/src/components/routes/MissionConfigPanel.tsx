import React from "react";
import { Card } from "../common/Card";
import { Button } from "../common/Button";
import { Badge } from "../common/Badge";
import { Waypoint, OptimizationGoal } from "../../types/routes";
import { Vehicle, Driver } from "../../types/api";
import { WaypointItem } from "./WaypointItem";
import {
  Navigation,
  Plus,
  RotateCcw,
  Sparkles,
  Truck,
  User,
  Database,
  Compass,
} from "lucide-react";
import { clsx } from "clsx";

export interface MissionConfigPanelProps {
  missionName: string;
  setMissionName: (name: string) => void;
  origin: Waypoint;
  setOrigin: (origin: Waypoint) => void;
  destination: Waypoint | null;
  setDestination: (dest: Waypoint | null) => void;
  isRoundTrip: boolean;
  setIsRoundTrip: (round: boolean) => void;
  stops: Waypoint[];
  setStops: React.Dispatch<React.SetStateAction<Waypoint[]>>;
  optimizationGoal: OptimizationGoal;
  setOptimizationGoal: (goal: OptimizationGoal) => void;
  selectedVehicleId: string | null;
  setSelectedVehicleId: (id: string | null) => void;
  vehicles: Vehicle[];
  drivers: Driver[];
  saveToDatabase: boolean;
  setSaveToDatabase: (save: boolean) => void;
  onOptimize: () => void;
  onReset: () => void;
  onLoadPreset: (presetKey: "sf_downtown" | "east_bay" | "silicon_valley") => void;
  isOptimizing: boolean;
  className?: string;
}

export const MissionConfigPanel: React.FC<MissionConfigPanelProps> = ({
  missionName,
  setMissionName,
  origin,
  setOrigin,
  destination,
  setDestination,
  isRoundTrip,
  setIsRoundTrip,
  stops,
  setStops,
  optimizationGoal,
  setOptimizationGoal,
  selectedVehicleId,
  setSelectedVehicleId,
  vehicles,
  drivers,
  saveToDatabase,
  setSaveToDatabase,
  onOptimize,
  onReset,
  onLoadPreset,
  isOptimizing,
  className,
}) => {
  const handleAddStop = () => {
    const lastStop = stops[stops.length - 1] || origin;
    const newStop: Waypoint = {
      name: `Delivery Stop #${stops.length + 1}`,
      latitude: Number((lastStop.latitude + (Math.random() - 0.5) * 0.04).toFixed(4)),
      longitude: Number((lastStop.longitude + (Math.random() - 0.5) * 0.04).toFixed(4)),
    };
    setStops([...stops, newStop]);
  };

  const handleUpdateStop = (index: number, updated: Waypoint) => {
    const updatedStops = [...stops];
    updatedStops[index] = updated;
    setStops(updatedStops);
  };

  const handleRemoveStop = (index: number) => {
    setStops(stops.filter((_, i) => i !== index));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...stops];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    setStops(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === stops.length - 1) return;
    const updated = [...stops];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    setStops(updated);
  };

  // Find assigned driver for selected vehicle
  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
  const assignedDriver = selectedVehicle?.assigned_driver_id
    ? drivers.find((d) => d.id === selectedVehicle.assigned_driver_id)
    : null;

  return (
    <Card
      className={clsx("flex flex-col select-none shadow-card", className)}
      header={
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-sm text-slate-900 font-sans">Mission Setup & Parameters</span>
        </div>
      }
      headerAction={
        <Button size="sm" variant="ghost" onClick={onReset} leftIcon={<RotateCcw className="w-3.5 h-3.5" />}>
          Reset
        </Button>
      }
      bodyClassName="p-4 space-y-4 flex-1 overflow-y-auto"
    >
      {/* Preset Mission Profiles Selector */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-sans uppercase text-slate-500 font-semibold block">
          Mission Presets
        </label>
        <div className="grid grid-cols-3 gap-2 font-sans text-xs">
          <button
            type="button"
            onClick={() => onLoadPreset("sf_downtown")}
            className="px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-200 hover:border-blue-500/50 text-slate-700 hover:text-slate-900 text-xs font-medium transition-colors text-center truncate shadow-sm"
          >
            SF Loop (4)
          </button>
          <button
            type="button"
            onClick={() => onLoadPreset("east_bay")}
            className="px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-200 hover:border-blue-500/50 text-slate-700 hover:text-slate-900 text-xs font-medium transition-colors text-center truncate shadow-sm"
          >
            East Bay (5)
          </button>
          <button
            type="button"
            onClick={() => onLoadPreset("silicon_valley")}
            className="px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-200 hover:border-blue-500/50 text-slate-700 hover:text-slate-900 text-xs font-medium transition-colors text-center truncate shadow-sm"
          >
            Silicon Valley (6)
          </button>
        </div>
      </div>

      {/* Mission Title */}
      <div className="space-y-1">
        <label className="text-[10px] font-sans uppercase text-slate-500 font-semibold block">
          Mission Title
        </label>
        <input
          type="text"
          value={missionName}
          onChange={(e) => setMissionName(e.target.value)}
          placeholder="e.g. SF Logistics Delivery Express"
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs font-sans focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
        />
      </div>

      {/* Asset & Driver Pairings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div className="space-y-1">
          <label className="text-[10px] font-sans uppercase text-slate-500 font-semibold flex items-center gap-1">
            <Truck className="w-3.5 h-3.5 text-blue-600" />
            <span>Assigned Asset</span>
          </label>
          <select
            value={selectedVehicleId || ""}
            onChange={(e) => setSelectedVehicleId(e.target.value || null)}
            className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs font-sans focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          >
            <option value="">-- Select Asset --</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.license_plate})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-sans uppercase text-slate-500 font-semibold flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-emerald-600" />
            <span>Driver Context</span>
          </label>
          <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs font-sans truncate">
            {assignedDriver ? assignedDriver.name : "Unassigned"}
          </div>
        </div>
      </div>

      {/* Optimization Objective Selector */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-sans uppercase text-slate-500 font-semibold flex items-center gap-1">
          <Compass className="w-3.5 h-3.5 text-blue-600" />
          <span>Optimization Objective</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-sans text-xs">
          {(["DISTANCE", "TIME", "FUEL", "BALANCED"] as OptimizationGoal[]).map((goal) => (
            <button
              key={goal}
              type="button"
              onClick={() => setOptimizationGoal(goal)}
              className={clsx(
                "px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors text-center",
                optimizationGoal === goal
                  ? "bg-blue-50 border-blue-600 text-blue-700 shadow-sm"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              {goal}
            </button>
          ))}
        </div>
      </div>

      {/* Origin / Depot Configuration */}
      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 font-sans text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="font-semibold text-slate-900 text-xs">Origin Depot</span>
          </div>
          <Badge variant="success" size="sm">
            START
          </Badge>
        </div>
        <input
          type="text"
          value={origin.name}
          onChange={(e) => setOrigin({ ...origin, name: e.target.value })}
          placeholder="Depot Name"
          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
          <div>
            <label className="text-[10px] text-slate-500 uppercase font-sans font-semibold">Latitude</label>
            <input
              type="number"
              step="0.0001"
              value={origin.latitude}
              onChange={(e) => setOrigin({ ...origin, latitude: parseFloat(e.target.value) || 0 })}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs font-mono mt-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase font-sans font-semibold">Longitude</label>
            <input
              type="number"
              step="0.0001"
              value={origin.longitude}
              onChange={(e) => setOrigin({ ...origin, longitude: parseFloat(e.target.value) || 0 })}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs font-mono mt-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
      </div>

      {/* Destination / Round Trip Option */}
      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 font-sans text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
            <span className="font-semibold text-slate-900 text-xs">Destination</span>
          </div>
          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer font-medium">
            <input
              type="checkbox"
              checked={isRoundTrip}
              onChange={(e) => {
                setIsRoundTrip(e.target.checked);
                if (e.target.checked) {
                  setDestination({
                    name: `${origin.name} (Return)`,
                    latitude: origin.latitude,
                    longitude: origin.longitude,
                  });
                }
              }}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Round Trip to Depot</span>
          </label>
        </div>

        {!isRoundTrip && (
          <>
            <input
              type="text"
              value={destination?.name || ""}
              onChange={(e) =>
                setDestination(
                  destination
                    ? { ...destination, name: e.target.value }
                    : { name: e.target.value, latitude: origin.latitude, longitude: origin.longitude }
                )
              }
              placeholder="Final Destination Name"
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-sans font-semibold">Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={destination?.latitude ?? origin.latitude}
                  onChange={(e) =>
                    setDestination(
                      destination
                        ? { ...destination, latitude: parseFloat(e.target.value) || 0 }
                        : { name: "Destination", latitude: parseFloat(e.target.value) || 0, longitude: origin.longitude }
                    )
                  }
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs font-mono mt-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-sans font-semibold">Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={destination?.longitude ?? origin.longitude}
                  onChange={(e) =>
                    setDestination(
                      destination
                        ? { ...destination, longitude: parseFloat(e.target.value) || 0 }
                        : { name: "Destination", latitude: origin.latitude, longitude: parseFloat(e.target.value) || 0 }
                    )
                  }
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs font-mono mt-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Waypoints Stops List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-sans uppercase text-slate-500 font-semibold">
            Delivery Stops ({stops.length})
          </span>
          <Button size="sm" variant="secondary" onClick={handleAddStop} leftIcon={<Plus className="w-3 h-3" />}>
            Add Stop
          </Button>
        </div>

        <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
          {stops.map((stop, index) => (
            <WaypointItem
              key={index}
              waypoint={stop}
              index={index}
              totalCount={stops.length}
              onChange={handleUpdateStop}
              onRemove={handleRemoveStop}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
            />
          ))}
        </div>
      </div>

      {/* Save to Database Option */}
      <div className="pt-3 border-t border-slate-200 flex items-center justify-between font-sans text-xs">
        <label className="flex items-center gap-2 cursor-pointer text-slate-700 text-xs font-medium">
          <input
            type="checkbox"
            checked={saveToDatabase}
            onChange={(e) => setSaveToDatabase(e.target.checked)}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span>Persist to Database History</span>
        </label>
        <Database className="w-3.5 h-3.5 text-slate-400" />
      </div>

      {/* Action Button: Optimize Route */}
      <Button
        size="md"
        variant="primary"
        onClick={onOptimize}
        disabled={isOptimizing}
        isLoading={isOptimizing}
        leftIcon={<Sparkles className="w-4 h-4 text-white" />}
        className="w-full font-bold shadow-md"
      >
        {isOptimizing ? "Computing 2-Opt TSP Sequence..." : "Optimize Mission Route"}
      </Button>
    </Card>
  );
};
