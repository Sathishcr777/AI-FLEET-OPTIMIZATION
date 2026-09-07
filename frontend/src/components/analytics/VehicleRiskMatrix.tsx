import React from "react";
import { Link } from "react-router-dom";
import { Card } from "../common/Card";
import { Badge } from "../common/Badge";
import { Vehicle } from "../../types/api";
import { MaintenancePredictionResponse, AnomalyItem } from "../../api/analytics";
import { Alert } from "../../types/alerts";
import { Truck, ExternalLink, AlertTriangle, Flame } from "lucide-react";
import { clsx } from "clsx";

export interface VehicleRiskMatrixProps {
  vehicles: Vehicle[];
  predictions: Record<string, MaintenancePredictionResponse>;
  alerts: Alert[];
  anomalies: AnomalyItem[];
  className?: string;
}

const getHealthScore = (status: string): number => {
  if (status === "CRITICAL") return 40;
  if (status === "WARNING") return 70;
  return 95;
};

export const VehicleRiskMatrix: React.FC<VehicleRiskMatrixProps> = ({
  vehicles,
  predictions,
  alerts,
  anomalies,
  className,
}) => {
  // Compute counts per vehicle
  const alertCountMap = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const a of alerts) {
      if (a.status !== "RESOLVED") {
        map.set(a.vehicle_id, (map.get(a.vehicle_id) || 0) + 1);
      }
    }
    return map;
  }, [alerts]);

  const anomalyCountMap = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const an of anomalies) {
      if (an.vehicle_id) {
        map.set(an.vehicle_id, (map.get(an.vehicle_id) || 0) + 1);
      }
    }
    return map;
  }, [anomalies]);

  // Sort vehicles by risk hierarchy (Critical health / risk first)
  const rankedVehicles = React.useMemo(() => {
    return [...vehicles].sort((a, b) => {
      const predA = predictions[a.id]?.risk_score || 0;
      const predB = predictions[b.id]?.risk_score || 0;
      const alertsA = alertCountMap.get(a.id) || 0;
      const alertsB = alertCountMap.get(b.id) || 0;

      // Composite risk score
      const scoreA = (100 - getHealthScore(a.health_status)) * 2 + predA * 1.5 + alertsA * 20;
      const scoreB = (100 - getHealthScore(b.health_status)) * 2 + predB * 1.5 + alertsB * 20;

      return scoreB - scoreA;
    });
  }, [vehicles, predictions, alertCountMap]);

  return (
    <Card
      className={clsx("flex flex-col h-full select-none shadow-card", className)}
      header={
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-slate-900 font-sans">Vehicle Operational Risk Matrix</span>
        </div>
      }
      headerAction={
        <span className="text-xs text-slate-500 font-sans">
          Ranked by Composite Risk Index
        </span>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left font-sans text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase font-semibold">
              <th className="pb-3 pl-3">Vehicle Asset</th>
              <th className="pb-3">Health Status</th>
              <th className="pb-3">Maint. Risk</th>
              <th className="pb-3">Est. RUL</th>
              <th className="pb-3">Open Incidents</th>
              <th className="pb-3">Anomalies</th>
              <th className="pb-3 pr-3 text-right">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rankedVehicles.map((v) => {
              const pred = predictions[v.id];
              const openAlerts = alertCountMap.get(v.id) || 0;
              const openAnomalies = anomalyCountMap.get(v.id) || 0;
              const isCrit = v.health_status === "CRITICAL" || pred?.risk_level === "CRITICAL";

              return (
                <tr
                  key={v.id}
                  className={clsx(
                    "hover:bg-slate-50/80 transition-colors",
                    isCrit && "bg-rose-50/30"
                  )}
                >
                  {/* Asset */}
                  <td className="py-3 pl-3">
                    <div className="font-semibold text-slate-900 text-xs">{v.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {v.license_plate} · {v.model}
                    </div>
                  </td>

                  {/* Health */}
                  <td className="py-3">
                    <Badge
                      variant={
                        v.health_status === "CRITICAL"
                          ? "critical"
                          : v.health_status === "WARNING"
                          ? "warning"
                          : "success"
                      }
                      size="sm"
                    >
                      {v.health_status}
                    </Badge>
                  </td>

                  {/* Maint Risk */}
                  <td className="py-3">
                    <Badge
                      variant={
                        pred?.risk_level === "CRITICAL"
                          ? "critical"
                          : pred?.risk_level === "HIGH"
                          ? "warning"
                          : "brand"
                      }
                      size="sm"
                    >
                      {pred ? `${pred.risk_score.toFixed(0)}% ${pred.risk_level}` : "N/A"}
                    </Badge>
                  </td>

                  {/* Est RUL */}
                  <td className="py-3 text-slate-700 font-mono">
                    {pred ? `${pred.estimated_rul_km.toLocaleString()} km` : "—"}
                  </td>

                  {/* Open Incidents */}
                  <td className="py-3">
                    {openAlerts > 0 ? (
                      <span className="text-rose-600 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                        <span>{openAlerts} Active</span>
                      </span>
                    ) : (
                      <span className="text-slate-400">0 Active</span>
                    )}
                  </td>

                  {/* Anomalies */}
                  <td className="py-3">
                    {openAnomalies > 0 ? (
                      <span className="text-purple-600 font-semibold flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-purple-500" />
                        <span>{openAnomalies} Outliers</span>
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>

                  {/* Inspect Link */}
                  <td className="py-3 pr-3 text-right">
                    <Link to={`/vehicles?id=${v.id}`}>
                      <button className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-700 text-xs font-medium inline-flex items-center gap-1 transition-colors shadow-sm">
                        <span>Inspect</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </button>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

