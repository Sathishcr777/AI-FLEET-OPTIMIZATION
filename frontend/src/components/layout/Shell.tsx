import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { ScenarioDrawer } from "./ScenarioDrawer";
import { useWebSocket } from "../../hooks/useWebSocket";
import { vehiclesApi } from "../../api/vehicles";
import { alertsApi } from "../../api/alerts";

export const Shell: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [scenarioDrawerOpen, setScenarioDrawerOpen] = useState(false);

  // Initialize fleet-wide WebSocket connection
  useWebSocket({
    enabled: true,
  });

  // Fetch fleet vehicles for scenario injection
  const { data: vehiclesData } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => vehiclesApi.list({ limit: 50 }),
  });

  // Fetch active alerts count
  const { data: activeAlertsData } = useQuery({
    queryKey: ["alerts", "active"],
    queryFn: () => alertsApi.getActive(),
    refetchInterval: 5000,
  });

  const vehicles = vehiclesData?.vehicles || [];
  const activeAlertCount = activeAlertsData?.length || 0;

  return (
    <div className="flex flex-col min-h-screen h-screen w-full bg-[#0B0F19] text-slate-100 overflow-hidden font-sans">
      {/* Top Operations Header */}
      <Header
        onOpenScenarioDrawer={() => setScenarioDrawerOpen(true)}
        activeAlertCount={activeAlertCount}
      />

      {/* Main Workspace: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          activeAlertCount={activeAlertCount}
        />

        {/* Scrollable Page Container */}
        <main className="flex-1 overflow-y-auto bg-[#0B0F19] p-4 sm:p-5 lg:p-7">
          <Outlet />
        </main>
      </div>

      {/* Quick Simulation Injector Drawer */}
      <ScenarioDrawer
        open={scenarioDrawerOpen}
        onOpenChange={setScenarioDrawerOpen}
        vehicles={vehicles}
      />
    </div>
  );
};


