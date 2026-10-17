#pragma once

#include <string>
#include <vector>
#include <unordered_map>
#include <map>
#include <cmath>
#include <limits>
#include <stdexcept>

namespace eco_engine {

constexpr double EARTH_RADIUS_METERS = 6371000.0;
constexpr double PI = 3.14159265358979323846;

inline double degrees_to_radians(double deg) {
    return deg * (PI / 180.0);
}

inline double calculate_haversine_meters(double lat1, double lon1, double lat2, double lon2) {
    double dlat = degrees_to_radians(lat2 - lat1);
    double dlon = degrees_to_radians(lon2 - lon1);
    double rlat1 = degrees_to_radians(lat1);
    double rlat2 = degrees_to_radians(lat2);

    double a = std::sin(dlat / 2.0) * std::sin(dlat / 2.0) +
               std::cos(rlat1) * std::cos(rlat2) *
               std::sin(dlon / 2.0) * std::sin(dlon / 2.0);
    double c = 2.0 * std::atan2(std::sqrt(a), std::sqrt(1.0 - a));
    return EARTH_RADIUS_METERS * c;
}

struct Node {
    std::string id;
    std::string name;
    double latitude = 0.0;
    double longitude = 0.0;
};

struct Edge {
    std::string id;
    std::string target_id;
    double distance_meters = 0.0;
    double travel_time_seconds = 0.0;
    std::string road_name;
    bool one_way = false;
};

class Graph {
public:
    std::map<std::string, Node> nodes;
    std::map<std::string, std::vector<Edge>> adjacency_list;

    void add_node(const Node& node) {
        nodes[node.id] = node;
        if (adjacency_list.find(node.id) == adjacency_list.end()) {
            adjacency_list[node.id] = {};
        }
    }

    void add_edge(const Edge& edge, const std::string& source_id) {
        // Validate edge weight is non-negative
        if (edge.distance_meters < 0.0 || edge.travel_time_seconds < 0.0) {
            throw std::invalid_argument("Negative edge weights are not allowed in road graph.");
        }

        adjacency_list[source_id].push_back(edge);

        // If not one way, add reverse edge
        if (!edge.one_way) {
            Edge reverse_edge = edge;
            reverse_edge.target_id = source_id;
            adjacency_list[edge.target_id].push_back(reverse_edge);
        }
    }

    bool has_node(const std::string& node_id) const {
        return nodes.find(node_id) != nodes.end();
    }

    const Node* get_node(const std::string& node_id) const {
        auto it = nodes.find(node_id);
        if (it != nodes.end()) {
            return &(it->second);
        }
        return nullptr;
    }

    const std::vector<Edge>& get_edges(const std::string& node_id) const {
        static const std::vector<Edge> empty_edges;
        auto it = adjacency_list.find(node_id);
        if (it != adjacency_list.end()) {
            return it->second;
        }
        return empty_edges;
    }

    std::string find_nearest_node(double lat, double lon) const {
        std::string nearest_id = "";
        double min_dist = std::numeric_limits<double>::infinity();

        for (const auto& pair : nodes) {
            double d = calculate_haversine_meters(lat, lon, pair.second.latitude, pair.second.longitude);
            if (d < min_dist) {
                min_dist = d;
                nearest_id = pair.first;
            }
        }
        return nearest_id;
    }

    size_t node_count() const { return nodes.size(); }
    
    size_t edge_count() const {
        size_t count = 0;
        for (const auto& pair : adjacency_list) {
            count += pair.second.size();
        }
        return count;
    }
};

} // namespace eco_engine
