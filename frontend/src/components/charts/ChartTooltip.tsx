import React from "react";
import { clsx } from "clsx";

export interface TooltipPayloadItem {
  name?: string;
  value?: number | string;
  unit?: string;
  color?: string;
  dataKey?: string | number;
}

export interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  labelFormatter?: (label: string | number) => React.ReactNode;
  valueFormatter?: (value: number | string, item: TooltipPayloadItem) => React.ReactNode;
  className?: string;
}

export const ChartTooltip: React.FC<ChartTooltipProps> = ({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
  className,
}) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div
      className={clsx(
        "rounded-xl border border-[#1F2E47] bg-[#111C2D]/95 backdrop-blur-md p-3.5 shadow-2xl text-xs font-sans select-none min-w-44 pointer-events-none z-50",
        className
      )}
    >
      {label !== undefined && label !== null && (
        <div className="pb-1.5 mb-2 border-b border-[#1F2E47] font-mono text-xs font-semibold text-slate-300">
          {labelFormatter ? labelFormatter(label) : String(label)}
        </div>
      )}

      <div className="space-y-1.5">
        {payload.map((item, idx) => (
          <div key={`${item.name || item.dataKey || idx}`} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                style={{ backgroundColor: item.color || "#3B82F6" }}
              />
              <span className="text-slate-400 truncate text-xs font-medium">
                {item.name || "Metric"}
              </span>
            </div>

            <div className="font-mono font-bold text-white text-right tabular-nums text-xs">
              {valueFormatter ? (
                valueFormatter(item.value ?? 0, item)
              ) : (
                <span>
                  {typeof item.value === "number" ? item.value.toLocaleString() : item.value}
                  {item.unit ? ` ${item.unit}` : ""}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

