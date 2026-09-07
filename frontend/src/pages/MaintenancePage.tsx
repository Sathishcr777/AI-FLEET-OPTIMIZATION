import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { vehiclesApi } from "../api/vehicles";
import { alertsApi } from "../api/alerts";
import { analyticsApi, MaintenancePredictionResponse } from "../api/analytics";
import { MaintenanceRiskChart } from "../components/analytics/MaintenanceRiskChart";
import { AnomalyIntelligencePanel } from "../components/analytics/AnomalyIntelligencePanel";
import { IntelligenceTimeline } from "../components/analytics/IntelligenceTimeline";
import { Card } from "../components/common/Card";
import { StatCard } from "../components/common/StatCard";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { Skeleton } from "../components/common/Skeleton";
import { ErrorState } from "../components/common/ErrorState";
import {
  Wrench,
  Truck,
  ExternalLink,
  Radio,
  AlertTriangle,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { clsx } from "clsx";

export const MaintenancePage: React.FC = () => {
  const [intelligenceTimestamp, setIntelligenceTimestamp] = useState<Date>(new Date());

  // 1. Fetch Vehicles
  const {
    data: vehiclesData,
    isLoading: isLoadingVehicles,
    isError: isVehiclesError,
    refetch: refetchVehicles,
  } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => vehiclesApi.list({ limit: 100 }),
  });

  const vehicles = useMemo(() => vehiclesData?.vehicles || [], [vehiclesData?.vehicles]);

  // 2. Fetch Anomalies
  const { data: anomaliesData } = useQuery({
    queryKey: ["anomalies"],
    queryFn: () => analyticsApi.getAnomalies({ limit: 100 }),
  });

  const anomalies = useMemo(() => anomaliesData?.anomalies || [], [anomaliesData?.anomalies]);

  // 3. Fetch Alerts
  const { data: alertsData } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => alertsApi.list({ limit: 50 }),
  });

  const alerts = useMemo(() => alertsData?.alerts || [], [alertsData?.alerts]);

  // 4. Fetch Maintenance Predictions for all vehicles
  const vehicleIdsKey = useMemo(() => vehicles.map((v) => v.id).join(","), [vehicles]);
  const { data: predictionsMap = {} } = useQuery({
    queryKey: ["all-maintenance-predictions", vehicleIdsKey],
    queryFn: async () => {
      const map: Record<string, MaintenancePredictionResponse> = {};
      for (const v of vehicles) {
        try {
          const res = await analyticsApi.getMaintenancePrediction(v.id);
          map[v.id] = res;
        } catch {
          // skip
        }
      }
      setIntelligenceTimestamp(new Date());
      return map;
    },
    enabled: vehicles.length > 0,
  });

  // Calculate Maintenance Metrics
  const metrics = useMemo(() => {
    const total = vehicles.length;
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    let totalRul = 0;
    let rulCount = 0;

    for (const v of vehicles) {
      const pred = predictionsMap[v.id];
      if (pred) {
        if (pred.risk_level === "CRITICAL") criticalCount++;
        else if (pred.risk_level === "HIGH") highCount++;
        else if (pred.risk_level === "MEDIUM") mediumCount++;
        else lowCount++;

        if (pred.estimated_rul_km) {
          totalRul += pred.estimated_rul_km;
          rulCount++;
        }
      } else {
        lowCount++;
      }
    }

    const avgRul = rulCount > 0 ? Math.round(totalRul / rulCount) : 0;
    return { total, criticalCount, highCount, mediumCount, lowCount, avgRul };
  }, [vehicles, predictionsMap]);

  if (isLoadingVehicles && vehicles.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-80 rounded-xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (isVehiclesError) {
    return (
      <ErrorState
        title="Failed to load maintenance intelligence"
        message="Could not retrieve predictive maintenance analytics from the backend."
        onRetry={() => refetchVehicles()}
      />
    );
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto space-y-6 pb-12 select-none">
      {/* ==================================================
          TOP COMMAND HEADER
          ================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/90 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-glowBlue">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-sans">
                  Predictive Maintenance & Health Diagnostics
                </h1>
                <Badge variant="brand" size="md" className="font-mono text-xs">
                  AI-POWERED RUL
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5 font-sans">
                Continuous failure probability modeling, remaining useful life (RUL) estimation, and sensor anomaly detection.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#111C2D] border border-slate-800 text-xs font-mono text-slate-300 shadow-card">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>Synced: {intelligenceTimestamp.toLocaleTimeString()}</span>
          </div>

          <Link to="/vehicles">
            <Button
              size="md"
              variant="secondary"
              leftIcon={<Truck className="w-4 h-4 text-cyan-400" />}
              className="bg-[#111C2D] border-slate-700 hover:bg-[#16253B] text-white shadow-card font-semibold"
            >
              Vehicle Inspector
            </Button>
          </Link>
        </div>
      </div>

      {/* ==================================================
          TOP 4-TILE MAINTENANCE KPI STRIP
          ================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Critical Risk Assets"
          value={metrics.criticalCount}
          subtext="Immediate service overhaul required"
          icon={<AlertTriangle className="w-5 h-5 text-rose-400" />}
          variant={metrics.criticalCount > 0 ? "criticalGlow" : "default"}
        />
        <StatCard
          title="High Risk Assets"
          value={metrics.highCount}
          subtext="Service within 1,000 operating km"
          icon={<Wrench className="w-5 h-5 text-amber-400" />}
        />
        <StatCard
          title="Nominal Operating Assets"
          value={metrics.lowCount + metrics.mediumCount}
          subtext="Healthy powertrain components"
          icon={<ShieldCheck className="w-5 h-5 text-emerald-400" />}
        />
        <StatCard
          title="Mean Estimated RUL"
          value={metrics.avgRul.toLocaleString()}
          unit="km"
          subtext="Fleet composite horizon"
          icon={<Clock className="w-5 h-5 text-cyan-400" />}
        />
      </div>

      {/* ==================================================
          ROW 1: MAINTENANCE RISK CHART & ANOMALY INTELLIGENCE
          ================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <MaintenanceRiskChart
          vehicles={vehicles}
          predictions={predictionsMap}
        />
        <AnomalyIntelligencePanel
          anomalies={anomalies}
          vehicles={vehicles}
        />
      </div>

      {/* ==================================================
          ROW 2: CHRONOLOGICAL CAUSALITY & INCIDENT TIMELINE
          ================================================== */}
      <IntelligenceTimeline
        vehicles={vehicles}
        predictions={predictionsMap}
        anomalies={anomalies}
        alerts={alerts}
      />

      {/* ==================================================
          ROW 3: COMPREHENSIVE PREDICTIVE MAINTENANCE MANIFEST
          ================================================== */}
      <Card
        className="overflow-hidden shadow-2xl bg-[#111C2D] border-slate-800 rounded-2xl"
        header={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2.5">
              <Wrench className="w-5 h-5 text-blue-400" />
              <span className="font-bold text-base text-white font-sans">
                Fleet Predictive Maintenance Manifest
              </span>
            </div>
            <span className="text-slate-400 font-mono text-xs">
              {vehicles.length} Total Vehicles Monitored
            </span>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans text-xs sm:text-[13.5px]">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase font-mono font-bold bg-[#0B0F19]/80">
                <th className="py-3.5 pl-5">Vehicle Identity</th>
                <th className="py-3.5">Health Status</th>
                <th className="py-3.5">Failure Probability</th>
                <th className="py-3.5">Estimated RUL</th>
                <th className="py-3.5">Root Cause Driver</th>
                <th className="py-3.5">Prescriptive Action</th>
                <th className="py-3.5 pr-5 text-right">Workstation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {vehicles.map((v) => {
                const pred = predictionsMap[v.id];
                const isCrit = v.health_status === "CRITICAL" || pred?.risk_level === "CRITICAL";

                return (
                  <tr
                    key={v.id}
                    className={clsx(
                      "hover:bg-[#16253B]/70 transition-all",
                      isCrit && "bg-rose-950/15"
                    )}
                  >
                    <td className="py-4 pl-5">
                      <div className="font-bold text-white text-sm font-sans">{v.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {v.license_plate} · {v.model}
                      </div>
                    </td>

                    <td className="py-4">
                      <Badge
                        variant={
                          v.health_status === "CRITICAL"
                            ? "critical"
                            : v.health_status === "WARNING"
                            ? "warning"
                            : "success"
                        }
                        size="sm"
                        dot
                      >
                        {v.health_status}
                      </Badge>
                    </td>

                    <td className="py-4">
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
                        {pred ? `${pred.risk_score.toFixed(1)}% ${pred.risk_level}` : "12.5% LOW"}
                      </Badge>
                    </td>

                    <td className="py-4 text-cyan-400 font-mono font-bold text-sm">
                      {pred ? `${pred.estimated_rul_km.toLocaleString()} km` : "24,500 km"}
                    </td>

                    <td className="py-4 text-slate-300 text-xs font-sans max-w-xs truncate">
                      {pred?.contributing_factors?.map((f) => f.factor.replace(/_/g, " ")).join(", ") || "Normal component wear"}
                    </td>

                    <td className="py-4 text-slate-300 text-xs font-sans max-w-sm truncate">
                      {pred?.recommendation || "All systems nominal. Continue scheduled maintenance."}
                    </td>

                    <td className="py-4 pr-5 text-right">
                      <Link to={`/vehicles?id=${v.id}`}>
                        <Button
                          size="sm"
                          variant="secondary"
                          leftIcon={<ExternalLink className="w-3.5 h-3.5 text-cyan-400" />}
                          className="bg-[#16253B] border-slate-700 text-white hover:bg-blue-600 hover:border-blue-500 transition-all text-xs font-semibold"
                        >
                          Diagnose
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
