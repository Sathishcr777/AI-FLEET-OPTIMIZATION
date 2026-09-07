import React, { useState } from "react";
import { Drawer } from "../common/Drawer";
import { Button } from "../common/Button";
import { Badge } from "../common/Badge";
import { Play, RotateCcw, CheckCircle2, AlertTriangle, Radio } from "lucide-react";
import { scenariosApi } from "../../api/scenarios";
import { ScenarioType } from "../../types/scenarios";

export interface ScenarioDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicles?: { id: string; name: string; license_plate: string }[];
}

const SCENARIOS: { type: ScenarioType; label: string; severity: "NORMAL" | "ABNORMAL" | "EXTREME"; desc: string }[] = [
  { type: "NORMAL_HIGHWAY", label: "Normal Highway Cruising", severity: "NORMAL", desc: "Speed ~75 km/h, normal coolant temp & oil pressure." },
  { type: "NORMAL_URBAN", label: "Normal Urban Stop & Go", severity: "NORMAL", desc: "City delivery speed ~35 km/h, occasional idle dwell." },
  { type: "HARSH_BRAKE", label: "Harsh Braking Event", severity: "ABNORMAL", desc: "Emergency deceleration dropping > 20 km/h." },
  { type: "RAPID_ACCEL", label: "Rapid Acceleration", severity: "ABNORMAL", desc: "Aggressive throttle surge and high RPM spike." },
  { type: "OVERSPEEDING", label: "Overspeeding Violation", severity: "ABNORMAL", desc: "High-speed cruising exceeding 105 km/h limit." },
  { type: "EXCESSIVE_IDLE", label: "Excessive Engine Idling", severity: "ABNORMAL", desc: "Stationary vehicle running with 0 km/h for > 3 minutes." },
  { type: "ENGINE_OVERHEAT", label: "Severe Engine Overheating", severity: "EXTREME", desc: "Coolant temperature exceeds 115°C critical threshold." },
  { type: "LOW_OIL_PRESSURE", label: "Dangerously Low Oil Pressure", severity: "EXTREME", desc: "Oil pressure drops below 15 PSI cylinder risk threshold." },
  { type: "COMPONENT_WEAR", label: "Elevated Component Degradation", severity: "ABNORMAL", desc: "Tire underinflation and thermal instability drift." },
  { type: "SENSOR_GLITCH", label: "Sensor Signal Malfunction", severity: "EXTREME", desc: "Erratic RPM & temperature spikes to trigger AI anomaly detection." },
];

export const ScenarioDrawer: React.FC<ScenarioDrawerProps> = ({
  open,
  onOpenChange,
  vehicles = [],
}) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(
    vehicles[0]?.id || "22222222-2222-2222-2222-222222222001"
  );
  const [durationSeconds, setDurationSeconds] = useState<number>(30);
  const [loadingScenario, setLoadingScenario] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleTrigger = async (scenario: ScenarioType) => {
    setLoadingScenario(scenario);
    setStatusMessage(null);
    try {
      const res = await scenariosApi.trigger({
        vehicle_id: selectedVehicleId,
        scenario,
        duration_seconds: durationSeconds,
      });
      setStatusMessage(res.message);
    } catch (err) {
      setStatusMessage(`Error: ${err instanceof Error ? err.message : "Trigger failed"}`);
    } finally {
      setLoadingScenario(null);
    }
  };

  const handleResetAll = async () => {
    setLoadingScenario("RESET");
    setStatusMessage(null);
    try {
      await scenariosApi.resetAll();
      setStatusMessage("All fleet vehicles successfully reset to normal cruising baseline.");
    } catch (err) {
      setStatusMessage(`Error: ${err instanceof Error ? err.message : "Reset failed"}`);
    } finally {
      setLoadingScenario(null);
    }
  };

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Telemetry Simulation Cockpit"
      description="Inject abnormal telematics anomalies and operating events into the live vehicle fleet stream."
      width="lg"
      footer={
        <Button
          variant="secondary"
          size="md"
          onClick={handleResetAll}
          isLoading={loadingScenario === "RESET"}
          leftIcon={<RotateCcw className="w-4 h-4 text-slate-400" />}
          className="w-full bg-[#111C2D] border border-slate-700 hover:border-slate-600 hover:bg-[#16253B] text-slate-200"
        >
          Reset Entire Fleet to Normal Baseline
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Target Vehicle Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-blue-400" />
            Target Telemetry Node
          </label>
          <select
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm bg-[#0B0F19] border border-slate-700/80 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 font-mono tracking-wide"
          >
            {vehicles.length > 0 ? (
              vehicles.map((v) => (
                <option key={v.id} value={v.id} className="bg-[#111C2D] text-slate-100">
                  {v.name} ({v.license_plate})
                </option>
              ))
            ) : (
              <option value="22222222-2222-2222-2222-222222222001" className="bg-[#111C2D] text-slate-100">
                Vehicle #1 (FL-1001) – Heavy Hauler
              </option>
            )}
          </select>
        </div>

        {/* Duration Slider */}
        <div className="p-4 rounded-xl bg-[#0B0F19]/80 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Injection Duration
            </label>
            <span className="font-mono text-sm text-cyan-400 font-bold bg-cyan-950/60 border border-cyan-500/30 px-2.5 py-0.5 rounded">
              {durationSeconds} seconds
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="120"
            step="5"
            value={durationSeconds}
            onChange={(e) => setDurationSeconds(Number(e.target.value))}
            className="w-full accent-cyan-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[11px] font-mono text-slate-500">
            <span>10s (Burst)</span>
            <span>60s (Standard)</span>
            <span>120s (Extended)</span>
          </div>
        </div>

        {statusMessage && (
          <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/30 text-xs text-blue-200 font-mono flex items-start gap-2.5 shadow-glow-sm">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{statusMessage}</span>
          </div>
        )}

        {/* Scenarios List */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Available Fault Injection Scenarios
          </label>

          <div className="space-y-2.5">
            {SCENARIOS.map((sc) => (
              <div
                key={sc.type}
                className="p-3.5 rounded-xl bg-[#0B0F19] border border-slate-800/80 hover:border-slate-700 transition-all flex items-start justify-between gap-3 group"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-200 group-hover:text-blue-400 transition-colors">
                      {sc.label}
                    </span>
                    <Badge
                      variant={
                        sc.severity === "EXTREME"
                          ? "critical"
                          : sc.severity === "ABNORMAL"
                          ? "warning"
                          : "success"
                      }
                      size="sm"
                    >
                      {sc.severity}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans">{sc.desc}</p>
                </div>

                <Button
                  size="sm"
                  variant={sc.severity === "EXTREME" ? "critical" : "secondary"}
                  onClick={() => handleTrigger(sc.type)}
                  isLoading={loadingScenario === sc.type}
                  leftIcon={<Play className="w-3.5 h-3.5" />}
                  className="shrink-0"
                >
                  Inject
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Drawer>
  );
};


