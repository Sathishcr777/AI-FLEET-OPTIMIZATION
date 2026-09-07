import React from "react";
import { Alert } from "../../types/alerts";
import { SeverityBadge } from "../common/SeverityBadge";
import { Badge } from "../common/Badge";
import { Vehicle, Driver } from "../../types/api";
import { Truck, User, Clock } from "lucide-react";
import { clsx } from "clsx";

export interface AlertCardProps {
  alert: Alert;
  vehicle?: Vehicle | null;
  driver?: Driver | null;
  isSelected?: boolean;
  onSelect: (alert: Alert) => void;
}

export const AlertCard: React.FC<AlertCardProps> = ({
  alert,
  vehicle,
  driver,
  isSelected = false,
  onSelect,
}) => {
  const isCritical = alert.severity === "CRITICAL";
  const isResolved = alert.status === "RESOLVED";
  const isAck = alert.status === "ACKNOWLEDGED";

  const timeStr = React.useMemo(() => {
    try {
      const d = new Date(alert.created_at || alert.timestamp);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return "Recent";
    }
  }, [alert]);

  return (
    <div
      onClick={() => onSelect(alert)}
      className={clsx(
        "p-3.5 rounded-xl border cursor-pointer font-sans text-xs select-none transition-all duration-150 space-y-2 shadow-sm",
        isSelected
          ? "bg-blue-950/40 border-blue-500 ring-1 ring-blue-500 shadow-glowBlue"
          : isCritical && !isResolved
          ? "bg-rose-950/25 border-rose-500/40 hover:border-rose-500/70 hover:bg-rose-950/35"
          : "bg-[#0B0F19] border-[#1F2E47] hover:border-[#2A3F5F] hover:bg-[#16253B]"
      )}
    >
      {/* Header Row: Severity, Title, Status */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 truncate">
          <SeverityBadge severity={alert.severity} size="sm" />
          <span className="font-semibold text-white text-xs truncate">{alert.title}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isResolved ? (
            <Badge variant="success" size="sm" dot>
              RESOLVED
            </Badge>
          ) : isAck ? (
            <Badge variant="warning" size="sm" dot>
              ACKNOWLEDGED
            </Badge>
          ) : (
            <Badge variant="critical" size="sm" dot>
              ACTIVE
            </Badge>
          )}
        </div>
      </div>

      {/* Message Preview */}
      <p className="text-slate-300 font-sans text-xs line-clamp-2 leading-relaxed">
        {alert.message}
      </p>

      {/* Footer Row: Asset Context, Driver, Time */}
      <div className="pt-2 border-t border-[#1F2E47] flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-2.5 truncate">
          <span className="flex items-center gap-1 text-slate-200 truncate font-medium">
            <Truck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="truncate font-mono">{vehicle ? vehicle.name : alert.vehicle_id.slice(0, 8)}</span>
          </span>

          {driver && (
            <span className="flex items-center gap-1 text-slate-400 truncate hidden sm:flex font-normal">
              <User className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="truncate">{driver.name}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono shrink-0">
          <Clock className="w-3 h-3" />
          <span>{timeStr}</span>
        </div>
      </div>
    </div>
  );
};

