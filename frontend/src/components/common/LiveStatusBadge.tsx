import React from "react";
import { Play, Pause } from "lucide-react";
import { clsx } from "clsx";

export interface LiveStatusBadgeProps {
  status?: "LIVE" | "CONNECTED" | "PAUSED" | "OFFLINE" | "UPDATED";
  isLive?: boolean;
  isPaused?: boolean;
  onTogglePause?: () => void;
  lastUpdated?: number | null;
  updatedTime?: string;
  subtext?: string;
  className?: string;
  size?: "sm" | "md";
}

export const LiveStatusBadge: React.FC<LiveStatusBadgeProps> = ({
  status,
  isLive = true,
  isPaused = false,
  onTogglePause,
  lastUpdated,
  updatedTime,
  subtext,
  className,
  size = "sm",
}) => {
  const resolvedStatus = status
    ? status
    : isPaused
    ? "PAUSED"
    : isLive
    ? "LIVE"
    : "OFFLINE";

  const now = Date.now();
  const ageSeconds = lastUpdated ? Math.floor((now - lastUpdated) / 1000) : null;
  const isStale = ageSeconds !== null && ageSeconds > 10;

  const getStatusBadge = () => {
    switch (resolvedStatus) {
      case "LIVE":
        return (
          <span
            className={clsx(
              "inline-flex items-center gap-1.5 font-bold rounded-lg border border-emerald-500/40 bg-emerald-950/60 text-emerald-300 shadow-sm",
              size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-xs sm:text-sm"
            )}
            title={subtext || "Streaming telemetry live"}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-glowEmerald animate-pulse" />
            <span>LIVE</span>
          </span>
        );
      case "CONNECTED":
        return (
          <span
            className={clsx(
              "inline-flex items-center gap-1.5 font-bold rounded-lg border border-blue-500/40 bg-blue-950/60 text-blue-300 shadow-sm",
              size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-xs sm:text-sm"
            )}
            title={subtext || "Backend connected"}
          >
            <span className="w-2 h-2 rounded-full bg-blue-400 shadow-glowBlue" />
            <span>CONNECTED</span>
          </span>
        );
      case "PAUSED":
        return (
          <span
            className={clsx(
              "inline-flex items-center gap-1.5 font-bold rounded-lg border border-amber-500/40 bg-amber-950/60 text-amber-300 shadow-sm",
              size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-xs sm:text-sm"
            )}
            title={subtext || "Visualization paused"}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-glowAmber" />
            <span>PAUSED</span>
          </span>
        );
      case "UPDATED":
        return (
          <span
            className={clsx(
              "inline-flex items-center gap-1.5 font-semibold rounded-lg border border-[#2A3F5F] bg-[#16253B] text-slate-300",
              size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-xs sm:text-sm"
            )}
            title={subtext || "Last evaluation"}
          >
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>UPDATED {updatedTime || ""}</span>
          </span>
        );
      case "OFFLINE":
      default:
        return (
          <span
            className={clsx(
              "inline-flex items-center gap-1.5 font-bold rounded-lg border border-[#2A3F5F] bg-[#16253B] text-slate-400",
              size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-xs sm:text-sm"
            )}
          >
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            <span>OFFLINE</span>
          </span>
        );
    }
  };

  return (
    <div className={clsx("inline-flex items-center gap-2 font-mono select-none", className)}>
      {getStatusBadge()}

      {ageSeconds !== null && (
        <span
          className={clsx(
            "px-2 py-0.5 rounded-lg border text-xs font-mono font-bold",
            isStale
              ? "bg-rose-950/60 text-rose-300 border-rose-500/40"
              : "bg-[#16253B] text-slate-400 border-[#2A3F5F]"
          )}
        >
          {ageSeconds}s
        </span>
      )}

      {onTogglePause && (
        <button
          type="button"
          onClick={onTogglePause}
          className="p-1.5 rounded-lg bg-[#16253B] hover:bg-[#1E3352] text-slate-300 hover:text-white border border-[#2A3F5F] transition-colors focus-visible:ring-1 focus-visible:ring-blue-500 cursor-pointer"
          title={isPaused ? "Resume live updates" : "Pause live visual updates"}
          aria-label={isPaused ? "Resume live updates" : "Pause live updates"}
        >
          {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
        </button>
      )}
    </div>
  );
};

