import React from "react";
import { Card } from "../common/Card";
import { Badge } from "../common/Badge";
import { DriverAnalyticsResponse } from "../../api/analytics";
import { Lightbulb, CheckCircle2 } from "lucide-react";
import { clsx } from "clsx";

export interface DriverCoachingCardProps {
  analytics?: DriverAnalyticsResponse | null;
  className?: string;
}

export const DriverCoachingCard: React.FC<DriverCoachingCardProps> = ({
  analytics,
  className,
}) => {
  const harshBrake = analytics?.harsh_braking_events ?? 0;
  const rapidAccel = analytics?.rapid_acceleration_events ?? 0;
  const speeding = analytics?.speeding_events ?? 0;
  const idle = analytics?.excessive_idle_events ?? 0;

  const recommendations: {
    title: string;
    description: string;
    priority: "HIGH" | "MEDIUM" | "LOW";
    category: string;
  }[] = [];

  if (speeding > 0) {
    recommendations.push({
      title: "Commercial Speed Regulation",
      description:
        "Vehicle speed exceeded 90 km/h threshold. Implement speed governor compliance and adjust cruise control on intercity highway legs.",
      priority: "HIGH",
      category: "SPEED COMPLIANCE",
    });
  }

  if (harshBrake > 0) {
    recommendations.push({
      title: "Defensive Deceleration Coaching",
      description:
        "Emergency deceleration drops exceeding 18 km/h detected. Increase following headway to 4+ seconds in dense traffic to avoid sudden braking.",
      priority: "HIGH",
      category: "BRAKE MANAGEMENT",
    });
  }

  if (rapidAccel > 0) {
    recommendations.push({
      title: "Progressive Throttle Modulation",
      description:
        "Aggressive throttle surges (>15 km/h gain with RPM > 3500) detected. Smooth torque delivery preserves tire tread and optimizes diesel efficiency.",
      priority: "MEDIUM",
      category: "POWERTRAIN EFFICIENCY",
    });
  }

  if (idle > 0) {
    recommendations.push({
      title: "Auxiliary Idle Dwell Reduction",
      description:
        "Stationary idle events detected during non-traffic stops. Shut engine off when dwell duration exceeds 3 minutes to eliminate fuel wastage.",
      priority: "LOW",
      category: "FUEL CONSERVATION",
    });
  }

  return (
    <Card
      className={clsx("flex flex-col select-none shadow-card", className)}
      header={
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <span className="font-semibold text-slate-900 font-sans">Actionable Safety Coaching & Insights</span>
        </div>
      }
      headerAction={
        <Badge variant="brand" size="sm">
          {recommendations.length > 0 ? `${recommendations.length} ACTION ITEMS` : "COMPLIANT"}
        </Badge>
      }
    >
      <div className="space-y-3 font-sans text-xs">
        {recommendations.length === 0 ? (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-semibold text-slate-900">Exemplary Safety Record</h4>
              <p className="text-slate-600 text-xs">
                Driver consistently maintains safe following distances, smooth throttle modulation, and complete highway speed compliance.
              </p>
            </div>
          </div>
        ) : (
          recommendations.map((rec, idx) => (
            <div
              key={idx}
              className={clsx(
                "p-3.5 rounded-xl border space-y-1.5",
                rec.priority === "HIGH"
                  ? "bg-rose-50/60 border-rose-200"
                  : rec.priority === "MEDIUM"
                  ? "bg-amber-50/60 border-amber-200"
                  : "bg-slate-50 border-slate-200"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 text-xs">{rec.title}</span>
                <Badge
                  variant={
                    rec.priority === "HIGH"
                      ? "critical"
                      : rec.priority === "MEDIUM"
                      ? "warning"
                      : "neutral"
                  }
                  size="sm"
                >
                  {rec.category}
                </Badge>
              </div>
              <p className="text-slate-600 leading-relaxed text-xs">{rec.description}</p>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};
