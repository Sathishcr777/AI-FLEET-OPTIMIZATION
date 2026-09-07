import React from "react";
import { Link } from "react-router-dom";
import { Card } from "../common/Card";
import { SeverityBadge } from "../common/SeverityBadge";
import { Badge } from "../common/Badge";
import { Skeleton } from "../common/Skeleton";
import { Alert } from "../../types/alerts";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { clsx } from "clsx";

export interface DriverAlertsPanelProps {
  alerts: Alert[];
  isLoading?: boolean;
  className?: string;
}

export const DriverAlertsPanel: React.FC<DriverAlertsPanelProps> = ({
  alerts,
  isLoading = false,
  className,
}) => {
  return (
    <Card
      className={clsx("flex flex-col select-none shadow-card", className)}
      header={
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-500" />
          <span className="font-semibold text-slate-900 font-sans">Driver Behavioral Alerts & Incidents</span>
        </div>
      }
      headerAction={
        <Link
          to="/alerts"
          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-sans font-medium transition-colors"
        >
          <span>Alerts Workspace</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      }
    >
      {isLoading ? (
        <div className="space-y-2.5">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-sans">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>No active safety violations or behavioral alerts registered for this driver.</span>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-60 overflow-y-auto">
          {alerts.slice(0, 5).map((alert) => (
            <div
              key={alert.id}
              className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-3 font-sans"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={alert.severity} size="sm" />
                  <span className="text-xs font-bold text-slate-900">{alert.title}</span>
                  <Badge variant={alert.status === "ACTIVE" ? "critical" : "brand"} size="sm">
                    {alert.status}
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 font-sans">{alert.message}</p>
              </div>

              <div className="text-right text-[11px] text-slate-500 font-mono shrink-0">
                {new Date(alert.created_at || alert.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

