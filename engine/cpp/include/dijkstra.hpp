#pragma once

#include <string>
#include <vector>
#include <map>
#include <queue>
#include <limits>
#include <algorithm>
#include "graph.hpp"

namespace eco_engine {

struct ShortestPathResult {
    bool reachable = false;
    double total_distance_meters = 0.0;
    double total_time_seconds = 0.0;
    std::vector<std::string> node_path;
    std::vector<std::pair<double, double>> coordinate_path; // [lat, lng]
    size_t nodes_visited = 0;
};

class DijkstraRouter {
public:
    static ShortestPathResult find_shortest_path(
        const Graph& graph,
        const std::string& source_id,
        const std::string& target_id,
        bool use_time_as_weight = false
    ) {
        ShortestPathResult result;

        if (!graph.has_node(source_id) || !graph.has_node(target_id)) {
            return result; // Unreachable / invalid nodes
        }

        if (source_id == target_id) {
            result.reachable = true;
            result.total_distance_meters = 0.0;
            result.total_time_seconds = 0.0;
            result.node_path = { source_id };
            const Node* n = graph.get_node(source_id);
            if (n) {
                result.coordinate_path.push_back({ n->latitude, n->longitude });
            }
            return result;
        }

        // Distances map
        std::map<std::string, double> dist;
        std::map<std::string, double> alt_cost; // stores the other metric (time or distance)
        std::map<std::string, std::string> prev_node;

        for (const auto& pair : graph.nodes) {
            dist[pair.first] = std::numeric_limits<double>::infinity();
            alt_cost[pair.first] = 0.0;
        }

        // Min-heap: pair<cost, node_id>
        using QElement = std::pair<double, std::string>;
        std::priority_queue<QElement, std::vector<QElement>, std::greater<QElement>> pq;

        dist[source_id] = 0.0;
        pq.push({ 0.0, source_id });

        while (!pq.empty()) {
            auto top = pq.top();
            pq.pop();

            double current_cost = top.first;
            std::string u = top.second;
            result.nodes_visited++;

            // If we reached target, we can terminate early
            if (u == target_id) {
                break;
            }

            if (current_cost > dist[u]) {
                continue;
            }

            for (const auto& edge : graph.get_edges(u)) {
                std::string v = edge.target_id;
                double edge_weight = use_time_as_weight ? edge.travel_time_seconds : edge.distance_meters;
                double other_weight = use_time_as_weight ? edge.distance_meters : edge.travel_time_seconds;

                if (dist[u] + edge_weight < dist[v]) {
                    dist[v] = dist[u] + edge_weight;
                    alt_cost[v] = alt_cost[u] + other_weight;
                    prev_node[v] = u;
                    pq.push({ dist[v], v });
                }
            }
        }

        // Check reachability
        if (dist[target_id] == std::numeric_limits<double>::infinity()) {
            result.reachable = false;
            return result;
        }

        result.reachable = true;
        if (use_time_as_weight) {
            result.total_time_seconds = dist[target_id];
            result.total_distance_meters = alt_cost[target_id];
        } else {
            result.total_distance_meters = dist[target_id];
            result.total_time_seconds = alt_cost[target_id];
        }

        // Reconstruct path by walking backwards
        std::string curr = target_id;
        while (curr != source_id) {
            result.node_path.push_back(curr);
            auto it = prev_node.find(curr);
            if (it == prev_node.end()) break;
            curr = it->second;
        }
        result.node_path.push_back(source_id);
        std::reverse(result.node_path.begin(), result.node_path.end());

        // Fill coordinate path
        for (const auto& nid : result.node_path) {
            const Node* node = graph.get_node(nid);
            if (node) {
                result.coordinate_path.push_back({ node->latitude, node->longitude });
            }
        }

        return result;
    }
};

} // namespace eco_engine
