import React, { useState, useMemo } from "react";
import { MapContainer, TileLayer, Polyline } from "react-leaflet";
import { Vehicle } from "../../types/api";
import { TelemetryPayload } from "../../types/telemetry";
import { VehicleMarker } from "./VehicleMarker";
import { MapControls } from "./MapControls";
import { clsx } from "clsx";

export interface FleetMapProps {
  vehicles: Vehicle[];
  telemetryMap: Record<string, { latest: TelemetryPayload; history: TelemetryPayload[] }>;
  selectedVehicleId: string | null;
  onSelectVehicle: (id: string) => void;
  className?: string;
}

export const FleetMap: React.FC<FleetMapProps> = ({
  vehicles,
  telemetryMap,
  selectedVehicleId,
  onSelectVehicle,
  className,
}) => {
  const [mapLayer, setMapLayer] = useState<"dark" | "streets" | "satellite">("dark");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Center coordinates (default: San Francisco Bay Area center)
  const defaultCenter: [number, number] = [37.7749, -122.4194];

  // Extract selected vehicle's latest coordinates
  const selectedTelemetry = selectedVehicleId ? telemetryMap[selectedVehicleId]?.latest : null;
  const selectedCoordinates: [number, number] | null = selectedTelemetry
    ? [selectedTelemetry.latitude, selectedTelemetry.longitude]
    : null;

  // Collect all vehicle coordinates for bounds fitting
  const allCoordinates: [number, number][] = useMemo(() => {
    return vehicles
      .map((v) => {
        const t = telemetryMap[v.id]?.latest;
        return t ? ([t.latitude, t.longitude] as [number, number]) : null;
      })
      .filter((c): c is [number, number] => c !== null);
  }, [vehicles, telemetryMap]);

  // Selected vehicle trajectory breadcrumb path (last 50 positions)
  const selectedTrajectory: [number, number][] = useMemo(() => {
    if (!selectedVehicleId) return [];
    const hist = telemetryMap[selectedVehicleId]?.history || [];
    return hist.map((p) => [p.latitude, p.longitude] as [number, number]);
  }, [selectedVehicleId, telemetryMap]);

  const cycleLayer = () => {
    setMapLayer((prev) => (prev === "dark" ? "streets" : prev === "streets" ? "satellite" : "dark"));
  };

  return (
    <div
      className={clsx(
        "relative rounded-2xl overflow-hidden border border-slate-800 bg-[#0B0F19] shadow-2xl transition-all",
        isFullscreen
          ? "fixed inset-0 z-50 rounded-none w-screen h-screen m-0 border-0"
          : `w-full h-full min-h-[440px] sm:min-h-[480px] lg:min-h-[500px] ${className || ""}`
      )}
    >
      <MapContainer
        center={selectedCoordinates || defaultCenter}
        zoom={12}
        scrollWheelZoom={true}
        zoomControl={false}
        className="w-full h-full z-10"
      >
        {/* CartoDB Dark Matter (High-Contrast Industrial Dark Canvas) */}
        {mapLayer === "dark" && (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            maxZoom={20}
            subdomains="abcd"
          />
        )}

        {/* Esri World Street Map */}
        {mapLayer === "streets" && (
          <TileLayer
            attribution='Tiles &copy; <a href="https://www.esri.com">Esri</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
          />
        )}

        {/* Esri World Imagery (Satellite) */}
        {mapLayer === "satellite" && (
          <TileLayer
            attribution='Tiles &copy; <a href="https://www.esri.com">Esri</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
          />
        )}

        {/* Selected Vehicle Trajectory Polyline Trail with Neon Glow */}
        {selectedTrajectory.length > 1 && (
          <Polyline
            positions={selectedTrajectory}
            pathOptions={{
              color: "#06B6D4",
              weight: 4,
              opacity: 0.95,
              dashArray: "6, 8",
            }}
          />
        )}

        {/* Vehicle Markers */}
        {vehicles.map((vehicle) => {
          const t = telemetryMap[vehicle.id]?.latest;
          return (
            <VehicleMarker
              key={vehicle.id}
              vehicle={vehicle}
              telemetry={t}
              isSelected={vehicle.id === selectedVehicleId}
              onClick={onSelectVehicle}
            />
          );
        })}

        {/* Tactical Map Control Overlays */}
        <MapControls
          selectedCoordinates={selectedCoordinates}
          allCoordinates={allCoordinates.length > 0 ? allCoordinates : [defaultCenter]}
          mapLayer={mapLayer}
          onToggleLayer={cycleLayer}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen((prev) => !prev)}
        />
      </MapContainer>

      {/* Floating Tactical Map Legend */}
      <div className="absolute top-4 left-4 z-[400] bg-[#0B0F19]/90 backdrop-blur-md border border-slate-800/90 py-2 px-3.5 rounded-xl shadow-2xl flex items-center gap-3 text-xs font-sans pointer-events-auto">
        <span className="font-mono font-bold text-slate-400 text-[11px] uppercase tracking-wider">Fleet Status</span>
        <div className="h-3 w-px bg-slate-800" />
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-glow-emerald" />
          <span className="text-slate-200 font-semibold text-xs">Healthy</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-glow-amber" />
          <span className="text-slate-200 font-semibold text-xs">Warning</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-glow-crimson" />
          <span className="text-slate-200 font-semibold text-xs">Critical</span>
        </div>
      </div>
    </div>
  );
};


