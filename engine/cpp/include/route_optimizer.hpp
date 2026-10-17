#pragma once

#include <string>
#include <vector>
#include <set>
#include <cmath>
#include <algorithm>
#include "graph.hpp"
#include "dijkstra.hpp"

namespace eco_engine {

struct RouteOptimizationCandidate {
    std::string bin_id;
    std::string bin_name;
    double latitude = 0.0;
    double longitude = 0.0;
    double demand_kg = 50.0; // estimated waste load
};

struct OptimizedStop {
    int stop_order = 0;
    std::string type; // "depot" or "bin"
    std::string id;
    std::string name;
    double latitude = 0.0;
    double longitude = 0.0;
    double demand_kg = 0.0;
    double cumulative_distance_meters = 0.0;
    double cumulative_time_minutes = 0.0;
};

struct RouteOptimizationResult {
    std::vector<OptimizedStop> ordered_stops;
    std::vector<std::pair<double, double>> full_path_coordinates; // [lat, lng]
    double total_distance_km = 0.0;
    double total_duration_minutes = 0.0;
    std::vector<std::string> unreachable_stops;
    std::string algorithm_used;
    std::string time_complexity;
    std::string methodology_notes;
    bool capacity_constraint_exceeded = false;
};

class RouteOptimizer {
public:
    static RouteOptimizationResult optimize(
        const Graph& graph,
        const Node& depot,
        const std::vector<RouteOptimizationCandidate>& candidates,
        size_t max_stops = 0,
        double capacity_limit_kg = 0.0,
        bool optimize_by_time = false
    ) {
        RouteOptimizationResult result;
        result.algorithm_used = "Greedy Nearest-Neighbor Heuristic with Dijkstra Shortest Paths";
        result.time_complexity = "O(K * (V + E) log V), where K = number of stops, V = graph vertices, E = graph edges";
        result.methodology_notes = "Approximates Multi-Stop Vehicle Routing by iteratively selecting the closest reachable unvisited candidate stop using exact Dijkstra network distances, followed by return to the starting depot. Does not claim global TSP optimality.";

        if (candidates.empty()) {
            // Only depot
            OptimizedStop depot_stop;
            depot_stop.stop_order = 0;
            depot_stop.type = "depot";
            depot_stop.id = depot.id;
            depot_stop.name = depot.name;
            depot_stop.latitude = depot.latitude;
            depot_stop.longitude = depot.longitude;
            result.ordered_stops.push_back(depot_stop);
            result.full_path_coordinates.push_back({ depot.latitude, depot.longitude });
            return result;
        }

        // Map candidates to nearest graph nodes
        std::string depot_node_id = graph.find_nearest_node(depot.latitude, depot.longitude);
        if (depot_node_id.empty()) {
            result.unreachable_stops.push_back(depot.id);
            return result;
        }

        // Track unvisited candidates
        std::vector<RouteOptimizationCandidate> unvisited = candidates;
        std::string current_node_id = depot_node_id;
        double current_lat = depot.latitude;
        double current_lon = depot.longitude;

        double cumulative_dist = 0.0;
        double cumulative_time = 0.0;
        double current_load_kg = 0.0;

        // Add initial depot stop
        OptimizedStop start_stop;
        start_stop.stop_order = 0;
        start_stop.type = "depot";
        start_stop.id = depot.id;
        start_stop.name = depot.name;
        start_stop.latitude = depot.latitude;
        start_stop.longitude = depot.longitude;
        start_stop.cumulative_distance_meters = 0.0;
        start_stop.cumulative_time_minutes = 0.0;
        result.ordered_stops.push_back(start_stop);
        result.full_path_coordinates.push_back({ depot.latitude, depot.longitude });

        size_t stop_counter = 1;

        while (!unvisited.empty()) {
            if (max_stops > 0 && (result.ordered_stops.size() - 1) >= max_stops) {
                break;
            }

            // Find nearest reachable candidate from current location
            int best_idx = -1;
            double best_cost = std::numeric_limits<double>::infinity();
            ShortestPathResult best_path;
            std::string best_candidate_node_id = "";

            for (size_t i = 0; i < unvisited.size(); i++) {
                const auto& cand = unvisited[i];

                // Check capacity constraint
                if (capacity_limit_kg > 0.0 && (current_load_kg + cand.demand_kg) > capacity_limit_kg) {
                    result.capacity_constraint_exceeded = true;
                    continue;
                }

                std::string target_node_id = graph.find_nearest_node(cand.latitude, cand.longitude);
                if (target_node_id.empty()) continue;

                ShortestPathResult path = DijkstraRouter::find_shortest_path(
                    graph, current_node_id, target_node_id, optimize_by_time
                );

                if (path.reachable) {
                    double cost = optimize_by_time ? path.total_time_seconds : path.total_distance_meters;
                    if (cost < best_cost) {
                        best_cost = cost;
                        best_idx = static_cast<int>(i);
                        best_path = path;
                        best_candidate_node_id = target_node_id;
                    }
                }
            }

            if (best_idx == -1) {
                // Remaining candidates are unreachable or exceed vehicle capacity
                for (const auto& u : unvisited) {
                    result.unreachable_stops.push_back(u.bin_id);
                }
                break;
            }

            // Select this candidate stop
            RouteOptimizationCandidate selected = unvisited[best_idx];
            unvisited.erase(unvisited.begin() + best_idx);

            double leg_dist = best_path.total_distance_meters;
            if (leg_dist <= 0.0) {
                leg_dist = calculate_haversine_meters(current_lat, current_lon, selected.latitude, selected.longitude);
            }
            double leg_time = (best_path.total_time_seconds > 0.0)
                ? (best_path.total_time_seconds / 60.0)
                : (leg_dist / (30000.0 / 60.0));

            cumulative_dist += leg_dist;
            cumulative_time += leg_time;
            current_load_kg += selected.demand_kg;

            OptimizedStop bin_stop;
            bin_stop.stop_order = static_cast<int>(stop_counter++);
            bin_stop.type = "bin";
            bin_stop.id = selected.bin_id;
            bin_stop.name = selected.bin_name;
            bin_stop.latitude = selected.latitude;
            bin_stop.longitude = selected.longitude;
            bin_stop.demand_kg = selected.demand_kg;
            bin_stop.cumulative_distance_meters = cumulative_dist;
            bin_stop.cumulative_time_minutes = std::round(cumulative_time * 10.0) / 10.0;
            result.ordered_stops.push_back(bin_stop);

            // Append intermediate coordinates from Dijkstra path
            if (best_path.coordinate_path.size() > 1) {
                for (size_t c = 1; c < best_path.coordinate_path.size(); c++) {
                    result.full_path_coordinates.push_back(best_path.coordinate_path[c]);
                }
            } else {
                result.full_path_coordinates.push_back({ selected.latitude, selected.longitude });
            }

            current_node_id = best_candidate_node_id;
            current_lat = selected.latitude;
            current_lon = selected.longitude;
        }

        // Return path from last stop back to Depot
        ShortestPathResult return_path = DijkstraRouter::find_shortest_path(
            graph, current_node_id, depot_node_id, optimize_by_time
        );

        double ret_dist = return_path.total_distance_meters;
        if (ret_dist <= 0.0 && (current_lat != depot.latitude || current_lon != depot.longitude)) {
            ret_dist = calculate_haversine_meters(current_lat, current_lon, depot.latitude, depot.longitude);
        }

        cumulative_dist += ret_dist;
        cumulative_time += (return_path.total_time_seconds > 0.0 ? return_path.total_time_seconds / 60.0 : (ret_dist / 500.0));

        for (size_t c = 1; c < return_path.coordinate_path.size(); c++) {
            result.full_path_coordinates.push_back(return_path.coordinate_path[c]);
        }

        // Final Depot Stop
        OptimizedStop final_depot;
        final_depot.stop_order = static_cast<int>(stop_counter++);
        final_depot.type = "depot";
        final_depot.id = depot.id;
        final_depot.name = depot.name + " (Return)";
        final_depot.latitude = depot.latitude;
        final_depot.longitude = depot.longitude;
        final_depot.cumulative_distance_meters = cumulative_dist;
        final_depot.cumulative_time_minutes = std::round(cumulative_time * 10.0) / 10.0;
        result.ordered_stops.push_back(final_depot);

        result.total_distance_km = std::round((cumulative_dist / 1000.0) * 100.0) / 100.0;
        result.total_duration_minutes = std::round(cumulative_time * 10.0) / 10.0;

        return result;
    }
};

} // namespace eco_engine
