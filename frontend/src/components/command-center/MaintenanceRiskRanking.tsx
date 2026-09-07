import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "../common/Card";
import { Badge } from "../common/Badge";
import { Table, Column } from "../common/Table";
import { Vehicle } from "../../types/api";
import { MaintenancePredictionResponse } from "../../api/analytics";
import { Wrench, ExternalLink } from "lucide-react";
import { clsx } from "clsx";

export interface MaintenanceRiskItem {
  id: string;
  vehicleName: string;
  licensePlate: string;
  riskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  estimatedRulKm: number;
  factors: string[];
}

export interface MaintenanceRiskRankingProps {
  vehicles: Vehicle[];
  predictions: Record<string, MaintenancePredictionResponse>;
  className?: string;
}

export const MaintenanceRiskRanking: React.FC<MaintenanceRiskRankingProps> = ({
  vehicles,
  predictions,
  className,
}) => {
  // Extract real predictive maintenance items sorted by risk severity
  const riskItems = useMemo(() => {
    const riskRank: Record<string, number> = { CRITICAL: 3, HIGH: 2, MEDIUM: 1, LOW: 0 };

    return vehicles
      .map((v) => {
        const pred = predictions[v.id];
        const riskLevel = (pred?.risk_level || "LOW") as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
        const estimatedRulKm = pred?.estimated_rul_km ?? 25000;
        const factors = pred?.contributing_factors
          ? pred.contributing_factors.map((cf) => (typeof cf === "string" ? cf : cf.factor))
          : [];

        return {
          id: v.id,
          vehicleName: v.name,
          licensePlate: v.license_plate,
          riskLevel,
          estimatedRulKm,
          factors,
        };
      })
      .sort((a, b) => {
        const rankDiff = (riskRank[b.riskLevel] || 0) - (riskRank[a.riskLevel] || 0);
        if (rankDiff !== 0) return rankDiff;
        return a.estimatedRulKm - b.estimatedRulKm;
      });
  }, [vehicles, predictions]);

  const columns: Column<MaintenanceRiskItem>[] = [
    {
      key: "vehicleName",
      header: "Vehicle Asset",
      render: (item) => (
        <div>
          <div className="font-semibold text-slate-100 text-sm font-sans">{item.vehicleName}</div>
          <div className="text-xs text-slate-400 font-mono mt-0.5">{item.licensePlate}</div>
        </div>
      ),
    },
    {
      key: "riskLevel",
      header: "Predicted Risk",
      align: "center",
      render: (item) => {
        const variant =
          item.riskLevel === "CRITICAL"
            ? "critical"
            : item.riskLevel === "HIGH"
            ? "danger"
            : item.riskLevel === "MEDIUM"
            ? "warning"
            : "healthy";

        return (
          <Badge variant={variant} size="sm" dot={item.riskLevel === "CRITICAL"}>
            {item.riskLevel}
          </Badge>
        );
      },
    },
    {
      key: "estimatedRulKm",
      header: "Estimated RUL",
      align: "right",
      isTechnical: true,
      render: (item) => (
        <span className="font-mono text-sm font-bold text-cyan-400">
          {item.estimatedRulKm.toLocaleString()} km
        </span>
      ),
    },
    {
      key: "action",
      header: "Service Action",
      align: "right",
      render: (item) => (
        <Link
          to={`/maintenance?id=${item.id}`}
          className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 font-bold text-xs sm:text-sm font-sans hover:underline"
        >
          <span>Schedule</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      ),
    },
  ];

  return (
    <Card className={clsx("flex flex-col bg-[#111C2D] border-slate-800", className)}>
      <CardHeader className="border-b border-slate-800">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2.5">
            <Wrench className="w-4.5 h-4.5 text-amber-400" />
            <CardTitle className="text-slate-100 text-lg">Predictive Maintenance Attention</CardTitle>
          </div>
          <Link
            to="/maintenance"
            className="text-xs sm:text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold font-sans transition-colors"
          >
            <span>Overview</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Table
          data={riskItems}
          columns={columns}
          keyExtractor={(item) => item.id}
          className="border-0 shadow-none rounded-none rounded-b-2xl bg-transparent"
        />
      </CardContent>
    </Card>
  );
};

