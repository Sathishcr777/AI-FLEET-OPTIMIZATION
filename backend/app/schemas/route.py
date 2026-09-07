import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class OptimizationGoal(str, Enum):
    DISTANCE = "DISTANCE"
    TIME = "TIME"
    FUEL = "FUEL"
    BALANCED = "BALANCED"


class Waypoint(BaseModel):
    name: str = "Waypoint"
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude between -90 and 90")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude between -180 and 180")
    stop_id: Optional[str] = None
    address: Optional[str] = None
    demand_units: Optional[float] = 0.0
    time_window: Optional[str] = None


class OptimizedStop(BaseModel):
    sequence_index: int
    stop_id: str
    name: str
    latitude: float
    longitude: float
    distance_from_prev_km: float = 0.0
    travel_time_from_prev_min: float = 0.0
    cumulative_distance_km: float = 0.0
    cumulative_time_min: float = 0.0


class RouteComparisonSummary(BaseModel):
    original_distance_km: float
    optimized_distance_km: float
    distance_saved_km: float
    distance_saved_pct: float
    original_time_min: float
    optimized_time_min: float
    time_saved_min: float
    time_saved_pct: float
    original_fuel_liters: float
    optimized_fuel_liters: float
    fuel_saved_liters: float
    cost_saved_usd: float
    algorithm_used: str = "2-Opt TSP Heuristic + Nearest Neighbor"
    explanation: str


class RouteOptimizeRequest(BaseModel):
    name: Optional[str] = "Optimized Delivery Route"
    origin: Waypoint
    destination: Optional[Waypoint] = None
    stops: List[Waypoint] = Field(default_factory=list)
    vehicle_id: Optional[uuid.UUID] = None
    trip_id: Optional[uuid.UUID] = None
    optimization_goal: OptimizationGoal = OptimizationGoal.DISTANCE
    average_speed_kmh: float = Field(default=60.0, gt=0.0, le=150.0)
    fuel_consumption_rate_l_per_100km: float = Field(default=12.0, gt=0.0)
    fuel_cost_per_liter: float = Field(default=1.50, gt=0.0)
    save_to_database: bool = False


class RouteOptimizeResponse(BaseModel):
    route_id: Optional[uuid.UUID] = None
    name: str
    origin: Waypoint
    destination: Waypoint
    original_sequence: List[OptimizedStop]
    optimized_sequence: List[OptimizedStop]
    comparison: RouteComparisonSummary
    status: str = "OPTIMIZED"


class RouteRead(BaseModel):
    id: uuid.UUID
    trip_id: Optional[uuid.UUID] = None
    name: str
    origin_lat: float
    origin_lon: float
    dest_lat: float
    dest_lon: float
    waypoints: List[Dict[str, Any]]
    optimized_path: List[Dict[str, Any]]
    original_distance_km: float
    optimized_distance_km: float
    distance_saved_pct: float
    original_time_min: int
    optimized_time_min: int
    time_saved_pct: float
    estimated_fuel_saved_liters: float
    estimated_cost_saved_usd: float
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RouteListResponse(BaseModel):
    total: int
    routes: List[RouteRead]
