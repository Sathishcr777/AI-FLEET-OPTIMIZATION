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
      className={clsx("flex flex-col h-full select-none shadow-card", className)}
      header={
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-slate-900 font-sans">Incident Triage Filters</span>
        </div>
      }
      headerAction={
        <Button size="sm" variant="ghost" onClick={onReset} leftIcon={<RotateCcw className="w-3 h-3" />}>
          Reset
        </Button>
      }
    >
      <div className="space-y-4 font-sans text-xs overflow-y-auto pr-1">
        {/* Search Input */}
        <div>
          <label className="text-[10px] uppercase text-slate-500 font-semibold mb-1 block">
            Search Incidents
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search alert title, message, ID..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
            />
          </div>
        </div>

        {/* Severity Priority Filter */}
        <div>
          <label className="text-[10px] uppercase text-slate-500 font-semibold mb-1.5 block">
            Severity Level
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: "ALL", label: "All Severities" },
              { id: "CRITICAL", label: "Critical", color: "text-rose-600" },
              { id: "HIGH", label: "High", color: "text-rose-600" },
              { id: "MEDIUM", label: "Medium", color: "text-amber-600" },
              { id: "LOW", label: "Low / Info", color: "text-blue-600" },
            ].map((sev) => (
              <button
                key={sev.id}
                type="button"
                onClick={() => setSeverityFilter(sev.id)}
                className={clsx(
                  "px-2.5 py-1.5 rounded-lg border text-left font-semibold text-xs transition-colors",
                  severityFilter === sev.id
                    ? "bg-blue-50 border-blue-600 text-blue-700 shadow-sm"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                )}
              >
                <span className={sev.color || "text-slate-700"}>{sev.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Operational Status Filter */}
        <div>
          <label className="text-[10px] uppercase text-slate-500 font-semibold mb-1.5 block">
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
                  "px-2 py-1.5 rounded-lg border text-center font-semibold text-xs transition-colors",
                  statusFilter === st.id
                    ? "bg-blue-50 border-blue-600 text-blue-700 shadow-sm"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                )}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Alert Type Dropdown */}
        <div>
          <label className="text-[10px] uppercase text-slate-500 font-semibold mb-1 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Incident Subsystem / Type</span>
          </label>
          <select
            value={alertTypeFilter}
            onChange={(e) => setAlertTypeFilter(e.target.value)}
            className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          >
            {ALERT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Vehicle Asset Filter */}
        <div>
          <label className="text-[10px] uppercase text-slate-500 font-semibold mb-1 flex items-center gap-1">
            <Truck className="w-3.5 h-3.5 text-blue-600" />
            <span>Vehicle Asset Filter</span>
          </label>
          <select
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value)}
            className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          >
            <option value="ALL">All Fleet Vehicles</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.license_plate})
              </option>
            ))}
          </select>
        </div>
      </div>
    </Card>
  );
};

