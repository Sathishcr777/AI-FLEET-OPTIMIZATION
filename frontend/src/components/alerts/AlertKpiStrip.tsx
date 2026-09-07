import React from "react";
import { StatCard } from "../common/StatCard";
import { AlertSummaryCounts } from "../../types/alerts";
import {
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  BellRing,
  Eye,
  ShieldCheck,
} from "lucide-react";

export interface AlertKpiStripProps {
  summary: AlertSummaryCounts;
  className?: string;
}

export const AlertKpiStrip: React.FC<AlertKpiStripProps> = ({ summary, className }) => {
  const isCriticalActive = summary.critical > 0;
  const isHighActive = summary.high > 0;

  const totalActive = summary.critical + summary.high + summary.medium + summary.low;
  const totalSev = totalActive || 1;
  const pctCrit = Math.round((summary.critical / totalSev) * 100);
  const pctHigh = Math.round((summary.high / totalSev) * 100);
  const pctMed = Math.round((summary.medium / totalSev) * 100);
  const pctLow = Math.round((summary.low / totalSev) * 100);

  return (
    <div className={`space-y-3 select-none ${className || ""}`}>
      {/* KPI Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Active Open Incidents */}
        <StatCard
          title="Active Incidents"
          value={summary.active}
          subtext="Unresolved in queue"
          icon={<BellRing className="w-4 h-4 text-blue-600" />}
          variant={summary.active > 0 ? "brandGlow" : "default"}
        />

        {/* 2. Critical Priority */}
        <StatCard
          title="Critical Priority"
          value={summary.critical}
          subtext="Emergency response"
          icon={<AlertOctagon className="w-4 h-4 text-rose-500" />}
          variant={isCriticalActive ? "criticalGlow" : "default"}
        />

        {/* 3. High Priority */}
        <StatCard
          title="High Priority"
          value={summary.high}
          subtext="Imminent hazard"
          icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
          variant={isHighActive ? "default" : "default"}
        />

        {/* 4. Medium / Low */}
        <StatCard
          title="Med / Low Warnings"
          value={summary.medium + summary.low}
          subtext="Advisory conditions"
          icon={<ShieldCheck className="w-4 h-4 text-blue-600" />}
        />

        {/* 5. Acknowledged */}
        <StatCard
          title="Acknowledged"
          value={summary.acknowledged}
          subtext="Under operator review"
          icon={<Eye className="w-4 h-4 text-slate-500" />}
        />

        {/* 6. Resolved */}
        <StatCard
          title="Resolved"
          value={summary.resolved}
          subtext="Closed incidents"
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
        />
      </div>

      {/* Severity Proportion Strip */}
      <div className="p-3.5 rounded-xl bg-[#111C2D] border border-[#1F2E47] shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-sans">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-slate-200">Incident Severity Distribution:</span>
          <span className="font-mono text-slate-400 text-[11px] flex items-center gap-2">
            <span className="text-rose-400 font-semibold">{summary.critical} Critical</span>
            <span className="text-slate-600">·</span>
            <span className="text-amber-400 font-semibold">{summary.high} High</span>
            <span className="text-slate-600">·</span>
            <span className="text-blue-400 font-semibold">{summary.medium} Medium</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">{summary.low} Low</span>
          </span>
        </div>

        <div className="flex-1 max-w-md w-full">
          <div className="h-2.5 w-full rounded-full bg-[#0B0F19] overflow-hidden flex border border-[#1F2E47]">
            {totalActive === 0 ? (
              <div className="w-full bg-[#16253B] text-center" title="No active alerts" />
            ) : (
              <>
                {pctCrit > 0 && <div style={{ width: `${pctCrit}%` }} className="bg-rose-500 transition-all" title={`Critical: ${summary.critical} (${pctCrit}%)`} />}
                {pctHigh > 0 && <div style={{ width: `${pctHigh}%` }} className="bg-amber-400 transition-all" title={`High: ${summary.high} (${pctHigh}%)`} />}
                {pctMed > 0 && <div style={{ width: `${pctMed}%` }} className="bg-blue-500 transition-all" title={`Medium: ${summary.medium} (${pctMed}%)`} />}
                {pctLow > 0 && <div style={{ width: `${pctLow}%` }} className="bg-slate-500 transition-all" title={`Low: ${summary.low} (${pctLow}%)`} />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
