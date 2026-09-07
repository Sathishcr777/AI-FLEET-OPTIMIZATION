import React from "react";
import { Card } from "../common/Card";
import { Button } from "../common/Button";
import { Vehicle } from "../../types/api";
import {
  Filter,
  Search,
  RotateCcw,
  Truck,
  Flame,
} from "lucide-react";
import { clsx } from "clsx";

export interface AlertFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  severityFilter: string;
  setSeverityFilter: (sev: string) => void;
  statusFilter: string;
  setStatusFilter: (st: string) => void;
  alertTypeFilter: string;
  setAlertTypeFilter: (type: string) => void;
  vehicleFilter: string;
  setVehicleFilter: (vId: string) => void;
  vehicles: Vehicle[];
  onReset: () => void;
  className?: string;
}

const ALERT_TYPES = [
  { value: "ALL", label: "All Alert Types" },
  { value: "ENGINE_OVERHEAT", label: "Engine Overheat" },
  { value: "LOW_OIL_PRESSURE", label: "Low Oil Pressure" },
  { value: "LOW_TIRE_PRESSURE", label: "Low Tire Pressure" },
  { value: "BATTERY_VOLTAGE", label: "Battery Low Voltage" },
  { value: "OVERSPEEDING", label: "Overspeeding" },
  { value: "HARSH_BRAKE", label: "Harsh Braking" },
  { value: "RAPID_ACCEL", label: "Rapid Acceleration" },
  { value: "EXCESSIVE_IDLE", label: "Excessive Idling" },
  { value: "TELEMETRY_ANOMALY", label: "Telemetry Anomaly" },
  { value: "HIGH_VEHICLE_HEALTH_RISK", label: "Vehicle Health Risk" },
  { value: "HIGH_MAINTENANCE_RISK", label: "High Maintenance Risk" },
  { value: "CRITICAL_MAINTENANCE_RISK", label: "Critical Maintenance Risk" },
];

export const AlertFilters: React.FC<AlertFiltersProps> = ({
  searchQuery,
  setSearchQuery,
  severityFilter,
  setSeverityFilter,
  statusFilter,
  setStatusFilter,
  alertTypeFilter,
  setAlertTypeFilter,
  vehicleFilter,
  setVehicleFilter,
  vehicles,
  onReset,
  className,
}) => {
  return (
    <Card
      className={clsx("flex flex-col h-full select-none shadow-card bg-[#111C2D] border border-[#1F2E47]", className)}
      header={
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-white font-sans">Incident Triage Filters</span>
        </div>
      }
      headerAction={
        <Button size="sm" variant="ghost" onClick={onReset} leftIcon={<RotateCcw className="w-3 h-3 text-slate-400" />}>
          Reset
        </Button>
      }
    >
      <div className="space-y-4 font-sans text-xs overflow-y-auto pr-1">
        {/* Search Input */}
        <div>
          <label className="text-[10px] uppercase text-slate-400 font-semibold mb-1 block font-mono tracking-wider">
            Search Incidents
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search alert title, message, ID..."
              className="w-full pl-9 pr-3 py-2 bg-[#0B0F19] border border-[#1F2E47] rounded-lg text-white placeholder:text-slate-500 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Severity Priority Filter */}
        <div>
          <label className="text-[10px] uppercase text-slate-400 font-semibold mb-1.5 block font-mono tracking-wider">
            Severity Level
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: "ALL", label: "All Severities", activeColor: "text-white" },
              { id: "CRITICAL", label: "Critical", color: "text-rose-400", activeColor: "text-rose-200" },
              { id: "HIGH", label: "High", color: "text-amber-400", activeColor: "text-amber-200" },
              { id: "MEDIUM", label: "Medium", color: "text-blue-400", activeColor: "text-blue-200" },
              { id: "LOW", label: "Low / Info", color: "text-slate-400", activeColor: "text-slate-200" },
            ].map((sev) => (
              <button
                key={sev.id}
                type="button"
                onClick={() => setSeverityFilter(sev.id)}
                className={clsx(
                  "px-2.5 py-1.5 rounded-lg border text-left font-semibold text-xs transition-all",
                  severityFilter === sev.id
                    ? "bg-blue-600/30 border-blue-500 text-white shadow-glowBlue font-bold"
                    : "bg-[#0B0F19] border-[#1F2E47] text-slate-400 hover:text-white hover:bg-[#16253B] hover:border-[#2A3F5F]"
                )}
              >
                <span className={severityFilter === sev.id ? sev.activeColor || "text-white" : sev.color || "text-slate-300"}>{sev.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Operational Status Filter */}
        <div>
          <label className="text-[10px] uppercase text-slate-400 font-semibold mb-1.5 block font-mono tracking-wider">
            Triage Status
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: "ALL", label: "All" },
              { id: "ACTIVE", label: "Active" },
              { id: "ACKNOWLEDGED", label: "Ack'd" },
              { id: "RESOLVED", label: "Resolved" },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={clsx(
                  "px-2 py-1.5 rounded-lg border text-center font-semibold text-xs transition-all",
                  statusFilter === st.id
                    ? "bg-blue-600/30 border-blue-500 text-white shadow-glowBlue font-bold"
                    : "bg-[#0B0F19] border-[#1F2E47] text-slate-400 hover:text-white hover:bg-[#16253B] hover:border-[#2A3F5F]"
                )}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Alert Type Dropdown */}
        <div>
          <label className="text-[10px] uppercase text-slate-400 font-semibold mb-1 flex items-center gap-1 font-mono tracking-wider">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Incident Subsystem / Type</span>
          </label>
          <select
            value={alertTypeFilter}
            onChange={(e) => setAlertTypeFilter(e.target.value)}
            className="w-full px-2.5 py-2 bg-[#0B0F19] border border-[#1F2E47] rounded-lg text-slate-200 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {ALERT_TYPES.map((t) => (
              <option key={t.value} value={t.value} className="bg-[#0B0F19] text-white">
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Vehicle Asset Filter */}
        <div>
          <label className="text-[10px] uppercase text-slate-400 font-semibold mb-1 flex items-center gap-1 font-mono tracking-wider">
            <Truck className="w-3.5 h-3.5 text-blue-400" />
            <span>Vehicle Asset Filter</span>
          </label>
          <select
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value)}
            className="w-full px-2.5 py-2 bg-[#0B0F19] border border-[#1F2E47] rounded-lg text-slate-200 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="ALL" className="bg-[#0B0F19] text-white">All Fleet Vehicles</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id} className="bg-[#0B0F19] text-white">
                {v.name} ({v.license_plate})
              </option>
            ))}
          </select>
        </div>
      </div>
    </Card>
  );
};

