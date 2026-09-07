import React from "react";
import { Drawer } from "../common/Drawer";
import { Badge } from "../common/Badge";
import { Button } from "../common/Button";
import { Skeleton } from "../common/Skeleton";
import { ErrorState } from "../common/ErrorState";
import { RouteRead } from "../../types/routes";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { routesApi } from "../../api/routes";
import { Route, Trash2, ArrowRight, Calendar } from "lucide-react";

export interface SavedRoutesDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectRoute: (route: RouteRead) => void;
}

export const SavedRoutesDrawer: React.FC<SavedRoutesDrawerProps> = ({
  open,
  onOpenChange,
  onSelectRoute,
}) => {
  const queryClient = useQueryClient();

  const {
    data: routesData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["saved-routes"],
    queryFn: () => routesApi.list({ limit: 50 }),
    enabled: open,
  });

  const deleteMutation = useMutation({
    mutationFn: (routeId: string) => routesApi.delete(routeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-routes"] });
    },
  });

  const routes = routesData?.routes || [];

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Saved Mission Routes"
      description="Historical 2-Opt TSP optimized routes persisted in the database."
      width="md"
    >
      <div className="space-y-4 font-sans text-xs select-none">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : isError ? (
          <ErrorState
            title="Failed to load saved routes"
            message="Could not retrieve persisted route optimization records."
            onRetry={() => refetch()}
          />
        ) : routes.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl bg-[#0B0F19] border border-[#1F2E47]">
            <div className="p-3 rounded-2xl bg-[#16253B] border border-[#1F2E47] text-cyan-400 mb-2.5 shadow-inner">
              <Route className="w-7 h-7" />
            </div>
            <h4 className="font-semibold text-white text-xs uppercase font-mono tracking-wider">No Saved Routes Found</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs font-sans leading-relaxed">
              When optimizing a route, check &quot;Persist to Database History&quot; to save missions for future dispatch reload.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {routes.map((r) => (
              <div
                key={r.id}
                className="p-4 rounded-xl bg-[#0B0F19] border border-[#1F2E47] hover:border-[#2A3F5F] transition-colors space-y-2.5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-white text-xs font-sans">{r.name}</h4>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5 font-mono">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span>{new Date(r.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <Badge variant="success" size="sm">
                    {r.distance_saved_pct.toFixed(1)}% SAVED
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-[#111C2D] border border-[#1F2E47] text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-sans font-semibold">Optimized Distance</span>
                    <div className="font-bold text-emerald-400">{r.optimized_distance_km.toFixed(1)} km</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-sans font-semibold">Est. Travel Time</span>
                    <div className="font-bold text-blue-400">{r.optimized_time_min} min</div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400 font-mono truncate max-w-[150px]">
                    ID: {r.id.slice(0, 8)}...
                  </span>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(r.id)}
                      disabled={deleteMutation.isPending}
                      className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 px-2"
                      title="Delete Route"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        onSelectRoute(r);
                        onOpenChange(false);
                      }}
                      rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-bold"
                    >
                      Load Route
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Drawer>
  );
};

