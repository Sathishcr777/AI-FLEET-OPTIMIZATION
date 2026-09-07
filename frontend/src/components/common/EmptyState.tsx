import React from "react";
import { ShieldCheck, Radio, Clock, Search, FolderOpen } from "lucide-react";
import { clsx } from "clsx";

export type EmptyStatePreset =
  | "system_clear"
  | "waiting_telemetry"
  | "collecting_history"
  | "no_results"
  | "custom";

export interface EmptyStateProps {
  preset?: EmptyStatePreset;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  compact?: boolean;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  preset = "custom",
  title,
  description,
  icon,
  action,
  compact = false,
  className,
}) => {
  // Preset defaults
  const getPresetConfig = () => {
    switch (preset) {
      case "system_clear":
        return {
          icon: <ShieldCheck className="w-6 h-6 text-emerald-400" />,
          iconBg: "bg-emerald-950/60 border-emerald-500/40 shadow-glowEmerald",
          title: "SYSTEM CLEAR",
          description: "No active incidents detected. All monitored fleet assets are operating nominally.",
        };
      case "waiting_telemetry":
        return {
          icon: <Radio className="w-6 h-6 text-blue-400 animate-pulse" />,
          iconBg: "bg-blue-950/60 border-blue-500/40 shadow-glowBlue",
          title: "WAITING FOR TELEMETRY",
          description: "Live vehicle telemetry stream is active and awaiting payload packets.",
        };
      case "collecting_history":
        return {
          icon: <Clock className="w-6 h-6 text-slate-400" />,
          iconBg: "bg-[#16253B] border-[#2A3F5F]",
          title: "COLLECTING HISTORY",
          description: "Historical telemetry trends will appear as observations stream into the buffer.",
        };
      case "no_results":
        return {
          icon: <Search className="w-6 h-6 text-slate-400" />,
          iconBg: "bg-[#16253B] border-[#2A3F5F]",
          title: "NO MATCHING ASSETS",
          description: "There are no vehicles or alerts matching your active filter criteria.",
        };
      case "custom":
      default:
        return {
          icon: <FolderOpen className="w-6 h-6 text-slate-400" />,
          iconBg: "bg-[#16253B] border-[#2A3F5F]",
          title: "NO DATA AVAILABLE",
          description: "There is no operational information to display at this time.",
        };
    }
  };

  const presetConfig = getPresetConfig();
  const finalTitle = title || presetConfig.title;
  const finalDescription = description !== undefined ? description : presetConfig.description;
  const finalIcon = icon || presetConfig.icon;

  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center text-center rounded-2xl border border-[#1F2E47] bg-[#111C2D]/60 select-none",
        compact ? "p-5 sm:p-6" : "p-8 sm:p-12",
        className
      )}
    >
      <div
        className={clsx(
          "rounded-2xl border flex items-center justify-center mb-3.5 shadow-card",
          compact ? "p-2.5" : "p-3.5",
          presetConfig.iconBg
        )}
      >
        {finalIcon}
      </div>
      <h3 className="text-xs sm:text-sm font-bold text-white tracking-wider font-sans uppercase">
        {finalTitle}
      </h3>
      {finalDescription && (
        <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md font-sans leading-relaxed">
          {finalDescription}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};


