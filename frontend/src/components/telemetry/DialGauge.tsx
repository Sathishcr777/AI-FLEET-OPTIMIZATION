import React from "react";
import { clsx } from "clsx";

export interface DialGaugeProps {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  warningThreshold?: number;
  criticalThreshold?: number;
  thresholdDirection?: "above" | "below"; // e.g. temp is above, oil pressure is below
  size?: number;
  decimals?: number;
  className?: string;
}

export const DialGauge: React.FC<DialGaugeProps> = ({
  label,
  value,
  min,
  max,
  unit,
  warningThreshold,
  criticalThreshold,
  thresholdDirection = "above",
  size = 140,
  decimals = 0,
  className,
}) => {
  // Clamping value between min and max
  const clampedValue = Math.min(Math.max(value, min), max);
  const percentage = (clampedValue - min) / (max - min);

  // Gauge arc angles: 220 degree arc from 160 deg to 380 deg (-20 to 200)
  const startAngle = 140;
  const totalAngle = 260;
  const currentAngle = startAngle + percentage * totalAngle;

  // Determine state
  let state: "NORMAL" | "WARNING" | "CRITICAL" = "NORMAL";
  if (thresholdDirection === "above") {
    if (criticalThreshold !== undefined && value >= criticalThreshold) {
      state = "CRITICAL";
    } else if (warningThreshold !== undefined && value >= warningThreshold) {
      state = "WARNING";
    }
  } else {
    // Below threshold (e.g. oil pressure drops below safe level)
    if (criticalThreshold !== undefined && value <= criticalThreshold) {
      state = "CRITICAL";
    } else if (warningThreshold !== undefined && value <= warningThreshold) {
      state = "WARNING";
    }
  }

  const stateColors = {
    NORMAL: {
      arc: "#06B6D4",
      glow: "rgba(6, 182, 212, 0.4)",
      text: "text-white",
      accent: "text-cyan-400",
    },
    WARNING: {
      arc: "#F59E0B",
      glow: "rgba(245, 158, 11, 0.4)",
      text: "text-amber-300",
      accent: "text-amber-400",
    },
    CRITICAL: {
      arc: "#EF4444",
      glow: "rgba(239, 68, 68, 0.5)",
      text: "text-rose-400",
      accent: "text-rose-400",
    },
  };

  const activeColor = stateColors[state];

  // SVG Geometry calculations
  const center = size / 2;
  const radius = center - 16;
  const strokeWidth = 8;

  // Polar to cartesian coordinate conversion
  const polarToCartesian = (cx: number, cy: number, r: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: cx + r * Math.cos(angleInRadians),
      y: cy + r * Math.sin(angleInRadians),
    };
  };

  const describeArc = (x: number, y: number, r: number, startAngleDeg: number, endAngleDeg: number) => {
    const start = polarToCartesian(x, y, r, endAngleDeg);
    const end = polarToCartesian(x, y, r, startAngleDeg);
    const largeArcFlag = endAngleDeg - startAngleDeg <= 180 ? "0" : "1";
    return ["M", start.x, start.y, "A", r, r, 0, largeArcFlag, 0, end.x, end.y].join(" ");
  };

  const backgroundArc = describeArc(center, center, radius, startAngle, startAngle + totalAngle);
  const valueArc = describeArc(center, center, radius, startAngle, Math.max(startAngle + 1, currentAngle));

  // Needle tip coordinates
  const needleTip = polarToCartesian(center, center, radius - 8, currentAngle);

  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center p-3.5 rounded-2xl bg-[#0B0F19] border border-slate-800 select-none relative group shadow-lg",
        state === "CRITICAL" && "border-rose-500/50 shadow-glow-crimson",
        state === "WARNING" && "border-amber-500/40 shadow-glow-amber",
        className
      )}
      style={{ width: size + 24 }}
    >
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 font-sans">
        {label}
      </div>

      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="overflow-visible">
          {/* Background track */}
          <path
            d={backgroundArc}
            fill="none"
            stroke="#1E293B"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Active Value Arc */}
          <path
            d={valueArc}
            fill="none"
            stroke={activeColor.arc}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            style={{
              transition: "stroke 0.2s ease, d 0.2s ease",
            }}
          />

          {/* Center Hub */}
          <circle cx={center} cy={center} r={5} fill="#475569" />
          <circle cx={center} cy={center} r={2.5} fill="#0B0F19" />

          {/* Needle Line */}
          <line
            x1={center}
            y1={center}
            x2={needleTip.x}
            y2={needleTip.y}
            stroke={activeColor.arc}
            strokeWidth={2.5}
            strokeLinecap="round"
            style={{ transition: "all 0.2s ease" }}
          />

          {/* Scale Labels */}
          <text
            x={polarToCartesian(center, center, radius - 14, startAngle).x}
            y={polarToCartesian(center, center, radius - 14, startAngle).y + 4}
            fill="#64748B"
            fontSize="9"
            fontFamily="ui-monospace, monospace"
            textAnchor="middle"
          >
            {min}
          </text>
          <text
            x={polarToCartesian(center, center, radius - 14, startAngle + totalAngle).x}
            y={polarToCartesian(center, center, radius - 14, startAngle + totalAngle).y + 4}
            fill="#64748B"
            fontSize="9"
            fontFamily="ui-monospace, monospace"
            textAnchor="middle"
          >
            {max}
          </text>
        </svg>

        {/* Digital Readout In Center */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-3 pointer-events-none">
          <div className="flex items-baseline gap-0.5">
            <span
              className={clsx(
                "text-xl font-bold font-mono tracking-tight tabular-nums",
                activeColor.text
              )}
            >
              {value.toFixed(decimals)}
            </span>
            <span className="text-[10px] font-mono text-slate-400 font-medium">{unit}</span>
          </div>
        </div>
      </div>

      {/* State pill */}
      {state !== "NORMAL" && (
        <div
          className={clsx(
            "mt-1 text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
            state === "CRITICAL"
              ? "bg-rose-950/50 text-rose-400 border-rose-500/40"
              : "bg-amber-950/50 text-amber-400 border-amber-500/40"
          )}
        >
          {state}
        </div>
      )}
    </div>
  );
};

