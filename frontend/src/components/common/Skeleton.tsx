import React from "react";
import { clsx } from "clsx";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      className={clsx("animate-pulse rounded-xl bg-[#1E2E47]/70", className)}
      {...props}
    />
  );
};

export interface SkeletonMetricProps {
  className?: string;
}

export const SkeletonMetric: React.FC<SkeletonMetricProps> = ({ className }) => {
  return (
    <div className={clsx("space-y-2 animate-pulse", className)}>
      <div className="h-3 w-16 bg-[#1E2E47]/70 rounded" />
      <div className="h-6 w-24 bg-[#1E2E47]/90 rounded" />
    </div>
  );
};

export interface SkeletonCardProps {
  className?: string;
  hasSparkline?: boolean;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ className, hasSparkline = true }) => {
  return (
    <div
      className={clsx(
        "p-5 rounded-2xl border border-[#1F2E47] bg-[#111C2D] shadow-card animate-pulse space-y-3",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="h-4 w-28 bg-[#1E2E47]/80 rounded" />
        <div className="h-4 w-14 bg-[#1E2E47]/50 rounded" />
      </div>
      <div className="flex items-baseline justify-between pt-1">
        <div className="h-8 w-32 bg-[#1E2E47]/90 rounded" />
        {hasSparkline && <div className="h-7 w-20 bg-[#1E2E47]/50 rounded" />}
      </div>
      <div className="pt-3 border-t border-[#1F2E47] flex items-center justify-between">
        <div className="h-3 w-24 bg-[#1E2E47]/60 rounded" />
        <div className="h-3 w-16 bg-[#1E2E47]/40 rounded" />
      </div>
    </div>
  );
};

export interface SkeletonChartProps {
  height?: number | string;
  className?: string;
}

export const SkeletonChart: React.FC<SkeletonChartProps> = ({ height = 280, className }) => {
  return (
    <div
      style={{ height }}
      className={clsx(
        "w-full rounded-2xl border border-[#1F2E47] bg-[#111C2D] p-5 shadow-card flex flex-col justify-between animate-pulse",
        className
      )}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between pb-3.5 border-b border-[#1F2E47]">
        <div className="space-y-1.5">
          <div className="h-4 w-44 bg-[#1E2E47]/90 rounded" />
          <div className="h-3 w-64 bg-[#1E2E47]/50 rounded" />
        </div>
        <div className="h-7 w-24 bg-[#1E2E47]/60 rounded-lg" />
      </div>

      {/* Simulated chart bars/grid */}
      <div className="flex-1 flex items-end justify-between gap-3 pt-6 pb-2 px-2">
        {[40, 65, 30, 85, 55, 75, 45, 90, 60, 70].map((h, i) => (
          <div
            key={i}
            style={{ height: `${h}%` }}
            className="flex-1 bg-[#16253B] rounded-t border-t border-x border-[#1F2E47]"
          />
        ))}
      </div>

      {/* Axis bar */}
      <div className="pt-3 border-t border-[#1F2E47] flex justify-between">
        <div className="h-3 w-14 bg-[#1E2E47]/50 rounded" />
        <div className="h-3 w-14 bg-[#1E2E47]/50 rounded" />
        <div className="h-3 w-14 bg-[#1E2E47]/50 rounded" />
        <div className="h-3 w-14 bg-[#1E2E47]/50 rounded" />
      </div>
    </div>
  );
};



