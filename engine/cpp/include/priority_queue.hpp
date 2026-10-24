#pragma once

#include <string>
#include <vector>
#include <queue>
#include <algorithm>
#include <cmath>
#include <sstream>
#include <iomanip>
#include "json_parser.hpp"

namespace eco_engine {

/**
 * 4-Factor Priority Weights (Section 13)
 * Total sum = 1.00 (100%)
 */
struct PrioritizationWeights {
    double weight_overflow_risk = 0.40;          // 40%
    double weight_pickup_delay = 0.25;           // 25%
    double weight_sensitive_location = 0.20;     // 20%
    double weight_missed_pickups = 0.15;         // 15%
};

struct CollectionTask {
    std::string bin_id;
    std::string bin_code;
    std::string bin_name;
    std::string ward_id;
    std::string ward_name;
    double latitude = 0.0;
    double longitude = 0.0;
    std::string area_category = "residential";
    std::string provenance = "observed";

    // 4 Raw Input Factors
    double current_fill = 0.0;                   // 0 to 100 %
    double predicted_fill = 0.0;                 // 0 to 100 %
    double hours_since_last_collection = 0.0;   // In hours (e.g. 24.0)
    double sensitive_location_factor = -1.0;    // 0 to 100 (if provided directly, else derived from area)
    int missed_pickups_count = 0;               // Count of missed pickups / overdue incidents
    int complaint_count = 0;                     // Open complaints
    double data_freshness_hours = 0.0;           // Observation age

    // 4 Normalized Factors (0.0 to 100.0)
    double norm_overflow_risk = 0.0;
    double norm_pickup_delay = 0.0;
    double norm_sensitive_location = 0.0;
    double norm_missed_pickups = 0.0;

    // Computed Output
    double priority_score = 0.0;                 // 0.0 to 100.0
    std::string priority_category = "Normal";    // Normal (0-39), Monitor (40-59), High (60-79), Critical (80-100)
    double contrib_overflow_risk = 0.0;
    double contrib_pickup_delay = 0.0;
    double contrib_sensitive_location = 0.0;
    double contrib_missed_pickups = 0.0;
    std::string reason_for_prioritization;
    std::string suggested_action;

    // Normalizes an input value safely between 0.0 and 100.0
    static double clamp100(double val) {
        if (std::isnan(val)) return 0.0;
        return std::max(0.0, std::min(100.0, val));
    }

    void calculate_priority(const PrioritizationWeights& weights) {
        // 1. Normalize Factor 1: Overflow Risk (0 to 100)
        double effective_fill = std::max(current_fill, predicted_fill);
        if (effective_fill < 0.0) effective_fill = 0.0;
        norm_overflow_risk = clamp100(effective_fill);

        // 2. Normalize Factor 2: Time Since Last Pickup (0 to 100)
        // Standard expected cycle is 24 hours. At 72+ hours (3 days), pickup delay is saturated at 100.
        if (hours_since_last_collection <= 0.0) {
            norm_pickup_delay = 0.0;
        } else {
            norm_pickup_delay = clamp100((hours_since_last_collection / 72.0) * 100.0);
        }

        // 3. Normalize Factor 3: Proximity to Sensitive Location (0 to 100)
        // Verified Nashik civic zones: Pilgrimage (Ramkund, Tapovan) = 90, Markets = 80, Commercial = 60, Residential = 35, Industrial = 25
        if (sensitive_location_factor >= 0.0) {
            norm_sensitive_location = clamp100(sensitive_location_factor);
        } else {
            if (area_category == "pilgrimage") {
                norm_sensitive_location = 90.0;
            } else if (area_category == "market") {
                norm_sensitive_location = 80.0;
            } else if (area_category == "commercial") {
                norm_sensitive_location = 60.0;
            } else if (area_category == "residential") {
                norm_sensitive_location = 35.0;
            } else {
                norm_sensitive_location = 25.0;
            }
        }

        // 4. Normalize Factor 4: Previous Missed Collections (0 to 100)
        // Each missed collection or complaint contributes heavily; 3+ missed pickups saturates to 100.
        int total_missed_or_complaints = missed_pickups_count + complaint_count;
        if (total_missed_or_complaints <= 0) {
            norm_missed_pickups = 0.0;
        } else {
            norm_missed_pickups = clamp100((static_cast<double>(total_missed_or_complaints) / 3.0) * 100.0);
        }

        // Weighted Linear Combination:
        // priorityScore = 0.40 * overflowRisk + 0.25 * pickupDelay + 0.20 * sensitiveLocationRisk + 0.15 * missedPickupRisk
        contrib_overflow_risk = weights.weight_overflow_risk * norm_overflow_risk;
        contrib_pickup_delay = weights.weight_pickup_delay * norm_pickup_delay;
        contrib_sensitive_location = weights.weight_sensitive_location * norm_sensitive_location;
        contrib_missed_pickups = weights.weight_missed_pickups * norm_missed_pickups;

        double raw_score = contrib_overflow_risk + contrib_pickup_delay + contrib_sensitive_location + contrib_missed_pickups;
        priority_score = clamp100(raw_score);
        priority_score = std::round(priority_score * 10.0) / 10.0;

        // Categorization based on Section 13:
        // 0–39: Normal
        // 40–59: Monitor
        // 60–79: High
        // 80–100: Critical
        if (priority_score >= 80.0 || norm_overflow_risk >= 90.0) {
            priority_category = "Critical";
            suggested_action = "Immediate dispatch required; high overflow hazard in sensitive zone";
        } else if (priority_score >= 60.0) {
            priority_category = "High";
            suggested_action = "Include in next scheduled collection shift within 6 hours";
        } else if (priority_score >= 40.0) {
            priority_category = "Monitor";
            suggested_action = "Routine collection cycle; monitor fullness trajectory";
        } else {
            priority_category = "Normal";
            suggested_action = "Standard monitoring; bin capacity sufficient";
        }

        // Human-readable reason explanation:
        std::ostringstream ss;
        ss << priority_category << " priority because ";
        std::vector<std::string> reasons;
        if (norm_overflow_risk >= 75.0) {
            reasons.push_back("estimated fullness is elevated (" + std::to_string(static_cast<int>(effective_fill)) + "%)");
        }
        if (norm_pickup_delay >= 50.0) {
            reasons.push_back("last collection is overdue (" + std::to_string(static_cast<int>(hours_since_last_collection)) + "h ago)");
        }
        if (norm_sensitive_location >= 75.0) {
            reasons.push_back("located in sensitive " + area_category + " zone");
        }
        if (norm_missed_pickups > 0.0) {
            reasons.push_back("previous pickups were missed or reported (" + std::to_string(total_missed_or_complaints) + " reports)");
        }

        if (reasons.empty()) {
            ss << "bin metrics are within normal operating parameters.";
        } else {
            for (size_t i = 0; i < reasons.size(); ++i) {
                if (i > 0 && i == reasons.size() - 1) ss << ", and ";
                else if (i > 0) ss << ", ";
                ss << reasons[i];
            }
            ss << ".";
        }
        reason_for_prioritization = ss.str();
    }
};

/**
 * Predictable Tie-Breaking Comparator (Section 13)
 * Primary: priority_score (higher first)
 * Secondary: norm_overflow_risk (higher first)
 * Tertiary: norm_missed_pickups (higher first)
 * Quaternary: bin_id lexicographical string comparison (deterministic)
 */
struct TaskComparator {
    bool operator()(const CollectionTask& a, const CollectionTask& b) const {
        if (std::abs(a.priority_score - b.priority_score) > 0.001) {
            return a.priority_score < b.priority_score;
        }
        if (std::abs(a.norm_overflow_risk - b.norm_overflow_risk) > 0.001) {
            return a.norm_overflow_risk < b.norm_overflow_risk;
        }
        if (std::abs(a.norm_missed_pickups - b.norm_missed_pickups) > 0.001) {
            return a.norm_missed_pickups < b.norm_missed_pickups;
        }
        return a.bin_id > b.bin_id; // reverse so smaller ID pops first on max-heap
    }
};

class PriorityQueueRanker {
public:
    static std::vector<CollectionTask> rank_tasks(
        std::vector<CollectionTask>& tasks,
        const PrioritizationWeights& weights = PrioritizationWeights(),
        size_t top_k = 0
    ) {
        for (auto& task : tasks) {
            task.calculate_priority(weights);
        }

        std::priority_queue<CollectionTask, std::vector<CollectionTask>, TaskComparator> max_heap(
            tasks.begin(), tasks.end()
        );

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
