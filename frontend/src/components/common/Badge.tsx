import React from "react";
import { clsx } from "clsx";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "neutral"
    | "brand"
    | "info"
    | "success"
    | "healthy"
    | "warning"
    | "danger"
    | "critical"
    | "predictive";
  size?: "sm" | "md" | "lg";
  dot?: boolean;
  pulseDot?: boolean;
  shape?: "rounded" | "pill";
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "neutral",
  size = "md",
  dot = false,
  pulseDot = false,
  shape = "rounded",
  children,
  ...props
}) => {
  const sizeStyles = {
    sm: "text-xs px-2.5 py-1 min-h-[24px] font-bold leading-none",
    md: "text-xs sm:text-[13px] px-3 py-1.5 min-h-[28px] font-bold leading-none",
    lg: "text-sm px-3.5 py-2 min-h-[32px] font-bold leading-none",
  };

  const variantStyles: Record<string, string> = {
    neutral: "bg-[#16253B] text-slate-300 border border-[#2A3F5F]",
    brand: "bg-blue-950/50 text-blue-300 border border-blue-500/40 shadow-sm",
    info: "bg-cyan-950/50 text-cyan-300 border border-cyan-500/40 shadow-sm",
    success: "bg-emerald-950/50 text-emerald-300 border border-emerald-500/40 shadow-sm",
    healthy: "bg-emerald-950/50 text-emerald-300 border border-emerald-500/40 shadow-sm",
    warning: "bg-amber-950/50 text-amber-300 border border-amber-500/40 shadow-sm",
    danger: "bg-rose-950/50 text-rose-300 border border-rose-500/40 shadow-sm",
    critical: "bg-rose-900/60 text-rose-200 border border-rose-500 shadow-glowCritical font-extrabold",
    predictive: "bg-indigo-950/50 text-indigo-300 border border-indigo-500/40 shadow-sm",
  };

  const dotColors: Record<string, string> = {
    neutral: "bg-slate-400",
    brand: "bg-blue-400 shadow-glowBlue",
    info: "bg-cyan-400 shadow-glowCyan",
    success: "bg-emerald-400 shadow-glowEmerald",
    healthy: "bg-emerald-400 shadow-glowEmerald",
    warning: "bg-amber-400 shadow-glowAmber",
    danger: "bg-rose-400 shadow-glowCritical",
    critical: "bg-rose-400 shadow-glowCritical",
    predictive: "bg-indigo-400",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-2 uppercase tracking-wider select-none font-mono",
        shape === "pill" ? "rounded-full" : "rounded-lg",
        sizeStyles[size],
        variantStyles[variant] || variantStyles.neutral,
        className
      )}
      {...props}
    >
      {(dot || pulseDot) && (
        <span
          className={clsx(
            "w-2 h-2 rounded-full shrink-0",
            dotColors[variant] || "bg-slate-400",
            pulseDot && "animate-pulse"
          )}
        />
      )}
      {children}
    </span>
  );
};


