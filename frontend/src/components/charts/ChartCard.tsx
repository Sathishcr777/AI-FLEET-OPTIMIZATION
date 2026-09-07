import React from "react";
import { Card } from "../common/Card";
import { SkeletonChart } from "../common/Skeleton";
import { EmptyState, EmptyStatePreset } from "../common/EmptyState";
import { clsx } from "clsx";

export interface ChartSummaryMetric {
  label: string;
  value: string | number;
  unit?: string;
  statusColor?: "emerald" | "amber" | "rose" | "blue" | "indigo" | "slate";
}

export interface ChartCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  liveStatus?: React.ReactNode;
  controls?: React.ReactNode;
  summaryMetrics?: ChartSummaryMetric[];
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyPreset?: EmptyStatePreset;
  emptyMessage?: string;
  height?: number | string;
  className?: string;
  children: React.ReactNode;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  icon,
  liveStatus,
  controls,
  summaryMetrics,
  isLoading = false,
  isEmpty = false,
  emptyPreset = "collecting_history",
  emptyMessage,
  height = 280,
  className,
  children,
}) => {
  if (isLoading) {
    return <SkeletonChart height={height} className={className} />;
  }

  const metricColorStyles = {
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    rose: "text-rose-400",
    blue: "text-blue-400",
    indigo: "text-indigo-400",
    slate: "text-slate-200",
  };

  return (
    <Card className={clsx("flex flex-col shadow-card overflow-hidden rounded-2xl bg-[#111C2D] border border-[#1F2E47]", className)}>
      {/* Chart Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-[#1F2E47] bg-[#111C2D]">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2.5">
            {icon && <span className="text-blue-400 shrink-0">{icon}</span>}
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight font-sans">
              {title}
            </h3>
            {liveStatus && <div className="ml-1 shrink-0">{liveStatus}</div>}
          </div>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-400 font-sans tracking-tight">{subtitle}</p>
          )}
        </div>

        {controls && <div className="flex items-center gap-2 self-start sm:self-auto">{controls}</div>}
      </div>

      {/* Chart Viewport */}
      <div className="p-5 bg-[#111C2D]">
        {isEmpty ? (
          <div style={{ height }} className="flex items-center justify-center">
            <EmptyState
              preset={emptyPreset}
              description={emptyMessage}
              compact
              className="w-full max-w-sm border-0 bg-transparent"
            />
          </div>
        ) : (
          <div style={{ height }} className="w-full">
            {children}
          </div>
        )}
      </div>

      {/* Summary Metrics Strip */}
      {summaryMetrics && summaryMetrics.length > 0 && !isEmpty && (
        <div className="px-5 py-3.5 bg-[#0D1624] border-t border-[#1F2E47] flex flex-wrap items-center justify-between gap-4 font-sans text-xs sm:text-sm">
          {summaryMetrics.map((metric, idx) => (
            <div key={idx} className="flex items-baseline gap-2">
              <span className="text-slate-400 text-xs font-semibold">{metric.label}:</span>
              <span
                className={clsx(
                  "font-mono font-bold text-sm sm:text-base tabular-nums",
                  metric.statusColor ? metricColorStyles[metric.statusColor] : "text-white"
                )}
              >
                {metric.value}
                {metric.unit ? ` ${metric.unit}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

