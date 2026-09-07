import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  MapPin,
  Truck,
  Users,
  Wrench,
  AlertTriangle,
  Route,
  BarChart3,
  ShieldCheck,
  Radio,
  ChevronLeft,
  ChevronRight,
  Cpu,
} from "lucide-react";
import { clsx } from "clsx";

export interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  activeAlertCount?: number;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  badgeVariant?: "brand" | "critical";
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed = false,
  onToggleCollapse,
  activeAlertCount = 0,
}) => {
  const navSections: NavSection[] = [
    {
      title: "Operations Command",
      items: [
        { to: "/", label: "Command Center", icon: LayoutDashboard },
        { to: "/map", label: "Live Fleet Map", icon: MapPin },
      ],
    },
    {
      title: "Asset & Safety Intelligence",
      items: [
        { to: "/vehicles", label: "Vehicle Intelligence", icon: Truck },
        { to: "/drivers", label: "Driver Safety", icon: Users },
        { to: "/maintenance", label: "Predictive Maintenance", icon: Wrench },
        {
          to: "/alerts",
          label: "Alert Center",
          icon: AlertTriangle,
          badge: activeAlertCount > 0 ? activeAlertCount : undefined,
          badgeVariant: "critical",
        },
      ],
    },
    {
      title: "Dispatch & Optimization",
      items: [
        { to: "/routes", label: "Route Optimizer", icon: Route },
        { to: "/analytics", label: "Analytics & Telemetry", icon: BarChart3 },
      ],
    },
  ];

  return (
    <aside
      className={clsx(
        "bg-[#0D1524] border-r border-[#1F2E47] flex flex-col justify-between transition-all duration-200 shrink-0 z-20 shadow-2xl relative select-none",
        collapsed ? "w-20" : "w-[270px]"
      )}
    >
      {/* Collapse Toggle Button */}
      {onToggleCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          className="absolute -right-3 top-6 w-6 h-6 rounded-full bg-[#16253B] border border-[#2A3F5F] text-slate-300 hover:text-white flex items-center justify-center shadow-lg z-30 transition-transform hover:scale-110 cursor-pointer"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      )}

      {/* Navigation Sections */}
      <div className="p-3.5 space-y-6 overflow-y-auto">
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1.5">
            {!collapsed && (
              <div className="px-3 text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                {section.title}
              </div>
            )}

            <nav className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      clsx(
                        "flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all duration-150 group relative font-sans outline-none focus-ring min-h-[44px]",
                        isActive
                          ? "bg-blue-600/20 text-white border border-blue-500/50 shadow-glowBlue"
                          : "text-slate-300 hover:text-white hover:bg-[#16253B]/70 border border-transparent"
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          className={clsx(
                            "w-5 h-5 shrink-0 transition-transform group-hover:scale-110",
                            isActive ? "text-blue-400" : "text-slate-400 group-hover:text-blue-300"
                          )}
                        />
                        {!collapsed && (
                          <span className="truncate tracking-tight text-[14.5px]">
                            {item.label}
                          </span>
                        )}

                        {!collapsed && item.badge !== undefined && (
                          <span
                            className={clsx(
                              "ml-auto text-xs font-mono px-2.5 py-0.5 rounded-full font-bold tabular-nums",
                              item.badgeVariant === "critical"
                                ? "bg-rose-900/70 text-rose-200 border border-rose-500 shadow-glowCritical animate-pulse"
                                : "bg-blue-900/70 text-blue-200 border border-blue-500"
                            )}
                          >
                            {item.badge}
                          </span>
                        )}

                        {/* Active Indicator Bar */}
                        {isActive && (
                          <span className="absolute left-0 top-2 bottom-2 w-1.5 bg-blue-500 rounded-r-full shadow-glowBlue" />
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Footer Platform Info */}
      {!collapsed && (
        <div className="p-4 border-t border-[#1F2E47] font-mono text-xs text-slate-400 space-y-2.5 bg-[#0A0E17]/80">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-bold uppercase">Platform</span>
            <span className="text-slate-200 font-bold font-mono">v2.4.0 ENTERPRISE</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-bold uppercase">Telemetry Stream</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-glowEmerald" />
              <span>CONNECTED</span>
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-bold uppercase">AI Inference Engine</span>
            <span className="text-blue-400 font-bold flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5" />
              <span>OPERATIONAL</span>
            </span>
          </div>
        </div>
      )}
    </aside>
  );
};


