export type OptimizationGoal = "DISTANCE" | "TIME" | "FUEL" | "BALANCED";

export interface Waypoint {
  name: string;
  latitude: number;
  longitude: number;
  stop_id?: string | null;
  address?: string | null;
  demand_units?: number;
  time_window?: string | null;
}

export interface OptimizedStop {
  sequence_index: number;
  stop_id: string;
  name: string;
  latitude: number;
  longitude: number;
  distance_from_prev_km: number;
  travel_time_from_prev_min: number;
  cumulative_distance_km: number;
  cumulative_time_min: number;
}

export interface RouteComparisonSummary {
  original_distance_km: number;
  optimized_distance_km: number;
  distance_saved_km: number;
  distance_saved_pct: number;
  original_time_min: number;
  optimized_time_min: number;
  time_saved_min: number;
  time_saved_pct: number;
  original_fuel_liters: number;
  optimized_fuel_liters: number;
  fuel_saved_liters: number;
  cost_saved_usd: number;
  algorithm_used: string;
  explanation: string;
}

export interface RouteOptimizeResponse {
  route_id?: string | null;
  name: string;
  origin: Waypoint;
  destination: Waypoint;
  original_sequence: OptimizedStop[];
  optimized_sequence: OptimizedStop[];
  comparison: RouteComparisonSummary;
  status: string;
}

export interface RouteOptimizeRequest {
  name?: string;
  origin: Waypoint;
  destination?: Waypoint | null;
  stops: Waypoint[];
  vehicle_id?: string | null;
  trip_id?: string | null;
  optimization_goal?: OptimizationGoal;
  average_speed_kmh?: number;
  fuel_consumption_rate_l_per_100km?: number;
  fuel_cost_per_liter?: number;
  save_to_database?: boolean;
}

export interface RouteRead {
  id: string;
  trip_id?: string | null;
  name: string;
  origin_lat: number;
  origin_lon: number;
  dest_lat: number;
  dest_lon: number;
  waypoints: Record<string, unknown>[];
  optimized_path: Record<string, unknown>[];
  original_distance_km: number;
  optimized_distance_km: number;
  distance_saved_pct: number;
  original_time_min: number;
  optimized_time_min: number;
  time_saved_pct: number;
  estimated_fuel_saved_liters: number;
  estimated_cost_saved_usd: number;
  status: string;
  created_at: string;
}

export interface RouteListResponse {
  total: number;
  routes: RouteRead[];
}
