import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../hooks/useAuthStore";
import {
  Radio,
  Lock,
  User,
  ArrowRight,
  Shield,
  AlertCircle,
  Sparkles,
  Activity,
  Cpu,
  Route,
} from "lucide-react";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/";

  const { isAuthenticated, login, loginAsDemoAdmin, isLoading, error, clearError } = useAuthStore();

  const [adminId, setAdminId] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  // If already authenticated, redirect to destination
  useEffect(() => {
    if (isAuthenticated) {
      navigate(returnUrl, { replace: true });
    }
  }, [isAuthenticated, navigate, returnUrl]);

  // Clear errors on change
  useEffect(() => {
    if (error) clearError();
    if (localError) setLocalError(null);
  }, [adminId, password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!adminId.trim()) {
      setLocalError("Please enter your Admin ID.");
      return;
    }

    if (!password) {
      setLocalError("Please enter your password.");
      return;
    }

    const result = await login(adminId, password);
    if (result.success) {
      navigate(returnUrl, { replace: true });
    }
  };

  const handleDemoLogin = async () => {
    setLocalError(null);
    await loginAsDemoAdmin();
    navigate(returnUrl, { replace: true });
  };

  const activeError = localError || error;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-12 select-none relative overflow-hidden font-sans">
      {/* Subtle background ambient geometric grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#E2E8F0_1px,transparent_1px),linear-gradient(to_bottom,#E2E8F0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-70 pointer-events-none" />

      <div className="w-full max-w-5xl relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left: Product Hero & Capabilities */}
        <div className="lg:col-span-6 space-y-6 text-left hidden sm:block">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <span>Fleet Operations Intelligence Platform</span>
            </div>

            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
              Autonomous fleet intelligence for modern logistics.
            </h1>

            <p className="text-sm text-slate-600 leading-relaxed max-w-md">
              Real-time powertrain telemetry, ML predictive maintenance diagnostics, intelligent incident triage, and 2-Opt TSP dispatch optimization in one calm cockpit.
            </p>
          </div>

          {/* 3 Core Value Pillars */}
          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/70 border border-slate-200/80 shadow-sm backdrop-blur-sm">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-semibold text-slate-900">Real-Time Telemetry & Live Map</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Sub-second vehicle telemetry, heading, GPS positioning, and powertrain vitals.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/70 border border-slate-200/80 shadow-sm backdrop-blur-sm">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-semibold text-slate-900">Predictive Maintenance & RUL</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Machine learning anomaly detection, remaining useful life estimates, and failure prevention.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/70 border border-slate-200/80 shadow-sm backdrop-blur-sm">
              <div className="p-2 rounded-lg bg-purple-50 text-purple-600 shrink-0">
                <Route className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-semibold text-slate-900">Route & Dispatch Optimization</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Algorithmic multi-stop 2-Opt TSP sequence optimization with measurable fuel savings.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Glass Sign-In Panel */}
        <div className="lg:col-span-6 max-w-[420px] mx-auto w-full space-y-6">
          <div className="bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-2xl p-8 shadow-xl shadow-slate-200/50 space-y-6">
            {/* Header branding */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-slate-900">
                    FleetIQ
                  </h2>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-mono">
                    Operations Intelligence
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <h3 className="text-base font-semibold text-slate-900 tracking-tight">
                  Administrator Sign In
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Access the operational fleet cockpit with your credentials.
                </p>
              </div>
            </div>

            {/* Error Banner */}
            {activeError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700 font-medium">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{activeError}</span>
              </div>
            )}

            {/* Sign In Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="adminId"
                  className="block text-xs font-medium text-slate-700"
                >
                  Admin ID
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="adminId"
                    type="text"
                    value={adminId}
                    onChange={(e) => setAdminId(e.target.value)}
                    placeholder="e.g. admin"
                    autoComplete="username"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-slate-700"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white font-medium text-sm rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600/30"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Separator / Demo Access Section */}
            <div className="relative pt-1">
              <div className="absolute inset-0 flex items-center pt-1">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-slate-400 font-mono text-[10px] font-semibold tracking-wider">
                  Demo Access
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-0.5">
              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={isLoading}
                aria-label="Launch Demo as Admin"
                className="w-full h-10 px-4 bg-slate-900 hover:bg-slate-800 active:bg-black disabled:opacity-60 text-white font-medium text-sm rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-900/30 group"
              >
                <Sparkles className="w-4 h-4 text-amber-300 group-hover:scale-110 transition-transform" />
                <span>Launch Demo as Admin</span>
              </button>

              <p className="text-[11px] text-center text-slate-500 font-mono">
                One-click presentation access with preconfigured administrator role
              </p>
            </div>
          </div>

          {/* Security & System Info Footer */}
          <div className="text-center space-y-1 text-xs text-slate-500">
            <div className="flex items-center justify-center gap-1.5 text-[11px]">
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              <span>Encrypted Session · Role-Based Access Control</span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              FleetIQ Enterprise v2.4.0 · Production Telematics Platform
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

