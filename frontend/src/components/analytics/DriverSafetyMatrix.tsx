import React from "react";
import { Link } from "react-router-dom";
import { Card } from "../common/Card";
import { Badge } from "../common/Badge";
import { Driver } from "../../types/api";
import { DriverAnalyticsResponse } from "../../api/analytics";
import { ShieldCheck, User, ExternalLink, AlertTriangle, Trophy } from "lucide-react";
import { clsx } from "clsx";

export interface DriverSafetyMatrixProps {
  drivers: Driver[];
  driverAnalytics: Record<string, DriverAnalyticsResponse>;
  className?: string;
}

export const DriverSafetyMatrix: React.FC<DriverSafetyMatrixProps> = ({
  drivers,
  driverAnalytics,
  className,
}) => {
  const total = drivers.length;

  // Compute fleet behavior event aggregates
  const eventTotals = React.useMemo(() => {
    let harshBrake = 0;
    let rapidAccel = 0;
    let speeding = 0;
    let excessiveIdle = 0;
    let totalScore = 0;

    for (const d of drivers) {
      totalScore += d.overall_safety_score;
      const an = driverAnalytics[d.id];
      if (an) {
        harshBrake += an.harsh_braking_events || 0;
        rapidAccel += an.rapid_acceleration_events || 0;
        speeding += an.speeding_events || 0;
        excessiveIdle += an.excessive_idle_events || 0;
      }
    }

    const avgScore = total > 0 ? totalScore / total : 0;
    const totalEvents = harshBrake + rapidAccel + speeding + excessiveIdle;

    return {
      harshBrake,
      rapidAccel,
      speeding,
      excessiveIdle,
      totalEvents,
      avgScore,
    };
  }, [drivers, driverAnalytics, total]);

  // Split into Top Performers and Attention Required
  const { topPerformers, coachingRequired } = React.useMemo(() => {
    const sorted = [...drivers].sort((a, b) => b.overall_safety_score - a.overall_safety_score);
    const top = sorted.slice(0, 3);
    const coaching = sorted.filter((d) => d.overall_safety_score < 80).reverse().slice(0, 3);
    return { topPerformers: top, coachingRequired: coaching };
  }, [drivers]);

  return (
    <Card
      className={clsx("flex flex-col h-full select-none shadow-card", className)}
      header={
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-slate-900 font-sans">Driver Safety & Behavioral Fleet Index</span>
        </div>
      }
      headerAction={
        <Badge variant={eventTotals.avgScore >= 85 ? "success" : "warning"} size="sm">
          AVG {eventTotals.avgScore.toFixed(1)} / 100
        </Badge>
      }
    >
      <div className="space-y-4 font-sans text-xs overflow-y-auto pr-1 flex-1">
        {/* Behavioral Event Aggregates */}
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-1.5 font-sans">
            <span>Fleet Behavioral Incidents</span>
            <span className="font-mono">{eventTotals.totalEvents} Events Detected</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
              <span className="text-amber-800 font-bold block text-[10px]">HARSH BRAKE</span>
              <span className="text-amber-900 font-bold text-base font-mono">{eventTotals.harshBrake}</span>
              <span className="text-[10px] text-amber-600 block">Decel &gt; 3.5 m/s²</span>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200">
              <span className="text-blue-800 font-bold block text-[10px]">RAPID ACCEL</span>
              <span className="text-blue-900 font-bold text-base font-mono">{eventTotals.rapidAccel}</span>
              <span className="text-[10px] text-blue-600 block">Accel &gt; 3.0 m/s²</span>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
              <span className="text-rose-800 font-bold block text-[10px]">OVERSPEEDING</span>
              <span className="text-rose-900 font-bold text-base font-mono">{eventTotals.speeding}</span>
              <span className="text-[10px] text-rose-600 block">Speed &gt; Limit</span>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200">
              <span className="text-purple-800 font-bold block text-[10px]">EXCESS IDLE</span>
              <span className="text-purple-900 font-bold text-base font-mono">{eventTotals.excessiveIdle}</span>
              <span className="text-[10px] text-purple-600 block">RPM &gt; 0, Speed 0</span>
            </div>
          </div>
        </div>

        {/* 2-Column Leaderboards: Top Performers vs Coaching Required */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-3 border-t border-slate-200">
          {/* Top Performers */}
          <div className="space-y-2">
            <span className="text-[11px] text-emerald-800 uppercase font-semibold flex items-center gap-1 font-sans">
              <Trophy className="w-3.5 h-3.5 text-emerald-600" />
              <span>Top Safety Performers</span>
            </span>

            <div className="space-y-2">
              {topPerformers.map((d, idx) => (
                <div
                  key={d.id}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 flex items-center justify-between gap-2 transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-slate-400 font-bold text-xs font-mono">#{idx + 1}</span>
                    <div className="p-1 rounded-lg bg-emerald-50 text-emerald-600">
                      <User className="w-3 h-3 shrink-0" />
                    </div>
                    <span className="font-semibold text-slate-900 text-xs truncate font-sans">{d.name}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-emerald-700 font-bold text-xs font-mono">
                      {d.overall_safety_score.toFixed(1)}
                    </span>
                    <Link to={`/drivers?id=${d.id}`}>
                      <button className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors">
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Coaching Priority */}
          <div className="space-y-2">
            <span className="text-[11px] text-amber-800 uppercase font-semibold flex items-center gap-1 font-sans">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Coaching Attention</span>
            </span>

            {coachingRequired.length === 0 ? (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center text-slate-500 flex items-center justify-center gap-1.5 h-[115px]">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-xs">All drivers meet safety targets (&gt;80).</span>
              </div>
            ) : (
              <div className="space-y-2">
                {coachingRequired.map((d) => (
                  <div
                    key={d.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 flex items-center justify-between gap-2 transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div className="p-1 rounded-lg bg-amber-50 text-amber-600">
                        <User className="w-3 h-3 shrink-0" />
                      </div>
                      <span className="font-semibold text-slate-900 text-xs truncate font-sans">{d.name}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="warning" size="sm">
                        {d.overall_safety_score.toFixed(1)}
                      </Badge>
                      <Link to={`/drivers?id=${d.id}`}>
                        <button className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors">
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
