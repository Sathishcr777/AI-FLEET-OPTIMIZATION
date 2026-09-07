import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { ChartCard } from "../charts/ChartCard";
import { ChartTooltip } from "../charts/ChartTooltip";
import { commonCartesianGrid, commonXAxis, commonYAxis } from "../charts/chartTheme";
import { Vehicle } from "../../types/api";
import { ShieldAlert } from "lucide-react";

export interface VehicleHealthRankingProps {
  vehicles: Vehicle[];
  onSelectVehicle?: (id: string) => void;
  selectedVehicleId?: string | null;
  className?: string;
}

export const VehicleHealthRanking: React.FC<VehicleHealthRankingProps> = ({
  vehicles,
  onSelectVehicle,
  selectedVehicleId,
  className,
}) => {
  const navigate = useNavigate();

  // Compute vehicle health scores and sort ascending (lowest / most critical on top)
  const rankingData = useMemo(() => {
    return vehicles
      .map((v) => {
        let score = 95;
        if (v.health_status === "CRITICAL") score = 42;
        else if (v.health_status === "WARNING") score = 71;

        const color = score >= 85 ? "#10B981" : score >= 70 ? "#F59E0B" : "#EF4444";
        return {
          id: v.id,
          name: v.name,
          licensePlate: v.license_plate,
          healthScore: score,
          status: v.health_status,
          color,
        };
      })
      .sort((a, b) => a.healthScore - b.healthScore); // lowest first
  }, [vehicles]);

  const handleBarClick = (entry: { id: string }) => {
    if (onSelectVehicle) onSelectVehicle(entry.id);
    navigate(`/vehicles?id=${entry.id}`);
  };

  return (
    <ChartCard
      title="Vehicle Health Ranking"
      subtitle="Fleet assets prioritized by health score (lowest / risk assets on top)"
      icon={<ShieldAlert className="w-4.5 h-4.5 text-amber-400" />}
      height={280}
      className={className}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={rankingData}
          margin={{ top: 8, right: 28, left: 14, bottom: 8 }}
        >
          <CartesianGrid {...commonCartesianGrid} horizontal={false} vertical={true} />
          <XAxis
            type="number"
            domain={[0, 100]}
            unit="%"
            {...commonXAxis}
            tickCount={5}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={110}
            {...commonYAxis}
            tick={{
              fill: "#94A3B8",
              fontSize: 12,
              fontFamily: "Inter, sans-serif",
              fontWeight: 600,
            }}
          />
          <Tooltip
            cursor={{ fill: "rgba(30, 41, 59, 0.5)" }}
            content={
              <ChartTooltip
                valueFormatter={(val, item) => {
                  const entry = rankingData.find((d) => d.name === item.name);
                  return (
                    <div className="font-mono text-xs">
                      <span className="font-bold text-white">{val}%</span>
                      {entry && (
                        <span className="text-[10px] text-slate-400 block font-sans mt-0.5">
                          {entry.licensePlate} · {entry.status}
                        </span>
                      )}
                    </div>
                  );
                }}
              />
            }
          />
          <Bar
            dataKey="healthScore"
            name="Health Score"
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
            className="cursor-pointer"
            onClick={(data) => {
              if (data && data.id) handleBarClick(data);
            }}
          >
            {rankingData.map((entry) => (
              <Cell
                key={`cell-${entry.id}`}
                fill={entry.color}
                stroke={selectedVehicleId === entry.id ? "#3B82F6" : undefined}
                strokeWidth={selectedVehicleId === entry.id ? 2 : 0}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

