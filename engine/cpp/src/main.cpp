#include <iostream>
#include <fstream>
#include <sstream>
#include <chrono>
#include "../include/json_parser.hpp"
#include "../include/priority_queue.hpp"
#include "../include/graph.hpp"
#include "../include/dijkstra.hpp"
#include "../include/route_optimizer.hpp"

using namespace eco_engine;

std::string read_input(int argc, char* argv[]) {
    // If a filename is passed as argument 2, read from file
    if (argc >= 3) {
        std::ifstream file(argv[2]);
        if (file.is_open()) {
            std::ostringstream ss;
            ss << file.rdbuf();
            return ss.str();
        }
    }
    // Otherwise read from standard input
    std::ostringstream ss;
    ss << std::cin.rdbuf();
    return ss.str();
}

int handle_health() {
    eco_json::Value resp(eco_json::Type::Object);
    resp["success"] = true;
    resp["status"] = "healthy";
    resp["version"] = "1.0.0";
    resp["engine"] = "EcoCollect C++ DSA Engine";
    resp["compiler"] =
#if defined(__clang__)
        "Clang";
#elif defined(__GNUC__)
        "GCC";
#elif defined(_MSC_VER)
        "MSVC";
#else
        "Unknown C++ Compiler";
#endif
    resp["standard"] = static_cast<double>(__cplusplus);
    
    eco_json::Value capabilities(eco_json::Type::Array);
    capabilities.push_back("prioritize");
    capabilities.push_back("shortest-path");
    capabilities.push_back("optimize-route");
    capabilities.push_back("health");
    resp["capabilities"] = capabilities;

    std::cout << resp.serialize() << std::endl;
    return 0;
}

int handle_prioritize(const std::string& input_json) {
    auto start_time = std::chrono::high_resolution_clock::now();
    eco_json::Value root = eco_json::parse(input_json);

    if (!root.is_object() && !root.is_array()) {
        eco_json::Value err(eco_json::Type::Object);
        err["success"] = false;
        err["error"] = "Invalid input: expected JSON object or array of tasks";
        std::cout << err.serialize() << std::endl;
        return 1;
    }

    PrioritizationWeights weights;
    if (root.is_object() && root.contains("weights")) {
        const auto& w = root["weights"];
        weights.weight_threshold_proximity = w["threshold_proximity"].as_double(weights.weight_threshold_proximity);
        weights.weight_predicted_urgency = w["predicted_urgency"].as_double(weights.weight_predicted_urgency);
        weights.weight_complaint_severity = w["complaint_severity"].as_double(weights.weight_complaint_severity);
        weights.weight_overdue_time = w["overdue_time"].as_double(weights.weight_overdue_time);
        weights.weight_staleness_penalty = w["staleness_penalty"].as_double(weights.weight_staleness_penalty);
    }

    const auto& tasks_json = root.is_array() ? root : root["tasks"];
    std::vector<CollectionTask> tasks;

    for (size_t i = 0; i < tasks_json.arr_val.size(); i++) {
        const auto& t = tasks_json[i];
        CollectionTask task;
        task.bin_id = t["bin_id"].as_string(t["id"].as_string("bin-" + std::to_string(i)));
        task.bin_code = t["bin_code"].as_string(t["code"].as_string("BIN-" + std::to_string(i)));
        task.bin_name = t["bin_name"].as_string(t["name"].as_string("Unnamed Bin"));
        task.ward_id = t["ward_id"].as_string("");
        task.ward_name = t["ward_name"].as_string("Nashik");
        task.latitude = t["latitude"].as_double(t["lat"].as_double(19.9975));
        task.longitude = t["longitude"].as_double(t["lng"].as_double(73.7898));
        task.current_fill = t["current_fill"].as_double(t["currentFillPercentage"].as_double(0.0));
        task.predicted_fill = t["predicted_fill"].as_double(t["predictedFillPercentage"].as_double(task.current_fill));
        task.time_to_threshold_hours = t["time_to_threshold_hours"].as_double(t["timeToThresholdHours"].as_double(24.0));
        task.complaint_count = t["complaint_count"].as_int(t["complaintCount"].as_int(0));
        task.hours_since_last_collection = t["hours_since_last_collection"].as_double(24.0);
        task.data_freshness_hours = t["data_freshness_hours"].as_double(2.0);
        task.provenance = t["provenance"].as_string("observed");
        tasks.push_back(task);
    }

    size_t top_k = root.is_object() ? root["top_k"].as_int(0) : 0;
    auto ranked = PriorityQueueRanker::rank_tasks(tasks, weights, top_k);

    auto end_time = std::chrono::high_resolution_clock::now();
    double exec_ms = std::chrono::duration<double, std::milli>(end_time - start_time).count();

    eco_json::Value resp(eco_json::Type::Object);
    resp["success"] = true;
    resp["count"] = static_cast<int>(ranked.size());
    resp["execution_time_ms"] = exec_ms;
    resp["algorithm"] = "Max-Heap Priority Queue (C++ STL std::priority_queue)";
    resp["time_complexity"] = "O(N log N) heap construction and priority extraction";

    eco_json::Value tasks_arr(eco_json::Type::Array);
    for (const auto& r : ranked) {
        eco_json::Value item(eco_json::Type::Object);
        item["bin_id"] = r.bin_id;
        item["bin_code"] = r.bin_code;
        item["bin_name"] = r.bin_name;
        item["ward_id"] = r.ward_id;
        item["ward_name"] = r.ward_name;
        item["latitude"] = r.latitude;
        item["longitude"] = r.longitude;
        item["priority_score"] = r.priority_score;
        item["urgency"] = r.urgency_level;
        item["current_fill"] = r.current_fill;
        item["predicted_fill"] = r.predicted_fill;
        item["time_to_threshold_hours"] = r.time_to_threshold_hours;
        item["complaint_count"] = r.complaint_count;
        item["hours_since_last_collection"] = r.hours_since_last_collection;
        item["data_freshness_hours"] = r.data_freshness_hours;
        item["suggested_action"] = r.suggested_action;
        item["provenance"] = r.provenance;

        eco_json::Value breakdown(eco_json::Type::Object);
        breakdown["threshold_proximity"] = r.comp_threshold_proximity;
        breakdown["predicted_urgency"] = r.comp_predicted_urgency;
        breakdown["complaint_severity"] = r.comp_complaint_severity;
        breakdown["overdue_time"] = r.comp_overdue_time;
        breakdown["freshness_discount"] = r.comp_freshness_discount;
        item["formula_breakdown"] = breakdown;

        tasks_arr.push_back(item);
    }
    resp["ranked_tasks"] = tasks_arr;

    std::cout << resp.serialize() << std::endl;
    return 0;
}

Graph parse_graph(const eco_json::Value& graph_json) {
    Graph graph;
    const auto& nodes = graph_json["nodes"];
    for (size_t i = 0; i < nodes.arr_val.size(); i++) {
        const auto& n = nodes[i];
        Node node;
        node.id = n["id"].as_string();
        node.name = n["name"].as_string(node.id);
        node.latitude = n["latitude"].as_double(n["lat"].as_double(0.0));
        node.longitude = n["longitude"].as_double(n["lng"].as_double(0.0));
        graph.add_node(node);
    }

    const auto& edges = graph_json["edges"];
    for (size_t i = 0; i < edges.arr_val.size(); i++) {
        const auto& e = edges[i];
        Edge edge;
        edge.id = e["id"].as_string("edge-" + std::to_string(i));
        std::string source_id = e["source"].as_string(e["source_node_id"].as_string());
        edge.target_id = e["target"].as_string(e["target_node_id"].as_string());
        edge.distance_meters = e["distance_meters"].as_double(e["distance"].as_double(100.0));
        edge.travel_time_seconds = e["travel_time_seconds"].as_double(edge.distance_meters / 8.33); // ~30 km/h
        edge.road_name = e["road_name"].as_string("Road");
        edge.one_way = e["one_way"].as_bool(false);
        graph.add_edge(edge, source_id);
    }

    return graph;
}

int handle_shortest_path(const std::string& input_json) {
    auto start_time = std::chrono::high_resolution_clock::now();
    eco_json::Value root = eco_json::parse(input_json);

    std::string source_id = root["source_id"].as_string(root["source"].as_string());
    std::string target_id = root["target_id"].as_string(root["target"].as_string());
    bool use_time = root["use_time"].as_bool(false);

    Graph graph = parse_graph(root["graph"]);

    ShortestPathResult result = DijkstraRouter::find_shortest_path(graph, source_id, target_id, use_time);

    auto end_time = std::chrono::high_resolution_clock::now();
    double exec_ms = std::chrono::duration<double, std::milli>(end_time - start_time).count();

    eco_json::Value resp(eco_json::Type::Object);
    resp["success"] = result.reachable;
    resp["reachable"] = result.reachable;
    resp["source_id"] = source_id;
    resp["target_id"] = target_id;
    resp["distance_meters"] = result.total_distance_meters;
    resp["travel_time_seconds"] = result.total_time_seconds;
    resp["nodes_visited"] = static_cast<int>(result.nodes_visited);
    resp["execution_time_ms"] = exec_ms;
    resp["algorithm"] = "Dijkstra's Algorithm with Min-Heap Priority Queue";
    resp["time_complexity"] = "O((V + E) log V)";

    eco_json::Value path_arr(eco_json::Type::Array);
    for (const auto& nid : result.node_path) {
        path_arr.push_back(nid);
    }
    resp["node_path"] = path_arr;

    eco_json::Value coords_arr(eco_json::Type::Array);
    for (const auto& coord : result.coordinate_path) {
        eco_json::Value pt(eco_json::Type::Array);
        pt.push_back(coord.first);
        pt.push_back(coord.second);
        coords_arr.push_back(pt);
    }
    resp["coordinate_path"] = coords_arr;

    std::cout << resp.serialize() << std::endl;
    return 0;
}

int handle_optimize_route(const std::string& input_json) {
    auto start_time = std::chrono::high_resolution_clock::now();
    eco_json::Value root = eco_json::parse(input_json);

    Graph graph = parse_graph(root["graph"]);

    Node depot;
    const auto& d_json = root["depot"];
    depot.id = d_json["id"].as_string("depot-main");
    depot.name = d_json["name"].as_string("Central Waste Depot");
    depot.latitude = d_json["latitude"].as_double(d_json["lat"].as_double(19.9975));
    depot.longitude = d_json["longitude"].as_double(d_json["lng"].as_double(73.7898));
    graph.add_node(depot);

    std::vector<RouteOptimizationCandidate> candidates;
    const auto& cand_arr = root["candidates"].is_array() ? root["candidates"] : root["bins"];
    for (size_t i = 0; i < cand_arr.arr_val.size(); i++) {
        const auto& c = cand_arr[i];
        RouteOptimizationCandidate cand;
        cand.bin_id = c["id"].as_string(c["bin_id"].as_string("bin-" + std::to_string(i)));
        cand.bin_name = c["name"].as_string(c["bin_name"].as_string("Stop " + std::to_string(i + 1)));
        cand.latitude = c["latitude"].as_double(c["lat"].as_double(0.0));
        cand.longitude = c["longitude"].as_double(c["lng"].as_double(0.0));
        cand.demand_kg = c["demand_kg"].as_double(c["demand"].as_double(50.0));
        candidates.push_back(cand);
    }

    size_t max_stops = root["max_stops"].as_int(0);
    double capacity_limit = root["capacity_limit_kg"].as_double(0.0);
    bool optimize_by_time = root["objective"].as_string() == "time";

    RouteOptimizationResult opt_res = RouteOptimizer::optimize(
        graph, depot, candidates, max_stops, capacity_limit, optimize_by_time
    );

    auto end_time = std::chrono::high_resolution_clock::now();
    double exec_ms = std::chrono::duration<double, std::milli>(end_time - start_time).count();

    eco_json::Value resp(eco_json::Type::Object);
    resp["success"] = true;
    resp["total_distance_km"] = opt_res.total_distance_km;
    resp["total_duration_minutes"] = opt_res.total_duration_minutes;
    resp["execution_time_ms"] = exec_ms;
    resp["algorithm"] = opt_res.algorithm_used;
    resp["time_complexity"] = opt_res.time_complexity;
    resp["methodology_notes"] = opt_res.methodology_notes;
    resp["capacity_constraint_exceeded"] = opt_res.capacity_constraint_exceeded;

    eco_json::Value stops_arr(eco_json::Type::Array);
    for (const auto& st : opt_res.ordered_stops) {
        eco_json::Value item(eco_json::Type::Object);
        item["stop_order"] = st.stop_order;
        item["type"] = st.type;
        item["id"] = st.id;
        item["name"] = st.name;
        item["latitude"] = st.latitude;
        item["longitude"] = st.longitude;
        item["demand_kg"] = st.demand_kg;
        item["cumulative_distance_meters"] = st.cumulative_distance_meters;
        item["cumulative_time_minutes"] = st.cumulative_time_minutes;
        stops_arr.push_back(item);
    }
    resp["ordered_stops"] = stops_arr;

    eco_json::Value coords_arr(eco_json::Type::Array);
    for (const auto& pt : opt_res.full_path_coordinates) {
        eco_json::Value pair(eco_json::Type::Array);
        pair.push_back(pt.first);
        pair.push_back(pt.second);
        coords_arr.push_back(pair);
    }
    resp["full_path_coordinates"] = coords_arr;

    eco_json::Value unreach_arr(eco_json::Type::Array);
    for (const auto& u : opt_res.unreachable_stops) {
        unreach_arr.push_back(u);
    }
    resp["unreachable_stops"] = unreach_arr;

    std::cout << resp.serialize() << std::endl;
    return 0;
}

int main(int argc, char* argv[]) {
    if (argc < 2) {
        eco_json::Value err(eco_json::Type::Object);
        err["success"] = false;
        err["error"] = "Usage: eco_engine <health|prioritize|shortest-path|optimize-route> [input_file]";
        std::cout << err.serialize() << std::endl;
        return 1;
    }

    std::string command = argv[1];

    if (command == "health") {
        return handle_health();
    }

    std::string input_json = read_input(argc, argv);
    if (input_json.empty() && command != "health") {
        eco_json::Value err(eco_json::Type::Object);
        err["success"] = false;
        err["error"] = "No input JSON provided on stdin or input file";
        std::cout << err.serialize() << std::endl;
        return 1;
    }

    try {
        if (command == "prioritize") {
            return handle_prioritize(input_json);
        } else if (command == "shortest-path") {
            return handle_shortest_path(input_json);
        } else if (command == "optimize-route") {
            return handle_optimize_route(input_json);
        } else {
            eco_json::Value err(eco_json::Type::Object);
            err["success"] = false;
            err["error"] = "Unknown command: " + command;
            std::cout << err.serialize() << std::endl;
            return 1;
        }
    } catch (const std::exception& ex) {
        eco_json::Value err(eco_json::Type::Object);
        err["success"] = false;
        err["error"] = std::string("C++ Exception: ") + ex.what();
        std::cout << err.serialize() << std::endl;
        return 1;
    }
}
