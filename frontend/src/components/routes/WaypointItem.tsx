import React from "react";
import { Waypoint } from "../../types/routes";
import { ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { clsx } from "clsx";

export interface WaypointItemProps {
  waypoint: Waypoint;
  index: number;
  totalCount: number;
  onChange: (index: number, updated: Waypoint) => void;
  onRemove: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

export const WaypointItem: React.FC<WaypointItemProps> = ({
  waypoint,
  index,
  totalCount,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}) => {
  const isLatValid = !isNaN(waypoint.latitude) && waypoint.latitude >= -90 && waypoint.latitude <= 90;
  const isLonValid = !isNaN(waypoint.longitude) && waypoint.longitude >= -180 && waypoint.longitude <= 180;

  return (
    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 font-sans text-xs select-none hover:border-slate-300 transition-colors">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="flex items-center justify-center w-5 h-5 rounded-md bg-blue-50 text-blue-600 border border-blue-200 font-bold font-mono text-[10px] shrink-0">
            {index + 1}
          </span>
          <input
            type="text"
            value={waypoint.name}
            onChange={(e) => onChange(index, { ...waypoint, name: e.target.value })}
            placeholder="Stop Name / Customer"
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 flex-1 min-w-0"
          />
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            className="p-1.5 rounded-md bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-slate-200"
            title="Move Up"
            aria-label="Move Up"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onMoveDown(index)}
            disabled={index === totalCount - 1}
            className="p-1.5 rounded-md bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-slate-200"
            title="Move Down"
            aria-label="Move Down"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="p-1.5 rounded-md bg-white text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors border border-rose-200 ml-0.5"
            title="Remove Stop"
            aria-label="Remove Stop"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Latitude and Longitude inputs */}
      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
        <div>
          <label className="text-[10px] text-slate-500 uppercase font-sans font-semibold">Latitude</label>
          <input
            type="number"
            step="0.0001"
            value={isNaN(waypoint.latitude) ? "" : waypoint.latitude}
            onChange={(e) =>
              onChange(index, { ...waypoint, latitude: parseFloat(e.target.value) || 0 })
            }
            className={clsx(
              "w-full px-2.5 py-1.5 bg-white border rounded-lg text-slate-900 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 mt-0.5",
              isLatValid ? "border-slate-200 focus:border-blue-600" : "border-rose-500 text-rose-600"
            )}
          />
        </div>
        <div>
          <label className="text-[10px] text-slate-500 uppercase font-sans font-semibold">Longitude</label>
          <input
            type="number"
            step="0.0001"
            value={isNaN(waypoint.longitude) ? "" : waypoint.longitude}
            onChange={(e) =>
              onChange(index, { ...waypoint, longitude: parseFloat(e.target.value) || 0 })
            }
            className={clsx(
              "w-full px-2.5 py-1.5 bg-white border rounded-lg text-slate-900 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 mt-0.5",
              isLonValid ? "border-slate-200 focus:border-blue-600" : "border-rose-500 text-rose-600"
            )}
          />
        </div>
      </div>
    </div>
  );
};

