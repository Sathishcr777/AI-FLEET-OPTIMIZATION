import { createBrowserRouter, Navigate } from "react-router-dom";
import { Shell } from "./components/layout/Shell";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { CommandCenterPage } from "./pages/CommandCenter";
import { LiveMapPage } from "./pages/LiveMapPage";
import { VehiclesPage } from "./pages/VehiclesPage";
import { DriversPage } from "./pages/DriversPage";
import { MaintenancePage } from "./pages/MaintenancePage";
import { AlertsPage } from "./pages/AlertsPage";
import { RouteOptimizerPage } from "./pages/RouteOptimizerPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Shell />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <CommandCenterPage />,
      },
      {
        path: "map",
        element: <LiveMapPage />,
      },
      {
        path: "vehicles",
        element: <VehiclesPage />,
      },
      {
        path: "drivers",
        element: <DriversPage />,
      },
      {
        path: "maintenance",
        element: <MaintenancePage />,
      },
      {
        path: "alerts",
        element: <AlertsPage />,
      },
      {
        path: "routes",
        element: <RouteOptimizerPage />,
      },
      {
        path: "analytics",
        element: <AnalyticsPage />,
      },
      {
        path: "*",
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
