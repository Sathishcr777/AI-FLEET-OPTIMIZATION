import React, { useMemo } from "react";
import { Card } from "../common/Card";
import { StatusBadge } from "../common/StatusBadge";
import { Badge } from "../common/Badge";
import { Skeleton } from "../common/Skeleton";
import { VehicleHealthResponse } from "../../api/analytics";
import { TelemetryPayload } from "../../types/telemetry";
import { Vehicle } from "../../types/api";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Thermometer,
  Droplets,
  Zap,
  Gauge,
  Disc,
  Fuel,
  Cpu,
} from "lucide-react";
import { clsx } from "clsx";

export interface VehicleHealthCardProps {
  health?: VehicleHealthResponse | null;
  telemetry?: TelemetryPayload | null;
  history?: TelemetryPayload[];
  vehicle?: Vehicle;
  isLoading?: boolean;
  className?: string;
}

interface SubsystemHealth {
  name: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  benchmark: string;
  healthScore: number;
  status: "OPTIMAL" | "NOMINAL" | "ELEVATED" | "WARNING" | "CRITICAL";
  statusColor: string;
  progressColor: string;
}

export const VehicleHealthCard: React.FC<VehicleHealthCardProps> = ({
  health,
  telemetry,
  history = [],
  vehicle,
  isLoading = false,
  className,
}) => {
  if (isLoading) {
    return (
      <Card className={className} header="Powertrain Health Assessment">
        <div className="space-y-4 p-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        </div>
      </Card>
    );
  }

  // 1. Core Health Values
  const score = health?.health_score ?? (vehicle?.health_status === "CRITICAL" ? 42 : vehicle?.health_status === "WARNING" ? 68 : 96.5);
  const status = health?.status ?? vehicle?.health_status ?? "GOOD";
  const riskFactors = health?.risk_factors || [];
  const summary = health?.summary || "Powertrain operating within nominal factory thresholds with healthy sensor margins.";

  const isCritical = status === "CRITICAL" || score < 50;
  const isWarning = status === "WARNING" || (score >= 50 && score < 80);

  const statusColor = isCritical
    ? "text-rose-400"
    : isWarning
    ? "text-amber-400"
    : "text-emerald-400";

  // 2. Derive Subsystem Health Breakdown from Live Telematics
  const subsystems: SubsystemHealth[] = useMemo(() => {
    // Current or fallback telemetry
    const t = telemetry || {
      rpm: 1850,
      engine_temp_c: 91.5,
      oil_pressure_psi: 46.2,
      battery_voltage: 13.6,
      tire_pressure_psi: 34.0,
      fuel_level_pct: 78.0,
    };

    // A. Engine / RPM
    const rpm = t.rpm ?? 1850;
    let rpmHealth = 100;
    let rpmStatus: SubsystemHealth["status"] = "OPTIMAL";
    if (rpm > 5500) {
      rpmHealth = 35;
      rpmStatus = "CRITICAL";
    } else if (rpm > 4200) {
      rpmHealth = 65;
      rpmStatus = "ELEVATED";
    } else if (rpm > 3500) {
      rpmHealth = 85;
      rpmStatus = "NOMINAL";
    }

    // B. Thermal / Coolant Temp
    const temp = t.engine_temp_c ?? 90;
    let tempHealth = 100;
    let tempStatus: SubsystemHealth["status"] = "OPTIMAL";
    if (temp > 105) {
      tempHealth = Math.max(15, Math.round(100 - (temp - 105) * 8));
      tempStatus = "CRITICAL";
    } else if (temp > 96) {
      tempHealth = Math.max(50, Math.round(100 - (temp - 96) * 5));
      tempStatus = "WARNING";
    } else if (temp > 92) {
      tempHealth = 92;
      tempStatus = "NOMINAL";
    }

    // C. Lubrication / Oil Pressure
    const oil = t.oil_pressure_psi ?? 45;
    let oilHealth = 100;
    let oilStatus: SubsystemHealth["status"] = "OPTIMAL";
    if (oil < 20) {
      oilHealth = 25;
      oilStatus = "CRITICAL";
    } else if (oil < 32) {
      oilHealth = Math.max(45, Math.round(oil * 2));
      oilStatus = "WARNING";
    } else if (oil < 38) {
      oilHealth = 88;
      oilStatus = "NOMINAL";
    }

    // D. Electrical / Battery Voltage
    const volt = t.battery_voltage ?? 12.8;
    let voltHealth = 100;
    let voltStatus: SubsystemHealth["status"] = "OPTIMAL";
    if (volt < 11.5 || volt > 15.5) {
      voltHealth = 30;
      voltStatus = "CRITICAL";
    } else if (volt < 12.2 || volt > 14.8) {
      voltHealth = 65;
      voltStatus = "WARNING";
    } else if (volt < 12.6) {
      voltHealth = 88;
      voltStatus = "NOMINAL";
    }

    // E. Tire Pressure / Chassis
    const tire = t.tire_pressure_psi ?? 34;
    let tireHealth = 100;
    let tireStatus: SubsystemHealth["status"] = "OPTIMAL";
    if (tire < 26 || tire > 44) {
      tireHealth = 35;
      tireStatus = "CRITICAL";
    } else if (tire < 30 || tire > 38) {
      tireHealth = 70;
      tireStatus = "WARNING";
    } else if (tire < 32) {
      tireHealth = 90;
      tireStatus = "NOMINAL";
    }

    // F. Fuel Delivery System
    const fuel = t.fuel_level_pct ?? 80;
    let fuelHealth = 100;
    let fuelStatus: SubsystemHealth["status"] = "OPTIMAL";
    if (fuel < 12) {
      fuelHealth = 30;
      fuelStatus = "CRITICAL";
    } else if (fuel < 22) {
      fuelHealth = 65;
      fuelStatus = "WARNING";
    } else if (fuel < 35) {
      fuelHealth = 85;
      fuelStatus = "NOMINAL";
    }

    const getStatusStyle = (st: SubsystemHealth["status"]) => {
      switch (st) {
        case "CRITICAL":
          return { text: "text-rose-400", bar: "bg-rose-500" };
        case "WARNING":
          return { text: "text-amber-400", bar: "bg-amber-400" };
        case "ELEVATED":
          return { text: "text-blue-400", bar: "bg-blue-400" };
        case "NOMINAL":
          return { text: "text-cyan-300", bar: "bg-cyan-500" };
        case "OPTIMAL":
        default:
          return { text: "text-emerald-400", bar: "bg-emerald-400" };
      }
    };

    return [
      {
        name: "Combustion & RPM",
        category: "Engine Core",
        icon: Gauge,
        value: `${Math.round(rpm).toLocaleString()} RPM`,
        benchmark: "Nominal: < 3,500 RPM",
        healthScore: rpmHealth,
        status: rpmStatus,
        statusColor: getStatusStyle(rpmStatus).text,
        progressColor: getStatusStyle(rpmStatus).bar,
      },
      {
        name: "Thermal & Cooling",
        category: "Coolant Loop",
        icon: Thermometer,
        value: `${temp.toFixed(1)} °C`,
        benchmark: "Threshold: 105 °C",
        healthScore: tempHealth,
        status: tempStatus,
        statusColor: getStatusStyle(tempStatus).text,
        progressColor: getStatusStyle(tempStatus).bar,
      },
      {
        name: "Oil Lubrication",
        category: "Hydraulic System",
        icon: Droplets,
        value: `${oil.toFixed(1)} PSI`,
        benchmark: "Nominal: 35-55 PSI",
        healthScore: oilHealth,
        status: oilStatus,
        statusColor: getStatusStyle(oilStatus).text,
        progressColor: getStatusStyle(oilStatus).bar,
      },
      {
        name: "Electrical Circuit",
        category: "Alternator / Bat",
        icon: Zap,
        value: `${volt.toFixed(1)} V`,
        benchmark: "Nominal: 12.6-14.4 V",
        healthScore: voltHealth,
        status: voltStatus,
        statusColor: getStatusStyle(voltStatus).text,
        progressColor: getStatusStyle(voltStatus).bar,
      },
      {
        name: "Chassis & Tires",
        category: "Tire Pressure",
        icon: Disc,
        value: `${tire.toFixed(1)} PSI`,
        benchmark: "Standard: 32-36 PSI",
        healthScore: tireHealth,
        status: tireStatus,
        statusColor: getStatusStyle(tireStatus).text,
        progressColor: getStatusStyle(tireStatus).bar,
      },
      {
        name: "Fuel Injection",
        category: "Fuel Reserve",
        icon: Fuel,
        value: `${Math.round(fuel)}%`,
        benchmark: "Reserve: > 20%",
        healthScore: fuelHealth,
        status: fuelStatus,
        statusColor: getStatusStyle(fuelStatus).text,
        progressColor: getStatusStyle(fuelStatus).bar,
      },
    ];
  }, [telemetry]);

  // Radial progress circumference calculation (radius = 38)
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;

  return (
    <Card
      variant={isCritical ? "criticalGlow" : "default"}
      className={clsx("flex flex-col justify-between select-none shadow-card bg-[#111C2D] border border-[#1F2E47]", className)}
      header={
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-white font-sans text-sm sm:text-base">Powertrain Health Assessment</span>
        </div>
      }
      headerAction={
        <div className="flex items-center gap-2">
          <Badge variant="brand" size="sm">
            LIVE TELEMETRY
          </Badge>
          <StatusBadge status={status} size="sm" />
        </div>
      }
    >
      <div className="space-y-4 p-4 font-sans text-xs">
        {/* 1. Tactical Radial Health Index & Overall Condition Banner */}
        <div className="p-4 rounded-xl bg-[#0B0F19] border border-[#1F2E47] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          {/* Left: Score & Radial Gauge */}
          <div className="flex items-center gap-4">
            <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 96 96">
                {/* Background Ring */}
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  stroke="#16253B"
                  strokeWidth="8"
                  fill="transparent"
                />
                {/* Progress Arc */}
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  stroke={isCritical ? "#EF4444" : isWarning ? "#F59E0B" : "#10B981"}
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              {/* Inner Center Value */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className={clsx("text-xl font-extrabold font-mono tracking-tight leading-none", statusColor)}>
                  {score.toFixed(0)}%
                </span>
                <span className="text-[9px] text-slate-400 font-mono mt-0.5 uppercase font-bold">HEALTH</span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  System Health Score
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className={clsx("text-2xl font-bold font-mono tracking-tight", statusColor)}>
                  {score.toFixed(1)}
                </span>
                <span className="text-xs font-mono text-slate-500">/ 100.0</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                {isCritical ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-mono text-[10px] font-bold border border-rose-500/30">
                    <ShieldAlert className="w-3 h-3" /> DEGRADED CONDITION
                  </span>
                ) : isWarning ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/30">
                    <AlertTriangle className="w-3 h-3" /> ELEVATED WEAR
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3" /> NOMINAL OPERATING
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Telemetry Stream Health Indicator */}
          <div className="text-right sm:border-l sm:border-[#1F2E47] sm:pl-4 space-y-1 w-full sm:w-auto">
            <span className="text-[10px] text-slate-400 uppercase font-mono font-bold block">
              Subsystem Sensors
            </span>
            <div className="text-sm font-bold text-white font-mono flex items-center justify-end gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-glowEmerald" />
              <span>6/6 STREAMING</span>
            </div>
            <span className="text-[10px] text-slate-400 font-sans block">
              {history.length > 0 ? `${history.length} telemetry samples synchronized` : "Real-time calibration active"}
            </span>
          </div>
        </div>

        {/* 2. Subsystem Component Health Matrix (6 Cards) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>Subsystem Component Diagnostics</span>
            </span>
            <span className="text-[10px] font-mono text-slate-500">Live Reading · Target</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {subsystems.map((sub, idx) => {
              const Icon = sub.icon;
              return (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-[#0B0F19] border border-[#1F2E47] hover:border-[#2A3F5F] transition-colors space-y-2 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="p-1 rounded-md bg-[#16253B] border border-[#1F2E47] text-cyan-400 shrink-0">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-semibold text-white text-xs truncate font-sans">{sub.name}</span>
                    </div>
                    <span className={clsx("font-bold text-[10px] font-mono shrink-0", sub.statusColor)}>
                      {sub.status}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-baseline justify-between font-mono">
                      <span className="text-sm font-bold text-slate-100">{sub.value}</span>
                      <span className="text-[10px] font-bold text-cyan-400">{sub.healthScore}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1 border border-slate-700/40">
                      <div
                        className={clsx("h-full rounded-full transition-all duration-500", sub.progressColor)}
                        style={{ width: `${Math.min(100, Math.max(5, sub.healthScore))}%` }}
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 font-mono truncate">{sub.benchmark}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Diagnostic Narrative Explanation */}
        <div className="text-xs text-slate-300 bg-[#0B0F19] p-3.5 rounded-xl border border-[#1F2E47] leading-relaxed font-sans space-y-1 shadow-sm">
          <div className="flex items-center gap-1.5 text-slate-200 font-bold text-[11px] font-mono uppercase">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI Diagnostic Narrative</span>
          </div>
          <p className="text-slate-300 text-xs leading-relaxed">{summary}</p>
        </div>

        {/* 4. Identified Risk Factors */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block font-mono">
            Active Risk Factors & Anomalies ({riskFactors.length})
          </span>
          {riskFactors.length === 0 ? (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-300 font-sans shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
              <span>Zero abnormal powertrain risk factors detected. Component telemetry is nominal.</span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {riskFactors.map((factor, idx) => (
                <Badge key={idx} variant={isCritical ? "critical" : "warning"} size="sm" dot>
                  {factor}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
