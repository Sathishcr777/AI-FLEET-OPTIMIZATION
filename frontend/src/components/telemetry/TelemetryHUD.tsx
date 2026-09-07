import React, { useState } from "react";
import { GaugeCluster } from "./GaugeCluster";
import { TelemetryTrendMiniChart } from "./TelemetryTrendMiniChart";
import { VehicleSensorComparison } from "./VehicleSensorComparison";
import { Card } from "../common/Card";
import { Badge } from "../common/Badge";
import { StatusBadge } from "../common/StatusBadge";
import { LiveStatusBadge } from "../common/LiveStatusBadge";
import { Vehicle } from "../../types/api";
import { TelemetryPayload } from "../../types/telemetry";
import { useTelemetryStore } from "../../hooks/useTelemetryStore";
import { Battery, Compass, Fuel, Gauge, ShieldAlert, LineChart, LayoutGrid, Sliders } from "lucide-react";
import { clsx } from "clsx";

const EMPTY_HISTORY: TelemetryPayload[] = [];

export interface TelemetryHUDProps {
  vehicle?: Vehicle | null;
  telemetry?: TelemetryPayload | null;
  history?: TelemetryPayload[];
  lastUpdated?: number | null;
  activeScenario?: string | null;
  onOpenSimulator?: () => void;
  className?: string;
}

export const TelemetryHUD: React.FC<TelemetryHUDProps> = ({
  vehicle,
  telemetry,
  history: propHistory,
  lastUpdated,
  activeScenario,
  onOpenSimulator,
  className,
}) => {
  const [viewMode, setViewMode] = useState<"gauges" | "trend" | "ranges">("gauges");
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Retrieve recent telemetry history buffer with stable fallback reference
  const vehicleId = vehicle?.id;
  const storeHistory = useTelemetryStore((s) =>
    vehicleId ? s.vehicles[vehicleId]?.history ?? EMPTY_HISTORY : EMPTY_HISTORY
  );
  const history = propHistory ?? storeHistory;

  if (!vehicle) {
    return (
      <Card className={clsx("p-8 text-center text-slate-500 border-dashed border-slate-800 bg-[#111C2D]", className)}>
        <p className="text-sm font-sans">Select a vehicle from the fleet roster or map to inspect real-time telematics.</p>
      </Card>
    );
  }

  // Persistent fallback to prevent temporary blanking between telemetry frames
  const effectiveTelemetry = telemetry ?? history[history.length - 1] ?? null;
  const fuel = effectiveTelemetry?.fuel_level_pct ?? 75.0;
  const battery = effectiveTelemetry?.battery_voltage ?? 13.4;
  const tire = effectiveTelemetry?.tire_pressure_psi ?? 34.0;
  const isAnomaly = Boolean(effectiveTelemetry?.is_anomaly);

  // Tire status
  const tireStatus = tire < 26.0 ? "CRITICAL" : tire < 30.0 || tire > 38.0 ? "WARNING" : "GOOD";
  // Battery status
  const batteryStatus = battery < 11.5 || battery > 15.0 ? "CRITICAL" : battery < 12.2 ? "WARNING" : "GOOD";
  // Fuel status
  const fuelStatus = fuel < 15.0 ? "CRITICAL" : fuel < 25.0 ? "WARNING" : "GOOD";

  return (
    <Card
      variant={isAnomaly ? "criticalGlow" : "default"}
      className={clsx("space-y-4 shadow-2xl select-none bg-[#111C2D] border-slate-800", className)}
      header={
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-glow-sm animate-pulse" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white tracking-tight text-base font-sans">{vehicle.name}</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-[#0B0F19] text-cyan-400 border border-slate-700 font-bold">
                {vehicle.license_plate}
              </span>
              <StatusBadge status={vehicle.health_status || "GOOD"} size="sm" />
            </div>
            <p className="text-xs font-mono text-slate-400 mt-0.5">
              VIN: {vehicle.vin} · Type: {vehicle.vehicle_type}
            </p>
          </div>
        </div>
      }
      headerAction={
        <div className="flex items-center gap-2.5">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#0B0F19] p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("gauges")}
              className={clsx(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer font-mono",
                viewMode === "gauges"
                  ? "bg-blue-600 text-white shadow-glow-sm font-bold"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Gauges</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("trend")}
              className={clsx(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer font-mono",
                viewMode === "trend"
                  ? "bg-blue-600 text-white shadow-glow-sm font-bold"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <LineChart className="w-3.5 h-3.5 text-cyan-400" />
              <span>Trend</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("ranges")}
              className={clsx(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer font-mono",
                viewMode === "ranges"
                  ? "bg-blue-600 text-white shadow-glow-sm font-bold"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <span>Safe Ranges</span>
            </button>
          </div>

          <LiveStatusBadge
            isLive={true}
            isPaused={isPaused}
            onTogglePause={() => setIsPaused((p) => !p)}
            lastUpdated={lastUpdated}
          />

          {activeScenario ? (
            <Badge variant="warning" size="sm" dot>
              {activeScenario}
            </Badge>
          ) : (
            <Badge variant="success" size="sm" dot>
              NOMINAL
            </Badge>
          )}
        </div>
      }
    >
      {/* Critical Anomaly Banner */}
      {isAnomaly && (
        <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-center justify-between text-xs text-rose-300 font-sans shadow-glow-crimson">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-semibold">Telemetry Anomaly detected across active powertrain sensors.</span>
          </div>
          {onOpenSimulator && (
            <button
              type="button"
              onClick={onOpenSimulator}
              className="text-cyan-400 hover:text-cyan-300 font-bold text-xs cursor-pointer underline"
            >
              Simulator Controls
            </button>
          )}
        </div>
      )}

      {/* Main Viewport: Gauges vs Recent Trend vs Target Ranges */}
      {viewMode === "gauges" ? (
        <GaugeCluster telemetry={effectiveTelemetry} />
      ) : viewMode === "trend" ? (
        <div className="p-3.5 rounded-2xl bg-[#0B0F19] border border-slate-800">
          <TelemetryTrendMiniChart
            history={history}
            height={160}
            showMetricSelector={true}
            showStats={true}
          />
        </div>
      ) : (
        <VehicleSensorComparison
          vehicle={vehicle}
          telemetry={effectiveTelemetry}
        />
      )}

      {/* Auxiliary Sensor Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-3.5 border-t border-slate-800 text-xs">
        {/* Fuel Level */}
        <div className="p-3.5 rounded-xl bg-[#0B0F19] border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Fuel className="w-3.5 h-3.5 text-amber-400" /> Fuel
            </span>
            <span className="font-mono font-bold text-white text-sm">{fuel.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-[#16253B] h-2 rounded-full overflow-hidden border border-slate-800">
            <div
              className={clsx(
                "h-full rounded-full transition-all duration-300",
                fuelStatus === "CRITICAL"
                  ? "bg-rose-500 shadow-glow-crimson"
                  : fuelStatus === "WARNING"
                  ? "bg-amber-400 shadow-glow-amber"
                  : "bg-emerald-400 shadow-glow-emerald"
              )}
              style={{ width: `${Math.min(100, Math.max(0, fuel))}%` }}
            />
          </div>
        </div>

        {/* Tire Pressure */}
        <div className="p-3.5 rounded-xl bg-[#0B0F19] border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" /> Tires
            </span>
            <span
              className={clsx(
                "font-mono font-bold text-sm",
                tireStatus === "CRITICAL"
                  ? "text-rose-400"
                  : tireStatus === "WARNING"
                  ? "text-amber-400"
                  : "text-white"
              )}
            >
              {tire.toFixed(1)} PSI
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono">Target: 30-38 PSI</p>
        </div>

        {/* Battery Voltage */}
        <div className="p-3.5 rounded-xl bg-[#0B0F19] border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Battery className="w-3.5 h-3.5 text-emerald-400" /> Battery
            </span>
            <span
              className={clsx(
                "font-mono font-bold text-sm",
                batteryStatus === "CRITICAL"
                  ? "text-rose-400"
                  : batteryStatus === "WARNING"
                  ? "text-amber-400"
                  : "text-white"
              )}
            >
              {battery.toFixed(2)} V
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono">Alt: 12.0-14.8 V</p>
        </div>

        {/* GPS & Heading */}
        <div className="p-3.5 rounded-xl bg-[#0B0F19] border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Compass className="w-3.5 h-3.5 text-blue-400" /> Heading
            </span>
            <span className="font-mono font-bold text-cyan-400 text-sm">
              {(telemetry?.heading_deg ?? 0).toFixed(0)}°
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono truncate">
            {telemetry?.latitude ? `${telemetry.latitude.toFixed(3)}, ${telemetry.longitude.toFixed(3)}` : "GPS Locked"}
          </p>
        </div>
      </div>
    </Card>
  );
};

