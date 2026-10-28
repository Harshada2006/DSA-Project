import { prisma } from '../database/client.js';
import { executeCppEngine } from '../engine/cppSubprocess.js';

export class DsaService {
  /* ============================================================
   * MODULE 1: C++ Native Engine Health Check
   * ============================================================ */
  async getEngineHealth() {
    return await executeCppEngine('health');
  }

  /* ============================================================
   * MODULE 2: Multi-Factor Priority Bin Dispatch Calculation
   * (Overflow 40%, Pickup Delay 25%, Sensitive Location 20%, Missed Pickups 15%)
   * ============================================================ */
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

    const tasksPayload = bins.map((bin) => {
      let hoursSinceCollection = 24.0;
      if (bin.lastCollectedAt) {
        hoursSinceCollection = (now.getTime() - new Date(bin.lastCollectedAt).getTime()) / (1000 * 3600);
      }

      let freshnessHours = 1.0;
      if (bin.lastObservedAt) {
        freshnessHours = (now.getTime() - new Date(bin.lastObservedAt).getTime()) / (1000 * 3600);
      }

      const predicted = Math.min(100.0, bin.currentFillPercentage + 15.0);

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

    const cppRes = await executeCppEngine('prioritize', cppInput);

    if (!cppRes.success) {
      throw new Error(`Priority calculation failed: ${cppRes.error}`);
    }

    return {
      tasks: cppRes.data.ranked_tasks || [],
      count: cppRes.data.count || 0,
      executionTimeMs: cppRes.data.execution_time_ms || cppRes.executionTimeMs,
      rankingMethod: 'Collection Priority Scoring (4-Factor Model)',
      weightsUsed: cppInput.weights,
    };
  }

  /* ============================================================
   * MODULE 3: Dijkstra Shortest Path with Dynamic Roadblock Avoidance
   * ============================================================ */
  async getShortestPath(sourceId, targetId, useTime = false, avoidBlocked = true) {
    const nodes = await prisma.roadNode.findMany();
    const edgeFilter = avoidBlocked ? { isBlocked: false } : {};
    const edges = await prisma.roadEdge.findMany({ where: edgeFilter });

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

  /* ============================================================
   * MODULE 4: Multi-Stop Route Optimizer & Rerouting
   * ============================================================ */
  async getOptimizedRoute(request) {
    const nodes = await prisma.roadNode.findMany();

    // Check for blocked roads to avoid
    const avoidRoadblocks = request.avoidRoadblocks !== false;
    const blockedEdges = await prisma.roadEdge.findMany({ where: { isBlocked: true } });
    const blockedEdgeIds = new Set(blockedEdges.map((e) => e.id));

    if (Array.isArray(request.blockedEdgeIds)) {
      request.blockedEdgeIds.forEach((id) => blockedEdgeIds.add(id));
    }

    const allEdges = await prisma.roadEdge.findMany();
    const activeEdges = avoidRoadblocks
      ? allEdges.filter((e) => !blockedEdgeIds.has(e.id))
      : allEdges;

    // Fetch candidate bins
    const bins = await prisma.bin.findMany({
      where: { id: { in: request.binIds || [] } },
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
      edges: activeEdges.map((e) => ({
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
        demand_kg: Math.round(((b.currentFillPercentage || 50) / 100.0) * (b.capacityLiters * 0.35)),
      })),
      max_stops: request.maxStops || 0,
      capacity_limit_kg: request.capacityLimitKg || 0,
      objective: request.objective || 'distance',
      graph: graphPayload,
    };

    const cppRes = await executeCppEngine('optimize-route', cppInput);

    if (!cppRes.success) {
      throw new Error(`Route calculation failed: ${cppRes.error}`);
    }

    const data = cppRes.data;
    const isRerouted = blockedEdgeIds.size > 0;

    return {
      ...data,
      isRerouted,
      blockedRoadsAvoidedCount: blockedEdgeIds.size,
      routingMessage: isRerouted
        ? `Alternative route calculated avoiding ${blockedEdgeIds.size} reported road closure(s).`
        : 'Suggested collection route calculated along verified road network.',
    };
  }
}

export const dsaService = new DsaService();
