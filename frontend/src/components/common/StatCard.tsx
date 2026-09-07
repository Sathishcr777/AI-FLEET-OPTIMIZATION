import React from "react";
import { clsx } from "clsx";
import { Card } from "./Card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  lastUpdated?: string | number;
  statusBadge?: React.ReactNode;
  icon?: React.ReactNode;
  trend?: {
    value: number | string;
    isPositive?: boolean;
    label?: string;
  };
  sparklineData?: number[];
  variant?: "default" | "subtle" | "criticalGlow" | "brandGlow";
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit,
  subtext,
  lastUpdated,
  statusBadge,
  icon,
  trend,
  sparklineData,
  variant = "default",
  className,
}) => {
  // Generate SVG sparkline path if data is provided
  const renderSparkline = () => {
    if (!sparklineData || sparklineData.length < 2) return null;
    const min = Math.min(...sparklineData);
    const max = Math.max(...sparklineData);
    const range = max - min || 1;
    const width = 88;
    const height = 28;

    const points = sparklineData
      .map((val, idx) => {
        const x = (idx / (sparklineData.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 6) - 3;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

    const strokeColor =
      trend?.isPositive === true
        ? "#34D399"
        : trend?.isPositive === false
        ? "#F87171"
        : "#60A5FA";

    return (
      <svg
        className="w-22 h-7 shrink-0 overflow-visible"
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden="true"
      >
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  return (
    <Card variant={variant} className={clsx("p-5 sm:p-6 min-h-[145px] flex flex-col justify-between shadow-card hover:shadow-elevated transition-shadow bg-[#111C2D] border border-[#1F2E47]", className)}>
      {/* Top Row: Icon + Title & Status Badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-9 h-9 rounded-xl bg-[#16253B] border border-[#2A3F5F] flex items-center justify-center text-blue-400 shrink-0 shadow-sm">
              {icon}
            </div>
          )}
          <span className="text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-wider font-sans">
            {title}
          </span>
        </div>
        {statusBadge && <div className="shrink-0">{statusBadge}</div>}
      </div>

      {/* Primary Dominant Number + Sparkline */}
      <div className="flex items-baseline justify-between mt-3 mb-2">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl sm:text-4xl font-bold font-mono text-white tracking-tight tabular-nums">
            {value}
          </span>
          {unit && <span className="text-sm sm:text-base font-semibold text-slate-400 font-mono">{unit}</span>}
        </div>
        {renderSparkline()}
      </div>

      {/* Footer: Trend & Last Updated / Subtext */}
      {(trend || subtext || lastUpdated) && (
        <div className="pt-3 border-t border-[#1F2E47] flex items-center justify-between text-xs sm:text-[13px] text-slate-400 font-sans">
          {trend ? (
            <div
              className={clsx(
                "inline-flex items-center gap-1.5 font-mono font-bold text-xs sm:text-[13px]",
                trend.isPositive === true
                  ? "text-emerald-400"
                  : trend.isPositive === false
                  ? "text-rose-400"
                  : "text-slate-300"
              )}
            >
              {trend.isPositive === true ? (
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              ) : trend.isPositive === false ? (
                <TrendingDown className="w-4 h-4 text-rose-400" />
              ) : (
                <Minus className="w-4 h-4 text-slate-400" />
              )}
              <span>
                {trend.value}
                {trend.label ? ` ${trend.label}` : ""}
              </span>
            </div>
          ) : (
            <span className="text-slate-400 truncate text-xs sm:text-[13px] font-medium">{subtext || ""}</span>
          )}

          {lastUpdated && (
            <span className="text-xs text-slate-500 font-mono tracking-tight shrink-0 ml-auto">
              {typeof lastUpdated === "number" ? `Updated ${lastUpdated}s ago` : lastUpdated}
            </span>
          )}
          {!lastUpdated && subtext && trend && (
            <span className="text-slate-400 truncate ml-2 text-xs sm:text-[13px]">{subtext}</span>
          )}
        </div>
      )}
    </Card>
  );
};


