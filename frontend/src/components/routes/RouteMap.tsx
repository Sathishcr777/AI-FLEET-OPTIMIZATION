import React, { useMemo } from "react";
import { MapContainer, TileLayer, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { Waypoint, RouteOptimizeResponse } from "../../types/routes";
import { WaypointMarker } from "./WaypointMarker";
import { clsx } from "clsx";

export interface RouteMapProps {
  origin: Waypoint;
  destination: Waypoint | null;
  stops: Waypoint[];
  optimizationResult: RouteOptimizeResponse | null;
  showOriginalPath?: boolean;
  className?: string;
}

// Helper to fit bounds to all waypoints
const FitBoundsHelper: React.FC<{ coordinates: [number, number][] }> = ({ coordinates }) => {
  const map = useMap();

  React.useEffect(() => {
    if (coordinates.length === 0) return;
    if (coordinates.length === 1) {
      map.setView(coordinates[0], 13);
      return;
    }
    const bounds = L.latLngBounds(coordinates.map((c) => L.latLng(c[0], c[1])));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [coordinates, map]);

  return null;
};

export const RouteMap: React.FC<RouteMapProps> = ({
  origin,
  destination,
  stops,
  optimizationResult,
  showOriginalPath = true,
  className,
}) => {
  const defaultCenter: [number, number] = [origin.latitude, origin.longitude];

  // 1. Compute Original Route Path Coordinates
  const originalPathCoords: [number, number][] = useMemo(() => {
    const coords: [number, number][] = [[origin.latitude, origin.longitude]];
    for (const s of stops) {
      coords.push([s.latitude, s.longitude]);
    }
    if (destination) {
      coords.push([destination.latitude, destination.longitude]);
    }
    return coords;
  }, [origin, destination, stops]);

  // 2. Compute Optimized Route Path Coordinates (from backend response)
  const optimizedPathCoords: [number, number][] = useMemo(() => {
    if (!optimizationResult) return [];
    return optimizationResult.optimized_sequence.map(
      (s) => [s.latitude, s.longitude] as [number, number]
    );
  }, [optimizationResult]);

  // 3. Collect all active coordinates for fitting
  const allCoords: [number, number][] = useMemo(() => {
    if (optimizedPathCoords.length > 0) return optimizedPathCoords;
    return originalPathCoords;
  }, [optimizedPathCoords, originalPathCoords]);

  const hasOptimization = Boolean(optimizationResult && optimizationResult.optimized_sequence.length > 0);

  return (
    <div
      className={clsx(
        "relative w-full h-full rounded-2xl overflow-hidden border border-slate-200/90 bg-slate-50 shadow-card",
        className
      )}
    >
      <MapContainer
        center={defaultCenter}
        zoom={12}
        scrollWheelZoom={true}
        zoomControl={false}
        className="w-full h-full z-10"
      >
        {/* Esri World Street Map Tiles (No Watermark) */}
        <TileLayer
          attribution='Tiles &copy; <a href="https://www.esri.com">Esri</a> &mdash; Sources: Esri, USGS, NOAA'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
          maxZoom={19}
        />

        {/* 1. Original Route Polyline (Dashed Slate) */}
        {showOriginalPath && originalPathCoords.length > 1 && (
          <Polyline
            positions={originalPathCoords}
            pathOptions={{
              color: hasOptimization ? "#94A3B8" : "#F59E0B",
              weight: hasOptimization ? 2.5 : 3.5,
              opacity: hasOptimization ? 0.7 : 0.9,
              dashArray: hasOptimization ? "6, 8" : undefined,
            }}
          />
        )}

        {/* 2. Optimized Route Polyline (Solid Enterprise Blue) */}
        {hasOptimization && optimizedPathCoords.length > 1 && (
          <Polyline
            positions={optimizedPathCoords}
            pathOptions={{
              color: "#2563EB",
              weight: 4,
              opacity: 0.95,
            }}
          />
        )}

        {/* 3. Origin Depot Marker */}
        <WaypointMarker waypoint={origin} type="origin" />

        {/* 4. Delivery Stops Markers */}
        {hasOptimization && optimizationResult
          ? optimizationResult.optimized_sequence.map((optStop, optIdx) => {
              // Check if it is origin or destination
              if (optIdx === 0 && optStop.latitude === origin.latitude && optStop.longitude === origin.longitude) {
                return null;
              }
              const isDest =
                destination &&
                optStop.latitude === destination.latitude &&
                optStop.longitude === destination.longitude;

              if (isDest) return null;

              // Find original index
              const origIdx = stops.findIndex(
                (s) => s.latitude === optStop.latitude && s.longitude === optStop.longitude
              );

              return (
                <WaypointMarker
                  key={`opt-${optStop.stop_id || optIdx}`}
                  waypoint={optStop}
                  type="stop"
                  sequenceIndex={optIdx - 1}
                  originalIndex={origIdx >= 0 ? origIdx : undefined}
                />
              );
            })
          : stops.map((stop, idx) => (
              <WaypointMarker
                key={`stop-${stop.stop_id || idx}`}
                waypoint={stop}
                type="stop"
                sequenceIndex={idx}
              />
            ))}

        {/* 5. Destination Marker */}
        {destination && (
          <WaypointMarker
            waypoint={destination}
            type="destination"
          />
        )}

        {/* Auto Bounds Fitter */}
        <FitBoundsHelper coordinates={allCoords} />
      </MapContainer>

      {/* Map Legend Overlay */}
      <div className="absolute top-3 right-3 z-[400] bg-white/90 backdrop-blur-md border border-slate-200/90 p-3 rounded-xl text-xs font-sans shadow-lg space-y-1.5 pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-600"></span>
          <span className="text-slate-700 font-medium">Depot / Origin</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 border border-blue-700"></span>
          <span className="text-slate-700 font-medium">Delivery Stop</span>
        </div>
        {destination && (
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600 border border-purple-700"></span>
            <span className="text-slate-700 font-medium">Destination</span>
          </div>
        )}
        <div className="pt-1.5 border-t border-slate-200 flex items-center gap-2 text-[11px]">
          {hasOptimization ? (
            <>
              <div className="w-4 h-0.5 bg-blue-600"></div>
              <span className="text-blue-700 font-bold">2-Opt Path</span>
              <div className="w-4 h-0.5 border-t border-dashed border-slate-400 ml-1"></div>
              <span className="text-slate-500">Original</span>
            </>
          ) : (
            <>
              <div className="w-4 h-0.5 bg-amber-500"></div>
              <span className="text-amber-700 font-bold">Configured Path</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

