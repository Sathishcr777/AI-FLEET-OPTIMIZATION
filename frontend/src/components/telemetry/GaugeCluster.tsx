import React from "react";
import { DialGauge } from "./DialGauge";
import { TelemetryPayload } from "../../types/telemetry";

export interface GaugeClusterProps {
  telemetry?: TelemetryPayload | null;
  className?: string;
}

export const GaugeCluster: React.FC<GaugeClusterProps> = ({ telemetry, className }) => {
  const speed = telemetry?.speed ?? 0;
  const rpm = telemetry?.rpm ?? 0;
  const temp = telemetry?.engine_temp_c ?? 0;
  const oil = telemetry?.oil_pressure_psi ?? 0;

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 ${className || ""}`}>
      {/* 1. Speedometer */}
      <DialGauge
        label="Speedometer"
        value={speed}
        min={0}
        max={140}
        unit="km/h"
        warningThreshold={90}
        criticalThreshold={105}
        thresholdDirection="above"
        size={120}
        decimals={1}
      />

      {/* 2. Tachometer */}
      <DialGauge
        label="Engine RPM"
        value={rpm}
        min={0}
        max={6000}
        unit="RPM"
        warningThreshold={3800}
        criticalThreshold={5500}
        thresholdDirection="above"
        size={120}
        decimals={0}
      />

      {/* 3. Coolant Temperature */}
      <DialGauge
        label="Coolant Temp"
        value={temp}
        min={40}
        max={130}
        unit="°C"
        warningThreshold={95}
        criticalThreshold={105}
        thresholdDirection="above"
        size={120}
        decimals={1}
      />

      {/* 4. Oil Pressure */}
      <DialGauge
        label="Oil Pressure"
        value={oil}
        min={0}
        max={80}
        unit="PSI"
        warningThreshold={30}
        criticalThreshold={20}
        thresholdDirection="below"
        size={120}
        decimals={1}
      />
    </div>
  );
};
