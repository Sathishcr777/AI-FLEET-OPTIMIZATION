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

  const vehicles = vehiclesData?.vehicles || [];

  // 2. Fetch Anomalies
  const { data: anomaliesData } = useQuery({
    queryKey: ["anomalies"],
    queryFn: () => analyticsApi.getAnomalies({ limit: 100 }),
  });

  const anomalies = anomaliesData?.anomalies || [];

  // 3. Fetch Alerts
  const { data: alertsData } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => alertsApi.list({ limit: 50 }),
  });

  const alerts = alertsData?.alerts || [];

  // 4. Fetch Maintenance Predictions for all vehicles
  const { data: predictionsMap = {} } = useQuery({
    queryKey: ["all-maintenance-predictions", vehicles.map((v) => v.id).join(",")],
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
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
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
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1F2E47] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Wrench className="w-6 h-6 text-blue-400" />
            <span>Predictive Maintenance & Diagnostics</span>
            <Badge variant="brand" size="sm">
              AI-POWERED RUL
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-sans">
            Continuous failure risk modeling, remaining useful life (RUL) estimation, and sensor outlier detection.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#111C2D] border border-[#1F2E47] text-xs font-mono font-medium text-slate-300 shadow-md">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>Synced: {intelligenceTimestamp.toLocaleTimeString()}</span>
          </div>

          <Link to="/vehicles">
            <Button size="md" variant="secondary" leftIcon={<Truck className="w-4 h-4 text-blue-400" />}>
              Vehicle Inspector
            </Button>
          </Link>
        </div>
      </div>

      {/* Top 4-Tile Maintenance KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Critical Risk"
          value={metrics.criticalCount}
          subtext="Immediate service required"
          icon={<AlertTriangle className="w-4 h-4 text-rose-400" />}
          variant={metrics.criticalCount > 0 ? "criticalGlow" : "default"}
        />
        <StatCard
          title="High Risk"
          value={metrics.highCount}
          subtext="Service within 1,000 km"
          icon={<Wrench className="w-4 h-4 text-amber-400" />}
        />
        <StatCard
          title="Nominal Assets"
          value={metrics.lowCount + metrics.mediumCount}
          subtext="Healthy powertrain systems"
          icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />}
        />
        <StatCard
          title="Mean Est. RUL"
          value={metrics.avgRul.toLocaleString()}
          unit="km"
          subtext="Fleet composite average"
          icon={<Clock className="w-4 h-4 text-cyan-400" />}
        />
      </div>

      {/* Row 1: Maintenance Risk Chart & Anomaly Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MaintenanceRiskChart
          vehicles={vehicles}
          predictions={predictionsMap}
        />
        <AnomalyIntelligencePanel
          anomalies={anomalies}
          vehicles={vehicles}
        />
      </div>

      {/* Row 2: Chronological Causality & Incident Timeline */}
      <IntelligenceTimeline
        vehicles={vehicles}
        predictions={predictionsMap}
        anomalies={anomalies}
        alerts={alerts}
      />

      {/* Row 3: Comprehensive Predictive Maintenance Asset Manifest */}
      <Card
        className="overflow-hidden shadow-card rounded-2xl"
        header={
          <div className="flex items-center gap-2">
            <Wrench className="w-4.5 h-4.5 text-blue-400" />
            <span className="font-bold text-[15px] text-slate-100 font-sans">Fleet Predictive Maintenance Manifest</span>
          </div>
        }
        headerAction={
          <span className="text-xs text-slate-400 font-mono font-medium">
            {vehicles.length} Total Vehicles Analyzed
          </span>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans text-xs sm:text-[13.5px]">
            <thead>
              <tr className="border-b border-[#1F2E47] text-slate-400 text-xs uppercase font-sans font-semibold bg-[#16253B]">
                <th className="py-3.5 pl-4">Vehicle</th>
                <th className="py-3.5">Health Status</th>
                <th className="py-3.5">Maint. Risk</th>
                <th className="py-3.5">Est. RUL</th>
                <th className="py-3.5">Contributing Factors</th>
                <th className="py-3.5">Prescriptive Recommendation</th>
                <th className="py-3.5 pr-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2E47] font-sans">
              {vehicles.map((v) => {
                const pred = predictionsMap[v.id];
                const isCrit = v.health_status === "CRITICAL" || pred?.risk_level === "CRITICAL";

                return (
                  <tr
                    key={v.id}
                    className={clsx(
                      "hover:bg-[#16253B]/50 transition-colors",
                      isCrit && "bg-rose-500/10"
                    )}
                  >
                    <td className="py-3.5 pl-4">
                      <div className="font-semibold text-white text-xs">{v.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {v.license_plate} · {v.model}
                      </div>
                    </td>

                    <td className="py-3.5">
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

                    <td className="py-3.5">
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

                    <td className="py-3.5 text-cyan-400 font-mono font-bold">
                      {pred ? `${pred.estimated_rul_km.toLocaleString()} km` : "—"}
                    </td>

                    <td className="py-3.5 text-slate-300 text-xs font-sans max-w-xs truncate">
                      {pred?.contributing_factors?.map((f) => f.factor).join(", ") || "Normal wear"}
                    </td>

                    <td className="py-3.5 text-slate-300 text-xs font-sans max-w-sm truncate">
                      {pred?.recommendation || "All systems nominal. Continue standard maintenance schedule."}
                    </td>

                    <td className="py-3.5 pr-4 text-right">
                      <Link to={`/vehicles?id=${v.id}`}>
                        <Button size="sm" variant="secondary" leftIcon={<ExternalLink className="w-3 h-3" />}>
                          Inspect
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
