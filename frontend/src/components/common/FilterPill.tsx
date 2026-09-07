import React from "react";
import { clsx } from "clsx";

export interface FilterPillProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  count?: number | string;
  countVariant?: "default" | "critical" | "warning" | "healthy" | "brand";
  size?: "sm" | "md";
}

export const FilterPill: React.FC<FilterPillProps> = ({
  active = false,
  count,
  countVariant = "default",
  size = "sm",
  className,
  children,
  ...props
}) => {
  const sizeStyles = {
    sm: "px-2.5 py-1 text-xs gap-1.5",
    md: "px-3 py-1.5 text-xs sm:text-sm gap-2",
  };

  const countVariantStyles = {
    default: "bg-[#1F2E47] text-slate-300",
    critical: "bg-rose-500/20 text-rose-300 border border-rose-500/30",
    warning: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
    healthy: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
    brand: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  };

  return (
    <button
      type="button"
      className={clsx(
        "inline-flex items-center font-medium rounded-lg border transition-all duration-150 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 font-sans",
        sizeStyles[size],
        active
          ? "bg-blue-500/20 border-blue-500 text-blue-300 font-semibold shadow-glow-blue"
          : "bg-[#111C2D] border-[#1F2E47] text-slate-300 hover:text-white hover:bg-[#16253B] hover:border-slate-600",
        className
      )}
      {...props}
    >
      <span>{children}</span>
      {count !== undefined && (
        <span
          className={clsx(
            "text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full",
            active ? "bg-blue-500 text-white" : countVariantStyles[countVariant]
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
};
