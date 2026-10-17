#pragma once

#include <string>
#include <vector>
#include <queue>
#include <algorithm>
#include <cmath>
#include "json_parser.hpp"

namespace eco_engine {

struct PrioritizationWeights {
    double weight_threshold_proximity = 0.35;
    double weight_predicted_urgency = 0.25;
    double weight_complaint_severity = 0.20;
    double weight_overdue_time = 0.15;
    double weight_staleness_penalty = 0.05;
};

struct CollectionTask {
    std::string bin_id;
    std::string bin_code;
    std::string bin_name;
    std::string ward_id;
    std::string ward_name;
    double latitude = 0.0;
    double longitude = 0.0;
    double current_fill = 0.0;
    double predicted_fill = 0.0;
    double time_to_threshold_hours = 0.0;
    int complaint_count = 0;
    double hours_since_last_collection = 0.0;
    double data_freshness_hours = 0.0;
    std::string provenance = "observed";

    // Computed values
    double priority_score = 0.0;
    std::string urgency_level = "low";
    double comp_threshold_proximity = 0.0;
    double comp_predicted_urgency = 0.0;
    double comp_complaint_severity = 0.0;
    double comp_overdue_time = 0.0;
    double comp_freshness_discount = 0.0;
    std::string suggested_action;

    void calculate_priority(const PrioritizationWeights& weights) {
        // 1. Threshold Proximity (0.0 to 1.0): based on 80% threshold
        comp_threshold_proximity = std::min(1.0, std::max(0.0, current_fill / 80.0));

        // 2. Predicted Urgency (0.0 to 1.0): 0 hours remaining = 1.0, 48+ hours = 0.0
        if (time_to_threshold_hours <= 0.0) {
            comp_predicted_urgency = 1.0;
        } else {
            comp_predicted_urgency = std::min(1.0, std::max(0.0, 1.0 - (time_to_threshold_hours / 48.0)));
        }

        // 3. Complaint Severity (0.0 to 1.0): 3+ complaints saturates
        comp_complaint_severity = std::min(1.0, static_cast<double>(complaint_count) / 3.0);

        // 4. Overdue Time Since Last Collection (0.0 to 1.0): 72+ hours saturates
        comp_overdue_time = std::min(1.0, std::max(0.0, hours_since_last_collection / 72.0));

        // 5. Staleness Penalty (0.0 to 1.0): data older than 48 hours is discounted
        comp_freshness_discount = std::min(1.0, std::max(0.0, data_freshness_hours / 48.0));

        // Weighted Linear Combination with staleness reduction
        double raw_score = (weights.weight_threshold_proximity * comp_threshold_proximity)
                         + (weights.weight_predicted_urgency * comp_predicted_urgency)
                         + (weights.weight_complaint_severity * comp_complaint_severity)
                         + (weights.weight_overdue_time * comp_overdue_time)
                         - (weights.weight_staleness_penalty * comp_freshness_discount);

        // Normalize between 0.0 and 100.0
        priority_score = std::max(0.0, std::min(100.0, raw_score * 100.0));
        priority_score = std::round(priority_score * 10.0) / 10.0;

        // Determine Urgency Category and Suggested Action
        if (current_fill >= 90.0 || time_to_threshold_hours <= 3.0 || complaint_count >= 3) {
            urgency_level = "critical";
            suggested_action = "Immediate dispatch required; severe overflow / complaint risk";
        } else if (priority_score >= 65.0 || current_fill >= 75.0 || time_to_threshold_hours <= 12.0) {
            urgency_level = "high";
            suggested_action = "Include in next scheduled collection shift within 6 hours";
        } else if (priority_score >= 40.0 || current_fill >= 50.0) {
            urgency_level = "medium";
            suggested_action = "Routine collection within 24 hours";
        } else {
            urgency_level = "low";
            suggested_action = "Monitor status; no immediate action required";
        }
    }
};

struct TaskComparator {
    bool operator()(const CollectionTask& a, const CollectionTask& b) const {
        // Max-heap: highest priority_score appears at top
        if (std::abs(a.priority_score - b.priority_score) > 0.001) {
            return a.priority_score < b.priority_score;
        }
        // Tie-breaker: higher fill level comes first
        if (std::abs(a.current_fill - b.current_fill) > 0.001) {
            return a.current_fill < b.current_fill;
        }
        // Secondary tie-breaker: more complaints first
        return a.complaint_count < b.complaint_count;
    }
};

class PriorityQueueRanker {
public:
    static std::vector<CollectionTask> rank_tasks(
        std::vector<CollectionTask>& tasks,
        const PrioritizationWeights& weights = PrioritizationWeights(),
        size_t top_k = 0
    ) {
        // 1. Calculate scores
        for (auto& task : tasks) {
            task.calculate_priority(weights);
        }

        // 2. Build Max-Heap using STL priority_queue
        std::priority_queue<CollectionTask, std::vector<CollectionTask>, TaskComparator> max_heap(
            tasks.begin(), tasks.end()
        );

        // 3. Extract in descending order of priority
        std::vector<CollectionTask> ranked;
        ranked.reserve(tasks.size());

        size_t limit = (top_k > 0 && top_k < tasks.size()) ? top_k : tasks.size();
        while (!max_heap.empty() && ranked.size() < limit) {
            ranked.push_back(max_heap.top());
            max_heap.pop();
        }

        return ranked;
    }
};

} // namespace eco_engine
