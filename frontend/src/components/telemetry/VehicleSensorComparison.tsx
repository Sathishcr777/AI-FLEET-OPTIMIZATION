import React from "react";
import { Card } from "../common/Card";
import { Badge } from "../common/Badge";
import { TelemetryPayload, METRIC_METAS, TelemetryMetricKey } from "../../types/telemetry";
import { Vehicle } from "../../types/api";
import { Gauge, ShieldCheck } from "lucide-react";
import { clsx } from "clsx";

export interface VehicleSensorComparisonProps {
  vehicle?: Vehicle | null;
  telemetry?: TelemetryPayload | null;
  className?: string;
}

export const VehicleSensorComparison: React.FC<VehicleSensorComparisonProps> = ({
  vehicle,
  telemetry,
  className,
}) => {
  const metrics: TelemetryMetricKey[] = [
    "speed",
    "engine_temp_c",
    "oil_pressure_psi",
    "rpm",
    "battery_voltage",
    "fuel_level_pct",
  ];

  const comparisons = React.useMemo(() => {
    if (!telemetry) return [];

    return metrics.map((key) => {
      const meta = METRIC_METAS[key];
      const val = telemetry[key as keyof TelemetryPayload] as number | undefined;
      const currentVal = typeof val === "number" ? val : meta.min;

      let status: "GOOD" | "WARNING" | "CRITICAL" = "GOOD";

      if (key === "speed") {
        if (currentVal > (meta.critMax ?? 120)) status = "CRITICAL";
        else if (currentVal > (meta.warnMax ?? 105)) status = "WARNING";
      } else if (key === "engine_temp_c") {
        if (currentVal > (meta.critMax ?? 115)) status = "CRITICAL";
        else if (currentVal > (meta.warnMax ?? 105)) status = "WARNING";
      } else if (key === "oil_pressure_psi") {
        if (currentVal < (meta.critMin ?? 18)) status = "CRITICAL";
        else if (currentVal < (meta.warnMin ?? 25)) status = "WARNING";
      } else if (key === "rpm") {
        if (currentVal > (meta.critMax ?? 3600)) status = "CRITICAL";
        else if (currentVal > (meta.warnMax ?? 3200)) status = "WARNING";
      } else if (key === "battery_voltage") {
        if (currentVal < (meta.critMin ?? 11.2) || currentVal > (meta.critMax ?? 15.6)) status = "CRITICAL";
        else if (currentVal < (meta.warnMin ?? 11.8) || currentVal > (meta.warnMax ?? 15.2)) status = "WARNING";
      } else if (key === "fuel_level_pct") {
        if (currentVal < (meta.critMin ?? 10)) status = "CRITICAL";
        else if (currentVal < (meta.warnMin ?? 20)) status = "WARNING";
      }

      // Compute percentage within total display range
      const totalRange = meta.max - meta.min;
      const pct = Math.min(100, Math.max(0, ((currentVal - meta.min) / totalRange) * 100));
      const safeMinPct = ((meta.safeMin - meta.min) / totalRange) * 100;
      const safeMaxPct = ((meta.safeMax - meta.min) / totalRange) * 100;

      return {
        key,
        label: meta.shortLabel,
        unit: meta.unit,
        currentVal,
        safeMin: meta.safeMin,
        safeMax: meta.safeMax,
        min: meta.min,
        max: meta.max,
        pct,
        safeMinPct,
        safeMaxPct,
        status,
      };
    });
  }, [telemetry]);

  if (!vehicle || !telemetry) {
    return (
      <Card className={clsx("p-4 text-center text-slate-500 bg-[#0B0F19] border-dashed border-slate-800 text-xs", className)}>
        <p>Awaiting live telemetry to evaluate sensor operating thresholds.</p>
      </Card>
    );
  }

  return (
    <Card
      className={clsx("flex flex-col select-none shadow-2xl bg-[#111C2D] border-slate-800", className)}
      header={
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-sm text-slate-100 font-sans">
            Sensor Operating Envelope & Target Ranges
          </span>
        </div>
      }
      headerAction={
        <span className="text-[10px] font-mono text-cyan-400 font-bold">
          Safe Limits Evaluation
        </span>
      }
    >
      <div className="space-y-3 font-sans text-xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {comparisons.map((item) => (
            <div
              key={item.key}
              className={clsx(
                "p-3 rounded-xl border space-y-2 transition-all",
                item.status === "CRITICAL"
                  ? "bg-rose-950/30 border-rose-500/40 shadow-glow-crimson"
                  : item.status === "WARNING"
                  ? "bg-amber-950/30 border-amber-500/40 shadow-glow-amber"
                  : "bg-[#0B0F19] border-slate-800"
              )}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200 font-sans">{item.label}</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-cyan-400">
                    {item.currentVal.toFixed(1)} {item.unit}
                  </span>
                  <Badge
                    variant={item.status === "CRITICAL" ? "critical" : item.status === "WARNING" ? "warning" : "success"}
                    size="sm"
                  >
                    {item.status}
                  </Badge>
                </div>
              </div>

              {/* Envelope Range Bar */}
              <div className="space-y-1">
                <div className="relative w-full bg-[#16253B] h-2.5 rounded-full overflow-hidden border border-slate-800">
                  {/* Safe Zone Highlight */}
                  <div
                    className="absolute top-0 bottom-0 bg-emerald-500/20 border-x border-emerald-500/50"
                    style={{
                      left: `${item.safeMinPct}%`,
                      width: `${item.safeMaxPct - item.safeMinPct}%`,
                    }}
                  />

                  {/* Current Value Needle / Bar */}
                  <div
                    className={clsx(
                      "h-full rounded-full transition-all duration-300",
                      item.status === "CRITICAL"
                        ? "bg-rose-500 shadow-glow-crimson"
                        : item.status === "WARNING"
                        ? "bg-amber-400 shadow-glow-amber"
                        : "bg-cyan-400 shadow-glow-sm"
                    )}
                    style={{ width: `${item.pct}%` }}
                  />
                </div>

                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>{item.min}</span>
                  <span className="text-slate-400 font-sans">
                    Target: {item.safeMin}–{item.safeMax} {item.unit}
                  </span>
                  <span>{item.max}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 font-sans px-1 pt-2 border-t border-slate-800">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Green shaded zone represents optimal OEM mechanical operating envelope.</span>
          </span>
          <span className="font-mono text-cyan-400 font-bold">6 SENSORS EVALUATED</span>
        </div>
      </div>
    </Card>
  );
};

