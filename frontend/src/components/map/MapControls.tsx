import React from "react";
import { useMap } from "react-leaflet";
import { Locate, Maximize2, ZoomIn, ZoomOut, Layers, Expand, Minimize } from "lucide-react";
import { Tooltip } from "../common/Tooltip";

export interface MapControlsProps {
  selectedCoordinates?: [number, number] | null;
  allCoordinates?: [number, number][];
  mapLayer?: "dark" | "streets" | "satellite";
  onToggleLayer?: () => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
}

export const MapControls: React.FC<MapControlsProps> = ({
  selectedCoordinates,
  allCoordinates = [],
  mapLayer = "dark",
  onToggleLayer,
  onToggleFullscreen,
  isFullscreen = false,
}) => {
  const map = useMap();

  const handleCenterSelected = () => {
    if (selectedCoordinates) {
      map.flyTo(selectedCoordinates, 15, { duration: 1.2 });
    }
  };

  const handleFitBounds = () => {
    if (allCoordinates.length > 0) {
      map.flyToBounds(allCoordinates, { padding: [50, 50], duration: 1.2 });
    }
  };

  return (
    <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
      {/* Zoom In */}
      <Tooltip content="Zoom In" side="left">
        <button
          type="button"
          onClick={() => map.zoomIn()}
          className="w-9 h-9 rounded-xl bg-[#0B0F19]/90 backdrop-blur-md border border-slate-700/80 text-slate-300 hover:text-white hover:bg-[#16253B] hover:border-slate-600 shadow-2xl flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer"
          aria-label="Zoom In"
        >
          <ZoomIn className="w-4.5 h-4.5" />
        </button>
      </Tooltip>

      {/* Zoom Out */}
      <Tooltip content="Zoom Out" side="left">
        <button
          type="button"
          onClick={() => map.zoomOut()}
          className="w-9 h-9 rounded-xl bg-[#0B0F19]/90 backdrop-blur-md border border-slate-700/80 text-slate-300 hover:text-white hover:bg-[#16253B] hover:border-slate-600 shadow-2xl flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer"
          aria-label="Zoom Out"
        >
          <ZoomOut className="w-4.5 h-4.5" />
        </button>
      </Tooltip>

      <div className="h-px bg-slate-800 my-0.5" />

      {/* Recenter on Selected Vehicle */}
      {selectedCoordinates && (
        <Tooltip content="Center Selected Vehicle" side="left">
          <button
            type="button"
            onClick={handleCenterSelected}
            className="w-9 h-9 rounded-xl bg-blue-600 border border-blue-500 text-white hover:bg-blue-500 shadow-glow-sm flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-blue-400/50 cursor-pointer"
            aria-label="Center Selected Vehicle"
          >
            <Locate className="w-4.5 h-4.5" />
          </button>
        </Tooltip>
      )}

      {/* Fit Fleet to Viewport */}
      {allCoordinates.length > 0 && (
        <Tooltip content="Fit Fleet to Viewport" side="left">
          <button
            type="button"
            onClick={handleFitBounds}
            className="w-9 h-9 rounded-xl bg-[#0B0F19]/90 backdrop-blur-md border border-slate-700/80 text-slate-300 hover:text-white hover:bg-[#16253B] hover:border-slate-600 shadow-2xl flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer"
            aria-label="Fit Fleet to Viewport"
          >
            <Maximize2 className="w-4.5 h-4.5" />
          </button>
        </Tooltip>
      )}

      {/* Map Layer Switcher */}
      {onToggleLayer && (
        <Tooltip content={`Map Style: ${mapLayer.toUpperCase()}`} side="left">
          <button
            type="button"
            onClick={onToggleLayer}
            className="w-9 h-9 rounded-xl bg-[#0B0F19]/90 backdrop-blur-md border border-slate-700/80 text-slate-300 hover:text-white hover:bg-[#16253B] hover:border-slate-600 shadow-2xl flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer"
            aria-label="Switch Map Layer"
          >
            <Layers className="w-4.5 h-4.5 text-cyan-400" />
          </button>
        </Tooltip>
      )}

      {/* Fullscreen Map Toggle */}
      {onToggleFullscreen && (
        <Tooltip content={isFullscreen ? "Exit Fullscreen" : "Fullscreen Map"} side="left">
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="w-9 h-9 rounded-xl bg-[#0B0F19]/90 backdrop-blur-md border border-slate-700/80 text-slate-300 hover:text-white hover:bg-[#16253B] hover:border-slate-600 shadow-2xl flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer"
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-4.5 h-4.5" /> : <Expand className="w-4.5 h-4.5" />}
          </button>
        </Tooltip>
      )}
    </div>
  );
};

