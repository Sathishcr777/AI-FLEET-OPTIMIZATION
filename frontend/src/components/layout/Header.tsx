import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  Radio,
  Zap,
  Shield,
  LogOut,
  ChevronDown,
  User,
  CheckCircle2,
  Cpu,
  Activity,
} from "lucide-react";
import { useTelemetryStore } from "../../hooks/useTelemetryStore";
import { useAuthStore } from "../../hooks/useAuthStore";
import { Button } from "../common/Button";
import { Tooltip } from "../common/Tooltip";
import { Modal } from "../common/Modal";

export interface HeaderProps {
  onOpenScenarioDrawer?: () => void;
  activeAlertCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenScenarioDrawer,
  activeAlertCount = 0,
}) => {
  const navigate = useNavigate();
  const connectionStatus = useTelemetryStore((s) => s.connectionStatus);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [currentTime, setCurrentTime] = useState<string>("");
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) + " UTC"
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle click outside and Escape key for account dropdown
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  const handleLogout = () => {
    setIsMenuOpen(false);
    logout();
    navigate("/login", { replace: true });
  };

  const getStatusDot = () => {
    switch (connectionStatus) {
      case "CONNECTED":
        return "bg-emerald-400 shadow-glowEmerald animate-pulse";
      case "CONNECTING":
        return "bg-amber-400 animate-pulse";
      case "ERROR":
        return "bg-rose-500 shadow-glowCritical";
      case "DISCONNECTED":
      default:
        return "bg-slate-500";
    }
  };

  return (
    <>
      <header className="h-[68px] border-b border-[#1F2E47] bg-[#0E1526]/95 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center justify-between z-30 shrink-0 shadow-2xl relative select-none">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-3.5 group outline-none focus-ring rounded-xl">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-glowBlue group-hover:bg-blue-500 transition-all">
              <Radio className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div className="flex items-center gap-3">
              <span className="font-extrabold text-white tracking-tight text-xl font-sans">
                FleetIQ
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-blue-950/80 text-blue-300 font-mono font-bold uppercase border border-blue-500/40 shadow-sm hidden sm:inline-block">
                ENTERPRISE COMMAND
              </span>
            </div>
          </Link>
        </div>

        {/* Center: System Telemetry Stream & Clock */}
        <div className="hidden md:flex items-center gap-3.5 text-xs font-mono">
          <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-[#16253B] border border-[#2A3F5F] text-slate-200 shadow-subtle">
            <span className={`w-2.5 h-2.5 rounded-full ${getStatusDot()}`} />
            <span className="font-bold tracking-tight text-xs sm:text-[13px]">
              STREAM: {connectionStatus}
            </span>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#16253B] border border-[#2A3F5F] text-emerald-300 text-xs sm:text-[13px] font-bold shadow-subtle">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>API: HEALTHY</span>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-[#16253B] border border-[#2A3F5F] text-slate-200 text-xs sm:text-[13px] font-bold tabular-nums shadow-subtle">
            {currentTime || "00:00:00 UTC"}
          </div>
        </div>

        {/* Right: Actions & User Context */}
        <div className="flex items-center gap-3.5">
          <Tooltip content="Launch Telemetry Scenario Simulator">
            <Button
              size="md"
              variant="secondary"
              onClick={onOpenScenarioDrawer}
              leftIcon={<Zap className="w-4 h-4 text-amber-400" />}
              className="text-xs sm:text-sm font-bold h-10 px-4"
            >
              <span className="hidden sm:inline">Simulator Cockpit</span>
            </Button>
          </Tooltip>

          <Tooltip content={`${activeAlertCount} Active Incidents`}>
            <Link to="/alerts" className="outline-none focus-ring rounded-xl">
              <button
                className="relative p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-[#16253B] border border-[#2A3F5F] transition-colors cursor-pointer"
                aria-label="Alerts Feed"
              >
                <Bell className="w-5 h-5" />
                {activeAlertCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500 ring-2 ring-[#0E1526] animate-pulse shadow-glowCritical" />
                )}
              </button>
            </Link>
          </Tooltip>

          <div className="h-7 w-px bg-[#1F2E47] mx-0.5" />

          {/* Administrator Identity & Account Menu Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              aria-label="Administrator profile menu"
              className={`flex items-center gap-3 px-3 py-1.5 rounded-xl border transition-all cursor-pointer outline-none focus-ring ${
                isMenuOpen
                  ? "bg-[#16253B] border-blue-500 shadow-glowBlue"
                  : "border-[#2A3F5F] hover:border-slate-500 hover:bg-[#16253B]"
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-blue-400 shrink-0">
                <Shield className="w-4.5 h-4.5" />
              </div>
              <div className="hidden lg:block text-left font-sans">
                <p className="text-sm font-bold text-white leading-tight">
                  {user?.name || "Fleet Administrator"}
                </p>
                <p className="text-xs text-blue-400 font-mono leading-tight font-bold uppercase">
                  {user?.role || "ADMIN"}
                </p>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                  isMenuOpen ? "rotate-180 text-blue-400" : ""
                }`}
              />
            </button>

            {/* Dropdown Popover Menu */}
            {isMenuOpen && (
              <div
                role="menu"
                aria-orientation="vertical"
                aria-label="User Account Menu"
                className="absolute right-0 top-full mt-2.5 w-72 rounded-2xl bg-[#111C2D]/95 backdrop-blur-xl border border-[#1F2E47] shadow-popover p-2 z-50 animate-in fade-in zoom-in-95 duration-100 font-sans"
              >
                {/* User Information Header */}
                <div className="px-3.5 py-3 bg-[#16253B] rounded-xl border border-[#2A3F5F] mb-1.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-glowBlue">
                      FA
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {user?.name || "Fleet Administrator"}
                      </p>
                      <p className="text-xs text-slate-400 font-mono truncate">
                        {user?.email || "admin@fleetiq.io"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-blue-950/80 text-blue-300 border border-blue-500/40">
                      {user?.role || "ADMIN"}
                    </span>
                    <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-glowEmerald" />
                      Active Session
                    </span>
                  </div>
                </div>

                <div className="h-px bg-[#1F2E47] my-1" />

                {/* Account Option */}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsAccountModalOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 hover:text-white hover:bg-[#16253B] transition-colors text-left cursor-pointer group"
                >
                  <User className="w-4.5 h-4.5 text-slate-400 group-hover:text-blue-400 transition-colors" />
                  <div className="flex-1">
                    <div className="font-bold text-white">Account Privileges</div>
                    <div className="text-xs text-slate-400">View security & dispatch profile</div>
                  </div>
                </button>

                <div className="h-px bg-[#1F2E47] my-1" />

                {/* Sign out Option */}
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors text-left cursor-pointer group"
                >
                  <LogOut className="w-4.5 h-4.5 text-rose-400 group-hover:text-rose-300 transition-colors" />
                  <div className="flex-1">
                    <div className="font-bold text-rose-300">Sign out</div>
                    <div className="text-xs text-rose-400/80">End operational session</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Account Profile Modal */}
      <Modal
        open={isAccountModalOpen}
        onOpenChange={setIsAccountModalOpen}
        title="Fleet Administrator Account"
        description="Security clearance, role privileges, and command center authorizations"
        maxWidth="md"
        footer={
          <Button
            variant="secondary"
            size="md"
            onClick={() => setIsAccountModalOpen(false)}
          >
            Close
          </Button>
        }
      >
        <div className="space-y-4 text-xs sm:text-sm font-sans">
          {/* Identity Banner */}
          <div className="flex items-center gap-3.5 p-4 rounded-xl bg-[#16253B] border border-[#2A3F5F]">
            <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-glowBlue">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">
                {user?.name || "Fleet Administrator"}
              </h4>
              <p className="text-slate-400 text-xs font-mono">
                {user?.email || "admin@fleetiq.io"}
              </p>
            </div>
            <div className="ml-auto">
              <span className="px-2.5 py-1 rounded-lg bg-blue-950/80 text-blue-300 text-xs font-mono font-bold uppercase border border-blue-500/40">
                {user?.role || "ADMIN"}
              </span>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-[#0D1624] border border-[#1F2E47]">
              <span className="text-xs text-slate-400 uppercase font-bold font-mono">
                User Identifier
              </span>
              <p className="text-sm font-mono font-bold text-white mt-1">
                {user?.id || "admin-01"}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0D1624] border border-[#1F2E47]">
              <span className="text-xs text-slate-400 uppercase font-bold font-mono">
                Authorization Scope
              </span>
              <p className="text-sm font-semibold text-emerald-400 mt-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Full System Access
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0D1624] border border-[#1F2E47]">
              <span className="text-xs text-slate-400 uppercase font-bold font-mono">
                Session Status
              </span>
              <p className="text-sm font-semibold text-white mt-1 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-glowEmerald" />
                Active / TLS 1.3
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0D1624] border border-[#1F2E47]">
              <span className="text-xs text-slate-400 uppercase font-bold font-mono">
                Telemetry Protocol
              </span>
              <p className="text-sm font-mono text-blue-400 mt-1 flex items-center gap-1.5">
                <Cpu className="w-4 h-4" />
                WSS / JSON RPC
              </p>
            </div>
          </div>

          {/* Platform capabilities list */}
          <div className="p-4 rounded-xl bg-[#0D1624] border border-[#1F2E47] space-y-2">
            <span className="text-xs text-slate-400 uppercase font-bold font-mono block">
              Granted Operational Privileges
            </span>
            <ul className="space-y-1.5 text-slate-300 text-xs sm:text-[13px]">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400" />
                <span>Real-time telemetry stream ingestion & WebSocket broadcast</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400" />
                <span>AI Anomaly detection & XGBoost predictive maintenance modeling</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400" />
                <span>Multi-stop 2-Opt TSP dispatch & route optimization algorithms</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400" />
                <span>Incident alert triage, escalation & operational acknowledgment</span>
              </li>
            </ul>
          </div>
        </div>
      </Modal>
    </>
  );
};

