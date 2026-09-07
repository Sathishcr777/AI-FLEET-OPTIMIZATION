import React from "react";
import { Marker, Tooltip, Popup } from "react-leaflet";
import L from "leaflet";
import { Waypoint, OptimizedStop } from "../../types/routes";

export interface WaypointMarkerProps {
  waypoint: Waypoint | OptimizedStop;
  type: "origin" | "destination" | "stop";
  sequenceIndex?: number;
  originalIndex?: number;
}

export const createWaypointDivIcon = (
  type: "origin" | "destination" | "stop",
  label: string,
  sequenceIndex?: number
) => {
  let bgColor = "#2563EB"; // Brand Blue for delivery stops
  let borderColor = "#1D4ED8";
  let textColor = "#FFFFFF";
  let badgeText = sequenceIndex !== undefined ? `${sequenceIndex + 1}` : "•";

  if (type === "origin") {
    bgColor = "#059669"; // Emerald
    borderColor = "#047857";
    badgeText = "DEPOT";
  } else if (type === "destination") {
    bgColor = "#7C3AED"; // Purple
    borderColor = "#6D28D9";
    badgeText = "DEST";
  }

  const isTextBadge = type === "origin" || type === "destination";
  const badgeWidth = isTextBadge ? "auto" : "28px";
  const badgePadding = isTextBadge ? "2px 8px" : "0";

  const html = `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer;">
      <!-- Marker Badge -->
      <div style="
        min-width: ${badgeWidth};
        height: 28px;
        padding: ${badgePadding};
        border-radius: ${isTextBadge ? "8px" : "50%"};
        background: ${bgColor};
        border: 2px solid #FFFFFF;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.15), 0 2px 4px -2px rgba(0,0,0,0.1);
        color: ${textColor};
        font-family: ui-sans-serif, system-ui, sans-serif;
        font-size: ${isTextBadge ? "10px" : "12px"};
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        letter-spacing: ${isTextBadge ? "0.04em" : "0"};
        transition: transform 0.2s ease;
      ">
        ${badgeText}
      </div>

      <!-- Marker Pin Pointer -->
      <div style="
        width: 0;
        height: 0;
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-top: 6px solid ${borderColor};
        margin-top: -1px;
      "></div>

      <!-- Label Tag -->
      <div style="
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
        color: #0F172A;
        font-size: 11px;
        font-family: ui-sans-serif, system-ui, sans-serif;
        font-weight: 600;
        padding: 2px 6px;
        border-radius: 6px;
        white-space: nowrap;
        margin-top: 3px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.08);
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
      ">
        ${label}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "custom-waypoint-marker",
    iconSize: [60, 50],
    iconAnchor: [30, 32],
    popupAnchor: [0, -32],
  });
};

export const WaypointMarker: React.FC<WaypointMarkerProps> = ({
  waypoint,
  type,
  sequenceIndex,
  originalIndex,
}) => {
  const icon = React.useMemo(
    () => createWaypointDivIcon(type, waypoint.name, sequenceIndex),
    [type, waypoint.name, sequenceIndex]
  );

  return (
    <Marker position={[waypoint.latitude, waypoint.longitude]} icon={icon}>
      <Tooltip direction="top" offset={[0, -28]} opacity={0.95}>
        <div className="font-sans text-xs p-1">
          <div className="font-semibold text-slate-900">{waypoint.name}</div>
          <div className="text-slate-500 text-[11px] font-mono">
            Lat: {waypoint.latitude.toFixed(4)}, Lon: {waypoint.longitude.toFixed(4)}
          </div>
          {sequenceIndex !== undefined && (
            <div className="text-blue-600 text-[11px] font-semibold mt-0.5 font-sans">
              Stop #{sequenceIndex + 1}
              {originalIndex !== undefined && originalIndex !== sequenceIndex && (
                <span className="text-amber-600 ml-1 font-normal">(Original: #{originalIndex + 1})</span>
              )}
            </div>
          )}
        </div>
      </Tooltip>
      <Popup className="light-popup">
        <div className="p-2 font-sans text-xs space-y-1 text-slate-700">
          <div className="font-bold text-slate-900 text-sm">{waypoint.name}</div>
          <div className="text-xs text-slate-500">
            {type === "origin"
              ? "Mission Origin Depot"
              : type === "destination"
              ? "Final Mission Destination"
              : `Delivery Stop #${(sequenceIndex ?? 0) + 1}`}
          </div>
          <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-200 font-mono">
            GPS: {waypoint.latitude.toFixed(6)}, {waypoint.longitude.toFixed(6)}
          </div>
        </div>
      </Popup>
    </Marker>
  );
};

