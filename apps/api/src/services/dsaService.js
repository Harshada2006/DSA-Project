import { prisma } from '../database/client.js';
import { executeCppEngine } from '../engine/cppSubprocess.js';

export class DsaService {
  /**
   * Health status of compiled C++ engine
   */
  async getEngineHealth() {
    return await executeCppEngine('health');
  }

  /**
   * Run C++ Max-Heap 4-Factor Priority Queue algorithm to rank waste collection tasks
   * (Overflow 40%, Pickup Delay 25%, Sensitive Location 20%, Missed Pickups 15%)
   */
  async getPrioritizedTasks(options = {}) {
    const where = { status: { in: ['active', 'full'] } };
    if (options.wardId) where.wardId = options.wardId;
    if (options.urgency) where.urgency = options.urgency;

    const bins = await prisma.bin.findMany({
      where,
      include: {
        ward: true,
        complaints: {
          where: { status: { in: ['submitted', 'under_review', 'assigned', 'in_progress'] } },
        },
        tasks: {
          where: { status: { in: ['missed', 'blocked'] } },
        },
      },
    });

    const now = new Date();

    // Map tasks into payload for C++ engine
    const tasksPayload = bins.map((bin) => {
      let hoursSinceCollection = 24.0;
      if (bin.lastCollectedAt) {
        hoursSinceCollection = (now.getTime() - new Date(bin.lastCollectedAt).getTime()) / (1000 * 3600);
      }

      let freshnessHours = 1.0;
      if (bin.lastObservedAt) {
        freshnessHours = (now.getTime() - new Date(bin.lastObservedAt).getTime()) / (1000 * 3600);
      }

      // Linear predicted fill
      const predicted = Math.min(100.0, bin.currentFillPercentage + 15.0);

      // Sensitive location score
      let sensitiveScore = -1.0;
      if (bin.areaCategory === 'pilgrimage') sensitiveScore = 90.0;
      else if (bin.areaCategory === 'market') sensitiveScore = 80.0;
      else if (bin.areaCategory === 'commercial') sensitiveScore = 60.0;
      else if (bin.areaCategory === 'residential') sensitiveScore = 35.0;
      else sensitiveScore = 25.0;

      return {
        bin_id: bin.id,
        bin_code: bin.code,
        bin_name: bin.name,
        ward_id: bin.wardId,
        ward_name: bin.ward.name,
        latitude: bin.latitude,
        longitude: bin.longitude,
        area_category: bin.areaCategory,
        current_fill: bin.currentFillPercentage,
        predicted_fill: predicted,
        hours_since_last_collection: Math.round(hoursSinceCollection * 10) / 10,
        sensitive_location_factor: sensitiveScore,
        missed_pickups_count: bin.tasks.length,
        complaint_count: bin.complaints.length,
        data_freshness_hours: Math.round(freshnessHours * 10) / 10,
        provenance: bin.provenance,
      };
    });

    const cppInput = {
      weights: options.weights || {
        overflow_risk: 0.40,
        pickup_delay: 0.25,
        sensitive_location: 0.20,
        missed_pickups: 0.15,
      },
      top_k: options.limit || 0,
      tasks: tasksPayload,
    };

    // Execute compiled C++ DSA Engine
    const cppRes = await executeCppEngine('prioritize', cppInput);

    if (!cppRes.success) {
      throw new Error(`C++ DSA Engine prioritization failed: ${cppRes.error}`);
    }

    return {
      tasks: cppRes.data.ranked_tasks || [],
      count: cppRes.data.count || 0,
      executionTimeMs: cppRes.data.execution_time_ms || cppRes.executionTimeMs,
      algorithm: cppRes.data.algorithm || 'Max-Heap Priority Queue (C++ STL)',
      timeComplexity: cppRes.data.time_complexity || 'O(N log N)',
      weightsUsed: cppInput.weights,
    };
  }

  /**
   * Run C++ Dijkstra's algorithm for shortest path between graph nodes
   */
  async getShortestPath(sourceId, targetId, useTime = false) {
    const nodes = await prisma.roadNode.findMany();
    const edges = await prisma.roadEdge.findMany();

    const graphPayload = {
      nodes: nodes.map((n) => ({
        id: n.id,
        name: n.name,
        latitude: n.latitude,
        longitude: n.longitude,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.sourceNodeId,
        target: e.targetNodeId,
        distance_meters: e.distanceMeters,
        travel_time_seconds: e.travelTimeSeconds,
        road_name: e.roadName,
        one_way: e.oneWay,
      })),
    };

    const cppInput = {
      source_id: sourceId,
      target_id: targetId,
      use_time: useTime,
      graph: graphPayload,
    };

    const cppRes = await executeCppEngine('shortest-path', cppInput);

    if (!cppRes.success) {
      return {
        reachable: false,
        error: cppRes.error || 'Destination unreachable in road network graph',
        executionTimeMs: cppRes.executionTimeMs,
      };
    }

    return cppRes.data;
  }

  /**
   * Run C++ Multi-Stop Route Optimizer (Dijkstra + Greedy Nearest-Next-Stop Heuristic)
   */
  async getOptimizedRoute(request) {
    const nodes = await prisma.roadNode.findMany();
    const edges = await prisma.roadEdge.findMany();

    // Fetch candidate bins
    const bins = await prisma.bin.findMany({
      where: { id: { in: request.binIds } },
    });

    const depot = request.startingDepot || {
      id: 'depot-panchavati',
      name: 'Panchavati Solid Waste Sub-Depot',
      latitude: 20.0075,
      longitude: 73.7935,
    };

    const graphPayload = {
      nodes: nodes.map((n) => ({
        id: n.id,
        name: n.name,
        latitude: n.latitude,
        longitude: n.longitude,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.sourceNodeId,
        target: e.targetNodeId,
        distance_meters: e.distanceMeters,
        travel_time_seconds: e.travelTimeSeconds,
        road_name: e.roadName,
        one_way: e.oneWay,
      })),
    };

    const cppInput = {
      depot,
      candidates: bins.map((b) => ({
        id: b.id,
        name: b.name,
        latitude: b.latitude,
        longitude: b.longitude,
        demand_kg: Math.round((b.currentFillPercentage / 100.0) * (b.capacityLiters * 0.35)), // approx density
      })),
      max_stops: request.maxStops || 0,
      capacity_limit_kg: request.capacityLimitKg || 0,
      objective: request.objective || 'distance',
      graph: graphPayload,
    };

    const cppRes = await executeCppEngine('optimize-route', cppInput);

    if (!cppRes.success) {
      throw new Error(`C++ Route Optimizer execution failed: ${cppRes.error}`);
    }

    return cppRes.data;
  }
}

export const dsaService = new DsaService();
