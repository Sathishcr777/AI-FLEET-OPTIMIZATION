import React from "react";
import { Link } from "react-router-dom";
import { Card } from "../common/Card";
import { Badge } from "../common/Badge";
import { AnomalyItem } from "../../api/analytics";
import { Vehicle } from "../../types/api";
import { ShieldCheck, ExternalLink, Cpu } from "lucide-react";
import { clsx } from "clsx";

export interface AnomalyIntelligencePanelProps {
  anomalies: AnomalyItem[];
  vehicles?: Vehicle[];
  className?: string;
}

export const AnomalyIntelligencePanel: React.FC<AnomalyIntelligencePanelProps> = ({
  anomalies,
  vehicles = [],
  className,
}) => {
  const vehicleMap = React.useMemo(() => {
    const map = new Map<string, Vehicle>();
    for (const v of vehicles) map.set(v.id, v);
    return map;
  }, [vehicles]);

  // Subsystem distribution
  const subsystemCounts = React.useMemo(() => {
    const counts: Record<string, number> = {
      COOLING: 0,
      POWERTRAIN: 0,
      LUBRICATION: 0,
      TIRES: 0,
      ELECTRICAL: 0,
      DYNAMICS: 0,
    };

    for (const a of anomalies) {
      const sub = (a.subsystem || "POWERTRAIN").toUpperCase();
      counts[sub] = (counts[sub] || 0) + 1;
    }

    return counts;
  }, [anomalies]);

  return (
    <Card
      className={clsx("flex flex-col h-full select-none shadow-card", className)}
      header={
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-purple-400" />
          <span className="font-semibold text-slate-100 font-sans">Telemetry Anomaly Intelligence</span>
        </div>
      }
      headerAction={
        <Badge variant={anomalies.length > 0 ? "warning" : "success"} size="sm">
          {anomalies.length} DETECTED
        </Badge>
      }
    >
      <div className="space-y-4 font-sans text-xs overflow-y-auto pr-1 flex-1">
        {/* Subsystem Frequency Strip */}
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1.5 font-sans">
            <span>Subsystem Outlier Distribution</span>
            <span className="font-mono text-slate-300">{anomalies.length} Total</span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-center text-xs">
            {Object.entries(subsystemCounts).map(([sub, count]) => (
              <div
                key={sub}
                className={clsx(
                  "p-2 rounded-lg border transition-colors",
                  count > 0
                    ? "bg-purple-500/15 border-purple-500/30 text-purple-200 shadow-glow-blue"
                    : "bg-[#0B0F19] border-[#1F2E47] text-slate-500"
                )}
              >
                <span className="font-semibold block text-[10px] truncate">{sub}</span>
                <span className={clsx("font-bold text-xs font-mono", count > 0 ? "text-purple-300" : "text-slate-500")}>
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Live Detected Anomalies Feed */}
        <div className="pt-3 border-t border-[#1F2E47] space-y-2.5">
          <span className="text-[11px] text-slate-400 uppercase font-semibold block font-sans">
            Recent Statistical Anomalies
          </span>

          {anomalies.length === 0 ? (
            <div className="p-4 rounded-xl bg-[#0B0F19] border border-[#1F2E47] text-center text-slate-400 flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs">All telematics signals are within expected statistical bounds.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {anomalies.slice(0, 4).map((a, idx) => {
                const vehicle = a.vehicle_id ? vehicleMap.get(a.vehicle_id) : undefined;
                return (
                  <div
                    key={a.id || idx}
                    className="p-2.5 rounded-xl bg-[#0B0F19] border border-[#1F2E47] hover:border-purple-500/50 flex items-center justify-between gap-2 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="p-2 rounded-lg bg-[#111C2D] border border-[#1F2E47] text-purple-400">
                        <Cpu className="w-3.5 h-3.5 shrink-0" />
                      </div>
                      <div className="truncate">
                        <div className="font-semibold text-white text-xs truncate font-sans">
                          {a.metric_name}: <span className="text-purple-300 font-mono font-bold">{typeof a.metric_value === "number" ? a.metric_value.toFixed(1) : a.metric_value}</span>{" "}
                          <span className="text-slate-400 text-[10px] font-mono font-normal">({a.expected_range})</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-sans truncate mt-0.5">
                          {vehicle ? vehicle.name : a.vehicle_id?.slice(0, 8)} · {a.anomaly_reason}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="brand" size="sm">
                        SCORE {a.anomaly_score.toFixed(0)}
                      </Badge>
                      {a.vehicle_id && (
                        <Link to={`/vehicles?id=${a.vehicle_id}`}>
                          <button className="p-1.5 rounded-lg border border-[#1F2E47] bg-[#16253B] hover:bg-[#1D2D49] text-slate-300 hover:text-white transition-colors cursor-pointer">
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

