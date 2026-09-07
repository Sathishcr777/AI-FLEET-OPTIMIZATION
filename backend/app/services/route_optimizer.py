import math
import uuid
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime, timezone

from backend.app.schemas.route import (
    Waypoint,
    OptimizedStop,
    RouteComparisonSummary,
    RouteOptimizeRequest,
    RouteOptimizeResponse,
    OptimizationGoal,
)


EARTH_RADIUS_KM = 6371.0


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points on the Earth
    specified in decimal degrees using the Haversine formula.
    """
    # Strict bounds validation
    if not (-90.0 <= lat1 <= 90.0 and -90.0 <= lat2 <= 90.0):
        raise ValueError(f"Latitude out of bounds [-90, 90]: {lat1}, {lat2}")
    if not (-180.0 <= lon1 <= 180.0 and -180.0 <= lon2 <= 180.0):
        raise ValueError(f"Longitude out of bounds [-180, 180]: {lon1}, {lon2}")

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(EARTH_RADIUS_KM * c, 4)


def build_distance_matrix(points: List[Waypoint]) -> List[List[float]]:
    """Build pairwise distance matrix in km."""
    n = len(points)
    matrix = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1, n):
            d = haversine_distance_km(points[i].latitude, points[i].longitude, points[j].latitude, points[j].longitude)
            matrix[i][j] = d
            matrix[j][i] = d
    return matrix


def calculate_tour_distance(tour: List[int], dist_matrix: List[List[float]]) -> float:
    """Calculate total path distance of a given sequence of point indices."""
    total = 0.0
    for i in range(len(tour) - 1):
        total += dist_matrix[tour[i]][tour[i + 1]]
    return round(total, 4)


def nearest_neighbor_greedy(dist_matrix: List[List[float]], start_idx: int, fixed_end_idx: Optional[int] = None) -> List[int]:
    """Greedy Nearest Neighbor heuristic to construct initial feasible tour."""
    n = len(dist_matrix)
    if n <= 1:
        return [0]
    
    unvisited = set(range(n))
    unvisited.remove(start_idx)
    if fixed_end_idx is not None and fixed_end_idx in unvisited:
        unvisited.remove(fixed_end_idx)

    tour = [start_idx]
    current = start_idx

    while unvisited:
        next_node = min(unvisited, key=lambda node: dist_matrix[current][node])
        tour.append(next_node)
        unvisited.remove(next_node)
        current = next_node

    if fixed_end_idx is not None:
        tour.append(fixed_end_idx)

    return tour


def two_opt_optimize(tour: List[int], dist_matrix: List[List[float]], fix_start: bool = True, fix_end: bool = False) -> List[int]:
    """
    2-Opt Local Search Heuristic for TSP / Multi-Stop Route Optimization.
    Iteratively reverses 2-edge sub-paths until no further distance improvement is possible.
    """
    best_tour = list(tour)
    best_distance = calculate_tour_distance(best_tour, dist_matrix)
    improved = True
    max_iterations = 500
    iteration = 0

    start_k = 1 if fix_start else 0
    end_offset = 1 if fix_end else 0

    while improved and iteration < max_iterations:
        improved = False
        iteration += 1
        n = len(best_tour)

        for i in range(start_k, n - 1 - end_offset):
            for k in range(i + 1, n - end_offset):
                # 2-opt swap: reverse subsegment from i to k
                new_tour = best_tour[:i] + best_tour[i:k + 1][::-1] + best_tour[k + 1:]
                new_distance = calculate_tour_distance(new_tour, dist_matrix)

                if new_distance < best_distance - 1e-6:
                    best_tour = new_tour
                    best_distance = new_distance
                    improved = True
                    break
            if improved:
                break

    return best_tour


class RouteOptimizer:
    """High-Performance Explainable Route Optimization Service."""

    def optimize_route(self, request: RouteOptimizeRequest) -> RouteOptimizeResponse:
        origin = request.origin
        stops = request.stops or []
        has_dest = (request.destination is not None)
        dest = request.destination if has_dest else (stops[-1] if stops else origin)

        # Construct full list of points: [origin, *stops, (dest if has_dest)]
        all_points: List[Waypoint] = [origin] + list(stops)
        if has_dest:
            all_points.append(dest)

        num_points = len(all_points)
        dist_matrix = build_distance_matrix(all_points)

        # 1. Original Sequence: [0, 1, 2, ..., N-1]
        original_indices = list(range(num_points))
        original_distance = calculate_tour_distance(original_indices, dist_matrix)

        # 2. Optimized Sequence
        if len(stops) <= 1:
            # 0 or 1 intermediate stops -> already minimal sequence
            optimized_indices = list(original_indices)
            optimized_distance = original_distance
        else:
            fixed_end = (num_points - 1) if has_dest else None
            # Construct initial tour using Nearest Neighbor
            initial_tour = nearest_neighbor_greedy(dist_matrix, start_idx=0, fixed_end_idx=fixed_end)
            # Improve with 2-Opt local search
            optimized_indices = two_opt_optimize(initial_tour, dist_matrix, fix_start=True, fix_end=has_dest)
            optimized_distance = calculate_tour_distance(optimized_indices, dist_matrix)

            # Sanity check: Ensure optimized_distance <= original_distance
            if optimized_distance > original_distance:
                optimized_indices = original_indices
                optimized_distance = original_distance

        # 3. Calculate detailed stop sequences and metrics
        speed = request.average_speed_kmh
        rate = request.fuel_consumption_rate_l_per_100km
        fuel_price = request.fuel_cost_per_liter

        def _build_stops(indices: List[int]) -> List[OptimizedStop]:
            built: List[OptimizedStop] = []
            cum_dist = 0.0
            cum_time = 0.0
            for seq_idx, pt_idx in enumerate(indices):
                pt = all_points[pt_idx]
                if seq_idx == 0:
                    dist_from_prev = 0.0
                    time_from_prev = 0.0
                else:
                    prev_idx = indices[seq_idx - 1]
                    dist_from_prev = dist_matrix[prev_idx][pt_idx]
                    time_from_prev = round((dist_from_prev / speed) * 60.0, 2)
                    cum_dist = round(cum_dist + dist_from_prev, 2)
                    cum_time = round(cum_time + time_from_prev, 2)

                stop_id = pt.stop_id or f"STOP-{seq_idx:02d}"
                built.append(OptimizedStop(
                    sequence_index=seq_idx,
                    stop_id=stop_id,
                    name=pt.name,
                    latitude=pt.latitude,
                    longitude=pt.longitude,
                    distance_from_prev_km=round(dist_from_prev, 2),
                    travel_time_from_prev_min=round(time_from_prev, 2),
                    cumulative_distance_km=cum_dist,
                    cumulative_time_min=cum_time,
                ))
            return built

        orig_stops = _build_stops(original_indices)
        opt_stops = _build_stops(optimized_indices)

        # 4. Savings & Comparison Computation
        dist_saved_km = max(0.0, round(original_distance - optimized_distance, 2))
        dist_saved_pct = round((dist_saved_km / original_distance * 100.0), 2) if original_distance > 0 else 0.0

        orig_time_min = round((original_distance / speed) * 60.0, 2)
        opt_time_min = round((optimized_distance / speed) * 60.0, 2)
        time_saved_min = max(0.0, round(orig_time_min - opt_time_min, 2))
        time_saved_pct = round((time_saved_min / orig_time_min * 100.0), 2) if orig_time_min > 0 else 0.0

        orig_fuel = round((original_distance * rate) / 100.0, 2)
        opt_fuel = round((optimized_distance * rate) / 100.0, 2)
        fuel_saved_l = max(0.0, round(orig_fuel - opt_fuel, 2))
        cost_saved = max(0.0, round(fuel_saved_l * fuel_price, 2))

        # 5. Explainable Justification Generator
        if len(stops) <= 1:
            explanation = (
                f"Direct linear route with {len(stops)} intermediate stop(s). "
                f"Initial sequence is already geometrically optimal at {optimized_distance:.2f} km."
            )
        elif dist_saved_km > 0.0:
            explanation = (
                f"Optimized stop ordering using 2-Opt TSP heuristic. Eliminated overlapping path crossings, "
                f"reducing total mileage by {dist_saved_km:.2f} km ({dist_saved_pct:.1f}% reduction). "
                f"Estimated travel time saved: {time_saved_min:.1f} mins. Estimated fuel reduction: {fuel_saved_l:.2f} liters (${cost_saved:.2f} USD)."
            )
        else:
            explanation = (
                f"Original stop sequence is already optimal at {optimized_distance:.2f} km. "
                f"No 2-opt sub-path exchanges yielded further distance reductions."
            )

        comparison = RouteComparisonSummary(
            original_distance_km=round(original_distance, 2),
            optimized_distance_km=round(optimized_distance, 2),
            distance_saved_km=dist_saved_km,
            distance_saved_pct=dist_saved_pct,
            original_time_min=orig_time_min,
            optimized_time_min=opt_time_min,
            time_saved_min=time_saved_min,
            time_saved_pct=time_saved_pct,
            original_fuel_liters=orig_fuel,
            optimized_fuel_liters=opt_fuel,
            fuel_saved_liters=fuel_saved_l,
            cost_saved_usd=cost_saved,
            algorithm_used="2-Opt TSP Heuristic + Nearest Neighbor",
            explanation=explanation,
        )

        return RouteOptimizeResponse(
            route_id=uuid.uuid4(),
            name=request.name or "Optimized Delivery Route",
            origin=origin,
            destination=dest,
            original_sequence=orig_stops,
            optimized_sequence=opt_stops,
            comparison=comparison,
            status="OPTIMIZED",
        )


route_optimizer = RouteOptimizer()
