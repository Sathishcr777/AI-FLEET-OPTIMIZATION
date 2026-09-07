import React from "react";
import { Card } from "../common/Card";
import { Badge } from "../common/Badge";
import { Skeleton } from "../common/Skeleton";
import { AnomalyItem } from "../../api/analytics";
import { CheckCircle2, Cpu } from "lucide-react";
import { clsx } from "clsx";

export interface AnomalyIntelligencePanelProps {
  anomalies: AnomalyItem[];
  isLoading?: boolean;
  className?: string;
}

export const AnomalyIntelligencePanel: React.FC<AnomalyIntelligencePanelProps> = ({
  anomalies,
  isLoading = false,
  className,
}) => {
  const hasAnomalies = anomalies.length > 0;

  return (
    <Card
      variant={hasAnomalies ? "criticalGlow" : "default"}
      className={clsx("flex flex-col select-none shadow-card", className)}
      header={
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-slate-100 font-sans">Statistical Anomaly Intelligence</span>
        </div>
      }
      headerAction={
        <Badge variant={hasAnomalies ? "critical" : "success"} size="sm" dot>
          {hasAnomalies ? `${anomalies.length} ANOMALIES DETECTED` : "ALL SENSORS NOMINAL"}
        </Badge>
      }
    >
      {isLoading ? (
        <div className="space-y-2.5">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      ) : anomalies.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-6 text-center rounded-xl bg-[#0B0F19] border border-[#1F2E47]">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-2" />
          <h4 className="text-xs font-semibold text-slate-100 font-sans">No Active Telemetry Anomalies</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm font-sans">
            Powertrain, thermal cooling, lubrication, and dynamics signals are within statistical Z-score bounds.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 overflow-y-auto max-h-72 custom-scrollbar">
          {anomalies.map((item, idx) => {
            const isExtreme = item.anomaly_score >= 0.8;
            return (
              <div
                key={idx}
                className={clsx(
                  "p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono",
                  isExtreme
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-200"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-200"
                )}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-white uppercase font-sans">
                      {item.metric_name.replace(/_/g, " ")}
                    </span>
                    <Badge variant={isExtreme ? "critical" : "warning"} size="sm">
                      {item.subsystem}
                    </Badge>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Score: {(item.anomaly_score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-sans">{item.anomaly_reason}</p>
                </div>

                <div className="text-right sm:border-l border-[#1F2E47] sm:pl-3.5 shrink-0">
                  <div className="text-xs font-bold text-white">
                    Observed: <span className={isExtreme ? "text-rose-400" : "text-amber-400"}>{item.metric_value}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Expected: {item.expected_range}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

