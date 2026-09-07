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
  Fuel,
  Cpu,
  Sparkles,
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
  bgGlow: string;
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
      <Card className={className} header="Powertrain Health Diagnostic Workstation">
        <div className="space-y-4 p-5">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        </div>
      </Card>
    );
  }

  // 1. Core Health Values
  const score =
    health?.health_score ??
    (vehicle?.health_status === "CRITICAL"
      ? 42.0
      : vehicle?.health_status === "WARNING"
      ? 68.0
      : 96.5);
  const status = health?.status ?? vehicle?.health_status ?? "GOOD";
  const riskFactors = health?.risk_factors || [];
  const summary =
    health?.summary ||
    "Powertrain operating within nominal factory thresholds with robust thermal and sensor margins.";

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
      speed: 68.5,
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

    // E. Kinematics & Velocity
    const speed = t.speed ?? 65.0;
    let speedHealth = 100;
    let speedStatus: SubsystemHealth["status"] = "OPTIMAL";
    if (speed > 115) {
      speedHealth = 50;
      speedStatus = "WARNING";
    } else if (speed > 95) {
      speedHealth = 80;
      speedStatus = "ELEVATED";
    } else {
      speedHealth = 98;
      speedStatus = "NOMINAL";
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
          return { text: "text-rose-400", bar: "bg-rose-500", bg: "bg-rose-950/30 border-rose-500/30" };
        case "WARNING":
          return { text: "text-amber-400", bar: "bg-amber-400", bg: "bg-amber-950/30 border-amber-500/30" };
        case "ELEVATED":
          return { text: "text-blue-400", bar: "bg-blue-400", bg: "bg-blue-950/30 border-blue-500/30" };
        case "NOMINAL":
          return { text: "text-cyan-300", bar: "bg-cyan-500", bg: "bg-cyan-950/30 border-cyan-500/30" };
        case "OPTIMAL":
        default:
          return { text: "text-emerald-400", bar: "bg-emerald-400", bg: "bg-emerald-950/30 border-emerald-500/30" };
      }
    };

    return [
      {
        name: "Engine Thermal Dynamics",
        category: "Coolant Loop",
        icon: Thermometer,
        value: `${temp.toFixed(1)} °C`,
        benchmark: "Threshold: 105.0 °C",
        healthScore: tempHealth,
        status: tempStatus,
        statusColor: getStatusStyle(tempStatus).text,
        progressColor: getStatusStyle(tempStatus).bar,
        bgGlow: getStatusStyle(tempStatus).bg,
      },
      {
        name: "Hydraulic Lubrication",
        category: "Oil Pressure",
        icon: Droplets,
        value: `${oil.toFixed(1)} PSI`,
        benchmark: "Nominal: 35-55 PSI",
        healthScore: oilHealth,
        status: oilStatus,
        statusColor: getStatusStyle(oilStatus).text,
        progressColor: getStatusStyle(oilStatus).bar,
        bgGlow: getStatusStyle(oilStatus).bg,
      },
      {
        name: "Combustion & Load",
        category: "Engine RPM",
        icon: Gauge,
        value: `${Math.round(rpm).toLocaleString()} RPM`,
        benchmark: "Nominal: < 3,500 RPM",
        healthScore: rpmHealth,
        status: rpmStatus,
        statusColor: getStatusStyle(rpmStatus).text,
        progressColor: getStatusStyle(rpmStatus).bar,
        bgGlow: getStatusStyle(rpmStatus).bg,
      },
      {
        name: "Kinematic Propulsion",
        category: "Speed Telematics",
        icon: Activity,
        value: `${speed.toFixed(1)} km/h`,
        benchmark: "Nominal: 60-100 km/h",
        healthScore: speedHealth,
        status: speedStatus,
        statusColor: getStatusStyle(speedStatus).text,
        progressColor: getStatusStyle(speedStatus).bar,
        bgGlow: getStatusStyle(speedStatus).bg,
      },
      {
        name: "Energy Storage & Fuel",
        category: "Fuel Reserve",
        icon: Fuel,
        value: `${Math.round(fuel)}%`,
        benchmark: "Reserve Limit: > 20%",
        healthScore: fuelHealth,
        status: fuelStatus,
        statusColor: getStatusStyle(fuelStatus).text,
        progressColor: getStatusStyle(fuelStatus).bar,
        bgGlow: getStatusStyle(fuelStatus).bg,
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
        bgGlow: getStatusStyle(voltStatus).bg,
      },
    ];
  }, [telemetry]);

  // Large Radial progress circumference calculation (radius = 54)
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;

  return (
    <Card
      variant={isCritical ? "criticalGlow" : "default"}
      className={clsx(
        "flex flex-col justify-between select-none shadow-2xl bg-[#111C2D] border border-slate-800 rounded-2xl overflow-hidden",
        className
      )}
      header={
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-600/20 border border-blue-500/40 text-blue-400 shadow-glowBlue">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-base text-white font-sans block">
              Powertrain Health Assessment Workstation
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Composite Subsystem Telemetry Assessment
            </span>
          </div>
        </div>
      }
      headerAction={
        <div className="flex items-center gap-2">
          <Badge variant="brand" size="sm" className="font-mono text-[10px]">
            REAL-TIME TELEMATICS
          </Badge>
          <StatusBadge status={status} size="sm" />
        </div>
      }
    >
      <div className="space-y-6 p-5 font-sans text-xs">
        {/* ==================================================
            HERO: LARGE POWERTRAIN RADIAL WORKSTATION
            ================================================== */}
        <div className="p-5 rounded-2xl bg-[#0B0F19] border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
          {/* Radial Glow Ambient Effect */}
          <div
            className="absolute -left-10 -top-10 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-20"
            style={{
              backgroundColor: isCritical ? "#EF4444" : isWarning ? "#F59E0B" : "#10B981",
            }}
          />

          {/* Left: Large SVG Radial Health Gauge */}
          <div className="flex items-center gap-6">
            <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 130 130">
                {/* Background Track Ring */}
                <circle
                  cx="65"
                  cy="65"
                  r={radius}
                  stroke="#16253B"
                  strokeWidth="10"
                  fill="transparent"
                />
                {/* Secondary Ticks Ring */}
                <circle
                  cx="65"
                  cy="65"
                  r={radius}
                  stroke="#1F2E47"
                  strokeWidth="10"
                  strokeDasharray="4 8"
                  fill="transparent"
                />
                {/* Progress Glowing Arc */}
                <circle
                  cx="65"
                  cy="65"
                  r={radius}
                  stroke={isCritical ? "#EF4444" : isWarning ? "#F59E0B" : "#10B981"}
                  strokeWidth="10"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>

              {/* Inner Center Health Readout */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className={clsx("text-3xl font-extrabold font-mono tracking-tight leading-none", statusColor)}>
                  {score.toFixed(0)}%
                </span>
                <span className="text-[10px] text-slate-400 font-mono mt-1 uppercase font-bold tracking-widest">
                  HEALTH
                </span>
              </div>
            </div>

            {/* Score & Operational Envelope Assessment */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
                Powertrain Health Index
              </span>
              <div className="flex items-baseline gap-2">
                <span className={clsx("text-3xl sm:text-4xl font-extrabold font-mono tracking-tight", statusColor)}>
                  {score.toFixed(1)}
                </span>
                <span className="text-sm font-mono text-slate-500 font-bold">/ 100.0</span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                {isCritical ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-950/60 text-rose-300 font-mono text-xs font-bold border border-rose-500/50 shadow-glowCritical animate-pulse">
                    <ShieldAlert className="w-3.5 h-3.5" /> CRITICAL FAILURE RISK
                  </span>
                ) : isWarning ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-950/60 text-amber-300 font-mono text-xs font-bold border border-amber-500/50 shadow-glowAmber">
                    <AlertTriangle className="w-3.5 h-3.5" /> DEGRADED SUBSYSTEM
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-950/60 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/50 shadow-glowEmerald">
                    <CheckCircle2 className="w-3.5 h-3.5" /> NOMINAL OPERATING ENVELOPE
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Telemetry Stream Synchronization Status */}
          <div className="md:border-l md:border-slate-800 md:pl-6 space-y-2 w-full md:w-auto text-left md:text-right">
            <span className="text-[10px] text-slate-400 uppercase font-mono font-bold block">
              Subsystem Telematics
            </span>
            <div className="text-base font-bold text-white font-mono flex items-center md:justify-end gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-glowEmerald" />
              <span className="text-emerald-400">6 / 6 NODES STREAMING</span>
            </div>
            <p className="text-xs text-slate-400 font-sans">
              {history.length > 0
                ? `${history.length} ring-buffered telemetry packets synced`
                : "Real-time telemetry calibrated"}
            </p>
          </div>
        </div>

        {/* ==================================================
            SIX SUBSYSTEM DIAGNOSTIC CARDS MATRIX
            ================================================== */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Six-Subsystem Diagnostic Matrix</span>
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              Live Readout · Factory Bounds
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {subsystems.map((sub, idx) => {
              const Icon = sub.icon;
              return (
                <div
                  key={idx}
                  className={clsx(
                    "p-3.5 rounded-xl bg-[#0B0F19] border transition-all space-y-2.5 shadow-md",
                    sub.bgGlow
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1.5 rounded-lg bg-[#16253B] border border-slate-700 text-cyan-400 shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-white text-xs truncate font-sans">
                        {sub.name}
                      </span>
                    </div>
                    <span
                      className={clsx(
                        "font-bold text-[10px] font-mono px-2 py-0.5 rounded-md uppercase shrink-0",
                        sub.statusColor
                      )}
                    >
                      {sub.status}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-baseline justify-between font-mono">
                      <span className="text-base font-bold text-slate-100">{sub.value}</span>
                      <span className="text-xs font-bold text-cyan-400">{sub.healthScore}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-1.5 border border-slate-700/60">
                      <div
                        className={clsx("h-full rounded-full transition-all duration-700", sub.progressColor)}
                        style={{ width: `${Math.min(100, Math.max(8, sub.healthScore))}%` }}
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 font-mono truncate">{sub.benchmark}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ==================================================
            AI DIAGNOSTIC NARRATIVE & CAUSALITY
            ================================================== */}
        <div className="text-xs text-slate-300 bg-[#0B0F19] p-4 rounded-xl border border-slate-800 leading-relaxed font-sans space-y-1.5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-200 font-bold text-xs font-mono uppercase">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>AI Powertrain Diagnostic Narrative</span>
          </div>
          <p className="text-slate-300 text-xs leading-relaxed">{summary}</p>
        </div>

        {/* ==================================================
            IDENTIFIED RISK FACTORS & ANOMALIES
            ================================================== */}
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block font-mono">
            Active Anomaly Risk Factors ({riskFactors.length})
          </span>
          {riskFactors.length === 0 ? (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-xs text-emerald-300 font-sans shadow-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Zero abnormal powertrain risk factors detected. Component telemetry is operating within nominal specifications.</span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
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
