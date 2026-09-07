import React from "react";
import { Card } from "../common/Card";
import { Badge } from "../common/Badge";
import { DriverAnalyticsResponse } from "../../api/analytics";
import { Flame, Gauge, OctagonAlert, Timer } from "lucide-react";
import { clsx } from "clsx";

export interface DriverBehaviorEventsGridProps {
  analytics?: DriverAnalyticsResponse | null;
  className?: string;
}

export const DriverBehaviorEventsGrid: React.FC<DriverBehaviorEventsGridProps> = ({
  analytics,
  className,
}) => {
  const harshBrake = analytics?.harsh_braking_events ?? 0;
  const rapidAccel = analytics?.rapid_acceleration_events ?? 0;
  const speeding = analytics?.speeding_events ?? 0;
  const idle = analytics?.excessive_idle_events ?? 0;

  const events = [
    {
      id: "harsh_braking",
      label: "Harsh Braking",
      count: harshBrake,
      deduction: "-8 pts",
      description: "Sudden deceleration exceeding 18 km/h drop",
      icon: <OctagonAlert className="w-5 h-5" />,
      isRisk: harshBrake > 0,
      severity: harshBrake > 2 ? "CRITICAL" : harshBrake > 0 ? "HIGH" : "NORMAL",
    },
    {
      id: "rapid_accel",
      label: "Rapid Acceleration",
      count: rapidAccel,
      deduction: "-5 pts",
      description: "Throttle surge > 15 km/h gain with RPM > 3500",
      icon: <Flame className="w-5 h-5" />,
      isRisk: rapidAccel > 0,
      severity: rapidAccel > 2 ? "HIGH" : rapidAccel > 0 ? "WARNING" : "NORMAL",
    },
    {
      id: "overspeeding",
      label: "Overspeeding",
      count: speeding,
      deduction: "-10 pts",
      description: "Cruising speed exceeding 90 km/h commercial limit",
      icon: <Gauge className="w-5 h-5" />,
      isRisk: speeding > 0,
      severity: speeding > 1 ? "CRITICAL" : speeding > 0 ? "HIGH" : "NORMAL",
    },
    {
      id: "excessive_idle",
      label: "Excessive Idling",
      count: idle,
      deduction: "-6 pts",
      description: "Stationary engine dwell > 3 observations",
      icon: <Timer className="w-5 h-5" />,
      isRisk: idle > 0,
      severity: idle > 2 ? "HIGH" : idle > 0 ? "WARNING" : "NORMAL",
    },
  ];

  return (
    <div className={clsx("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 select-none", className)}>
      {events.map((evt) => (
        <Card
          key={evt.id}
          variant={evt.severity === "CRITICAL" ? "criticalGlow" : "default"}
          className="flex flex-col justify-between shadow-card"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 font-sans">
                {evt.label}
              </span>
              <div className="flex items-baseline gap-2 pt-1">
                <span
                  className={clsx(
                    "text-3xl font-bold font-mono tracking-tight tabular-nums",
                    evt.isRisk ? "text-rose-400" : "text-slate-100"
                  )}
                >
                  {evt.count}
                </span>
                <span className="text-xs font-sans text-slate-400">events</span>
              </div>
            </div>

            <div
              className={clsx(
                "p-2.5 rounded-xl border",
                evt.severity === "CRITICAL"
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                  : evt.severity === "HIGH"
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                  : evt.severity === "WARNING"
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                  : "bg-[#0B0F19] text-slate-400 border-[#1F2E47]"
              )}
            >
              {evt.icon}
            </div>
          </div>

          <div className="pt-3 border-t border-[#1F2E47] mt-3 flex items-center justify-between text-xs font-sans gap-2">
            <span className="text-[11px] text-slate-400 line-clamp-1">{evt.description}</span>
            <Badge
              variant={
                evt.severity === "CRITICAL"
                  ? "critical"
                  : evt.severity === "HIGH"
                  ? "critical"
                  : evt.severity === "WARNING"
                  ? "warning"
                  : "neutral"
              }
              size="sm"
            >
              {evt.deduction}
            </Badge>
          </div>
        </Card>
      ))}
    </div>
  );
};
