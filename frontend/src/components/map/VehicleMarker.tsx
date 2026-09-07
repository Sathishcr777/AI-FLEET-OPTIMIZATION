import React from "react";
import { Marker, Tooltip, Popup } from "react-leaflet";
import { Link } from "react-router-dom";
import L from "leaflet";
import { Vehicle } from "../../types/api";
import { TelemetryPayload } from "../../types/telemetry";
import { StatusBadge } from "../common/StatusBadge";
import { Truck, Gauge, Battery, Thermometer, User, ExternalLink, Activity } from "lucide-react";
import { clsx } from "clsx";

export interface VehicleMarkerProps {
  vehicle: Vehicle;
  telemetry?: TelemetryPayload | null;
  isSelected?: boolean;
  onClick?: (vehicleId: string) => void;
  driverName?: string;
}

export const createVehicleDivIcon = (
  vehicle: Vehicle,
  telemetry: TelemetryPayload | null | undefined,
  isSelected: boolean
) => {
  const heading = telemetry?.heading_deg ?? 0;
  const isAnomaly = Boolean(telemetry?.is_anomaly);
  const health = vehicle.health_status || "GOOD";

  let statusColor = "#10B981"; // Emerald
  let ringGlow = "rgba(16, 185, 129, 0.45)";

  if (isAnomaly || health === "CRITICAL") {
    statusColor = "#EF4444"; // Crimson
    ringGlow = "rgba(239, 68, 68, 0.6)";
  } else if (health === "WARNING") {
    statusColor = "#F59E0B"; // Amber
    ringGlow = "rgba(245, 158, 11, 0.5)";
  }

  const selectedRing = isSelected
    ? `box-shadow: 0 0 0 3.5px #3B82F6, 0 0 20px rgba(59, 130, 246, 0.8); border-color: #3B82F6; transform: scale(1.15);`
    : `box-shadow: 0 0 12px ${ringGlow}, 0 2px 6px rgba(0,0,0,0.6); border-color: ${statusColor};`;

  const html = `
    <div style="position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
      <!-- Pulsing Ring Container -->
      <div style="position: absolute; width: 38px; height: 38px; border-radius: 50%; background: #0B0F19; border: 2.5px solid; ${selectedRing} display: flex; align-items: center; justify-content: center; transition: all 0.2s ease;">
        <!-- Vehicle Heading Chevron -->
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style="transform: rotate(${heading}deg); transition: transform 0.3s ease;">
          <path d="M12 2L19 21L12 17L5 21L12 2Z" fill="${statusColor}" stroke="#0B0F19" stroke-width="1.5" stroke-linejoin="round"/>
        </svg>
      </div>

      <!-- Vehicle License Plate Label Tag -->
      <div style="position: absolute; bottom: -18px; left: 50%; transform: translateX(-50%); background: #111C2D; border: 1px solid #334155; color: #F1F5F9; font-size: 11px; font-weight: 700; font-family: ui-monospace, monospace; padding: 1.5px 6px; border-radius: 6px; white-space: nowrap; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
        ${vehicle.license_plate}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "custom-vehicle-marker",
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -26],
  });
};

export const VehicleMarker: React.FC<VehicleMarkerProps> = ({
  vehicle,
  telemetry,
  isSelected = false,
  onClick,
  driverName,
}) => {
  // Default coordinates fallback (Downtown SF / Bay Area)
  const lat = telemetry?.latitude ?? 37.7749;
  const lon = telemetry?.longitude ?? -122.4194;

  const icon = React.useMemo(
    () => createVehicleDivIcon(vehicle, telemetry, isSelected),
    [vehicle, telemetry, isSelected]
  );

  return (
    <Marker
      position={[lat, lon]}
      icon={icon}
      eventHandlers={{
        click: () => onClick && onClick(vehicle.id),
      }}
    >
      {/* Quick Hover Tooltip */}
      <Tooltip direction="top" offset={[0, -26]} opacity={0.96} className="enterprise-dark-tooltip">
        <div className="text-xs font-sans p-1 space-y-1 text-slate-100 bg-[#0B0F19]">
          <div className="font-bold text-slate-100 flex items-center gap-1.5">
            <span>{vehicle.name}</span>
            <span className="text-[11px] text-slate-400 font-mono font-semibold">({vehicle.license_plate})</span>
          </div>
          <div className="text-xs text-slate-300 flex items-center gap-2">
            <span>Speed: <strong className="text-cyan-400 font-mono">{(telemetry?.speed ?? 0).toFixed(1)} km/h</strong></span>
            <span className="text-slate-600">·</span>
            <span>Temp: <strong className="text-slate-200 font-mono">{(telemetry?.engine_temp_c ?? 90).toFixed(1)}°C</strong></span>
          </div>
        </div>
      </Tooltip>

      {/* Rich Click Popup Card */}
      <Popup className="enterprise-map-popup" minWidth={270} maxWidth={330}>
        <div className="p-3.5 space-y-3 font-sans text-slate-100 bg-[#111C2D]">
          {/* Header: Name + License Plate & Status */}
          <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2.5">
            <div>
              <div className="flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-blue-400" />
                <h4 className="font-bold text-sm text-slate-100">{vehicle.name}</h4>
              </div>
              <div className="text-xs text-slate-400 font-mono mt-0.5">
                {vehicle.license_plate} · {vehicle.vehicle_type}
              </div>
            </div>
            <StatusBadge status={vehicle.health_status || "GOOD"} size="sm" />
          </div>

          {/* Telemetry Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-[#0B0F19] border border-slate-800/80">
              <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
                <Gauge className="w-3 h-3 text-cyan-400" />
                Speed
              </span>
              <span className="text-sm font-bold font-mono text-cyan-400 mt-0.5 block">
                {(telemetry?.speed ?? 0).toFixed(1)} km/h
              </span>
            </div>

            <div className="p-2 rounded-lg bg-[#0B0F19] border border-slate-800/80">
              <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
                <Battery className="w-3 h-3 text-emerald-400" />
                Fuel / Battery
              </span>
              <span className="text-sm font-bold font-mono text-emerald-400 mt-0.5 block">
                {(telemetry?.fuel_level_pct ?? 100).toFixed(0)}%
              </span>
            </div>

            <div className="p-2 rounded-lg bg-[#0B0F19] border border-slate-800/80">
              <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
                <Thermometer className="w-3 h-3 text-amber-400" />
                Coolant
              </span>
              <span
                className={clsx(
                  "text-sm font-bold font-mono mt-0.5 block",
                  (telemetry?.engine_temp_c ?? 90) > 105 ? "text-rose-400" : "text-slate-100"
                )}
              >
                {(telemetry?.engine_temp_c ?? 90).toFixed(1)}°C
              </span>
            </div>

            <div className="p-2 rounded-lg bg-[#0B0F19] border border-slate-800/80">
              <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
                <Activity className="w-3 h-3 text-purple-400" />
                Oil Press
              </span>
              <span className="text-sm font-bold font-mono text-purple-300 mt-0.5 block">
                {(telemetry?.oil_pressure_psi ?? 45).toFixed(1)} PSI
              </span>
            </div>
          </div>

          {/* Driver & Assignment */}
          <div className="flex items-center justify-between text-xs pt-1">
            <div className="flex items-center gap-1.5 text-slate-400">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>Driver: <strong className="text-slate-200 font-medium">{driverName || "Assigned Driver"}</strong></span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {telemetry?.time ? new Date(telemetry.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Live"}
            </span>
          </div>

          {/* Inspection Link */}
          <div className="pt-2 border-t border-slate-800">
            <Link
              to={`/vehicles?id=${vehicle.id}`}
              className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-glow-sm"
            >
              <span>Inspect Asset Telematics</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </Popup>
    </Marker>
  );
};

