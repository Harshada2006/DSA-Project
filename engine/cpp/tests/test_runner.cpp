#include <iostream>
#include <cassert>
#include <cmath>
#include "../include/json_parser.hpp"
#include "../include/priority_queue.hpp"
#include "../include/graph.hpp"
#include "../include/dijkstra.hpp"
#include "../include/route_optimizer.hpp"

using namespace eco_engine;

void test_priority_queue() {
    std::cout << "[TEST] Running Priority Queue Tests..." << std::endl;

    std::vector<CollectionTask> tasks;

    // Task 1: Overflowing bin with 4 complaints (Critical)
    CollectionTask t1;
    t1.bin_id = "bin-1";
    t1.bin_code = "BIN-001";
    t1.current_fill = 95.0;
    t1.time_to_threshold_hours = 0.0;
    t1.complaint_count = 4;
    t1.hours_since_last_collection = 72.0;
    t1.data_freshness_hours = 1.0;
    tasks.push_back(t1);

    // Task 2: Moderate fill, no complaints (Low/Med)
    CollectionTask t2;
    t2.bin_id = "bin-2";
    t2.bin_code = "BIN-002";
    t2.current_fill = 35.0;
    t2.time_to_threshold_hours = 48.0;
    t2.complaint_count = 0;
    t2.hours_since_last_collection = 12.0;
    t2.data_freshness_hours = 2.0;
    tasks.push_back(t2);

    // Task 3: Near threshold, 1 complaint (High)
    CollectionTask t3;
    t3.bin_id = "bin-3";
    t3.bin_code = "BIN-003";
    t3.current_fill = 78.0;
    t3.time_to_threshold_hours = 4.0;
    t3.complaint_count = 1;
    t3.hours_since_last_collection = 36.0;
    t3.data_freshness_hours = 1.0;
    tasks.push_back(t3);

    auto ranked = PriorityQueueRanker::rank_tasks(tasks);

    assert(ranked.size() == 3);
    assert(ranked[0].bin_id == "bin-1"); // Highest priority must be bin-1
    assert(ranked[0].priority_score > ranked[1].priority_score);
    assert(ranked[1].bin_id == "bin-3");
    assert(ranked[1].priority_score > ranked[2].priority_score);
    assert(ranked[2].bin_id == "bin-2");

    std::cout << "  ✓ Max-heap prioritized correctly: " << ranked[0].bin_code << " (" << ranked[0].priority_score << ") > "
              << ranked[1].bin_code << " (" << ranked[1].priority_score << ") > "
              << ranked[2].bin_code << " (" << ranked[2].priority_score << ")" << std::endl;

    // Test empty tasks
    std::vector<CollectionTask> empty_tasks;
    auto empty_ranked = PriorityQueueRanker::rank_tasks(empty_tasks);
    assert(empty_ranked.empty());
    std::cout << "  ✓ Empty tasks handled safely" << std::endl;
}

void test_dijkstra() {
    std::cout << "[TEST] Running Dijkstra Shortest Path Tests..." << std::endl;

    Graph g;
    // Simple Nashik triangle: Panchavati (A) -> Canada Corner (B) -> Nashik Road (C)
    Node nA = { "A", "Panchavati", 20.0050, 73.7950 };
    Node nB = { "B", "Canada Corner", 19.9980, 73.7750 };
    Node nC = { "C", "Nashik Road", 19.9500, 73.8300 };
    Node nD = { "D", "Isolated Point", 19.9100, 73.7000 }; // Disconnected node

    g.add_node(nA);
    g.add_node(nB);
    g.add_node(nC);
    g.add_node(nD);

    // Edges
    // A -> B: 2000m
    // B -> C: 3000m
    // A -> C direct: 7000m (longer than A->B->C = 5000m)
    Edge eAB = { "e1", "B", 2000.0, 240.0, "MG Road", false };
    Edge eBC = { "e2", "C", 3000.0, 360.0, "Nashik-Pune Road", false };
    Edge eAC = { "e3", "C", 7000.0, 900.0, "Highway", false };

    g.add_edge(eAB, "A");
    g.add_edge(eBC, "B");
    g.add_edge(eAC, "A");

    // Test shortest path from A to C
    ShortestPathResult res = DijkstraRouter::find_shortest_path(g, "A", "C", false);
    assert(res.reachable == true);
    assert(std::abs(res.total_distance_meters - 5000.0) < 0.001); // Takes A->B->C
    assert(res.node_path.size() == 3);
    assert(res.node_path[0] == "A");
    assert(res.node_path[1] == "B");
    assert(res.node_path[2] == "C");
    std::cout << "  ✓ Dijkstra correctly chose path A -> B -> C with distance 5000m" << std::endl;

    // Test source == target
    ShortestPathResult same = DijkstraRouter::find_shortest_path(g, "A", "A", false);
    assert(same.reachable == true);
    assert(same.total_distance_meters == 0.0);
    assert(same.node_path.size() == 1);
    std::cout << "  ✓ Dijkstra handled source == target" << std::endl;

    // Test disconnected node
    ShortestPathResult disc = DijkstraRouter::find_shortest_path(g, "A", "D", false);
    assert(disc.reachable == false);
    std::cout << "  ✓ Dijkstra handled disconnected node" << std::endl;

    // Test invalid node
    ShortestPathResult inv = DijkstraRouter::find_shortest_path(g, "A", "NON_EXISTENT", false);
    assert(inv.reachable == false);
    std::cout << "  ✓ Dijkstra handled non-existent target" << std::endl;
}

void test_route_optimizer() {
    std::cout << "[TEST] Running Multi-Stop Route Optimizer Tests..." << std::endl;

    Graph g;
    Node depot = { "depot", "Central Depot", 20.0000, 73.7800 };
    Node s1 = { "s1", "Stop 1", 20.0050, 73.7850 };
    Node s2 = { "s2", "Stop 2", 20.0100, 73.7900 };

    g.add_node(depot);
    g.add_node(s1);
    g.add_node(s2);

    g.add_edge({ "e1", "s1", 800.0, 100.0, "Depot Road", false }, "depot");
    g.add_edge({ "e2", "s2", 900.0, 110.0, "Link Road", false }, "s1");
    g.add_edge({ "e3", "s2", 2000.0, 250.0, "Ring Road", false }, "depot");

    std::vector<RouteOptimizationCandidate> candidates = {
        { "b1", "Bin Near Stop 1", 20.0051, 73.7851, 80.0 },
        { "b2", "Bin Near Stop 2", 20.0101, 73.7901, 100.0 }
    };

    RouteOptimizationResult opt = RouteOptimizer::optimize(g, depot, candidates);

    assert(opt.ordered_stops.size() == 4); // depot -> b1 -> b2 -> depot (return)
    assert(opt.ordered_stops[0].type == "depot");
    assert(opt.ordered_stops[1].id == "b1");
    assert(opt.ordered_stops[2].id == "b2");
    assert(opt.ordered_stops[3].type == "depot");
    assert(opt.total_distance_km > 0.0);
    assert(opt.unreachable_stops.empty());

    std::cout << "  ✓ Multi-stop route ordered: Depot -> "
              << opt.ordered_stops[1].name << " -> "
              << opt.ordered_stops[2].name << " -> Depot ("
              << opt.total_distance_km << " km)" << std::endl;

    // Test max stops constraint
    RouteOptimizationResult opt_max = RouteOptimizer::optimize(g, depot, candidates, 1);
    assert(opt_max.ordered_stops.size() == 3); // depot -> 1 stop -> depot return
    std::cout << "  ✓ Max stops constraint honored (stops count: " << opt_max.ordered_stops.size() << ")" << std::endl;
}

int main() {
    std::cout << "========================================" << std::endl;
    std::cout << "   ECO COLLECT C++ ENGINE UNIT TESTS   " << std::endl;
    std::cout << "========================================" << std::endl;

    try {
        test_priority_queue();
        test_dijkstra();
        test_route_optimizer();
        std::cout << "========================================" << std::endl;
        std::cout << "   ALL C++ UNIT TESTS PASSED (100%)    " << std::endl;
        std::cout << "========================================" << std::endl;
        return 0;
    } catch (const std::exception& e) {
        std::cerr << "Test failed with exception: " << e.what() << std::endl;
        return 1;
    }
}
