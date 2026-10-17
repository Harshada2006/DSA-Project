import { prisma } from '../database/client';
import { executeCppEngine, CppSubprocessResult } from '../engine/cppSubprocess';
import { PriorityTask, RouteOptimizationRequest, RouteOptimizationResponse } from '@eco-collect/shared';

export class DsaService {
  /**
   * Health status of compiled C++ engine
   */
  async getEngineHealth() {
    return await executeCppEngine('health');
  }

  /**
   * Run C++ Max-Heap Priority Queue algorithm to rank waste collection tasks
   */
  async getPrioritizedTasks(options: {
    wardId?: string;
    urgency?: string;
    limit?: number;
    weights?: {
      threshold_proximity?: number;
      predicted_urgency?: number;
      complaint_severity?: number;
      overdue_time?: number;
      staleness_penalty?: number;
    };
  } = {}): Promise<{
    tasks: PriorityTask[];
    executionTimeMs: number;
    algorithm: string;
    timeComplexity: string;
    cppResult: CppSubprocessResult;
  }> {
    // 1. Fetch active bins from database
    const where: any = { status: { in: ['active', 'full'] } };
    if (options.wardId) where.wardId = options.wardId;
    if (options.urgency) where.urgency = options.urgency;

    const bins = await prisma.bin.findMany({
      where,
      include: {
        ward: true,
        complaints: {
          where: { status: { in: ['open', 'assigned', 'in_progress'] } },
        },
      },
    });

    const now = new Date();

    // 2. Format tasks payload for C++ engine
    const tasksPayload = bins.map((bin) => {
      let hoursSinceCollection = 24.0;
      if (bin.lastCollectedAt) {
        hoursSinceCollection = (now.getTime() - new Date(bin.lastCollectedAt).getTime()) / (1000 * 3600);
      }

      let freshnessHours = 1.0;
      if (bin.lastObservedAt) {
        freshnessHours = (now.getTime() - new Date(bin.lastObservedAt).getTime()) / (1000 * 3600);
      }

      // Linear estimation of time to threshold (80%)
      const hourlyRate = 18.0 / 24.0;
      const remainingFill = Math.max(0, 80.0 - bin.currentFillPercentage);
      const timeToThresh = remainingFill / hourlyRate;

      return {
        bin_id: bin.id,
        bin_code: bin.code,
        bin_name: bin.name,
        ward_id: bin.wardId,
        ward_name: bin.ward.name,
        latitude: bin.latitude,
        longitude: bin.longitude,
        current_fill: bin.currentFillPercentage,
        predicted_fill: Math.min(100, bin.currentFillPercentage + 18.0),
        time_to_threshold_hours: timeToThresh,
        complaint_count: bin.complaints.length,
        hours_since_last_collection: Math.round(hoursSinceCollection * 10) / 10,
        data_freshness_hours: Math.round(freshnessHours * 10) / 10,
        provenance: bin.provenance,
      };
    });

    const cppInput = {
      weights: options.weights || {
        threshold_proximity: 0.35,
        predicted_urgency: 0.25,
        complaint_severity: 0.20,
        overdue_time: 0.15,
        staleness_penalty: 0.05,
      },
      top_k: options.limit || 0,
      tasks: tasksPayload,
    };

    // 3. Execute compiled C++ DSA Engine
    const cppRes = await executeCppEngine('prioritize', cppInput);

    if (!cppRes.success || !cppRes.data) {
      throw new Error(`C++ Engine execution failed: ${cppRes.error}`);
    }

    const rankedFromCpp: any[] = cppRes.data.ranked_tasks || [];

    // Map back to TypeScript shared interface
    const tasks: PriorityTask[] = rankedFromCpp.map((r: any) => ({
      binId: r.bin_id,
      binCode: r.bin_code,
      binName: r.bin_name,
      wardId: r.ward_id,
      wardName: r.ward_name,
      latitude: r.latitude,
      longitude: r.longitude,
      priorityScore: r.priority_score,
      urgency: r.urgency,
      currentFill: r.current_fill,
      predictedFill: r.predicted_fill,
      timeToThresholdHours: r.time_to_threshold_hours,
      complaintCount: r.complaint_count,
      hoursSinceLastCollection: r.hours_since_last_collection,
      dataFreshnessHours: r.data_freshness_hours,
      formulaBreakdown: {
        thresholdProximityComponent: r.formula_breakdown?.threshold_proximity || 0,
        predictedUrgencyComponent: r.formula_breakdown?.predicted_urgency || 0,
        complaintSeverityComponent: r.formula_breakdown?.complaint_severity || 0,
        overdueTimeComponent: r.formula_breakdown?.overdue_time || 0,
        freshnessDiscount: r.formula_breakdown?.freshness_discount || 0,
      },
      suggestedAction: r.suggested_action,
      provenance: r.provenance,
    }));

    return {
      tasks,
      executionTimeMs: cppRes.executionTimeMs,
      algorithm: cppRes.data.algorithm || 'Max-Heap Priority Queue (C++ STL)',
      timeComplexity: cppRes.data.time_complexity || 'O(N log N)',
      cppResult: cppRes,
    };
  }

  /**
   * Run C++ Dijkstra & Greedy Multi-Stop Routing Heuristic
   */
  async optimizeRoute(req: RouteOptimizationRequest): Promise<RouteOptimizationResponse> {
    // 1. Fetch candidate bins
    const bins = await prisma.bin.findMany({
      where: { id: { in: req.binIds } },
    });

    if (bins.length === 0) {
      throw new Error('No candidate bins found for route optimization.');
    }

    // 2. Fetch road graph nodes & edges from database
    const roadNodes = await prisma.roadNode.findMany();
    const roadEdges = await prisma.roadEdge.findMany();

    const graphPayload = {
      nodes: roadNodes.map(n => ({
        id: n.id,
        name: n.name,
        latitude: n.latitude,
        longitude: n.longitude,
      })),
      edges: roadEdges.map(e => ({
        id: e.id,
        source: e.sourceNodeId,
        target: e.targetNodeId,
        distance_meters: e.distanceMeters,
        travel_time_seconds: e.travelTimeSeconds,
        road_name: e.roadName,
        one_way: e.oneWay,
      })),
    };

    const candidatesPayload = bins.map(b => ({
      id: b.id,
      name: b.name,
      latitude: b.latitude,
      longitude: b.longitude,
      demand_kg: (b.capacityLiters * (b.currentFillPercentage / 100.0)) * 0.35, // waste density ~0.35 kg/L
    }));

    // 3. Prepare C++ input payload
    const cppInput = {
      graph: graphPayload,
      depot: {
        id: req.startingDepot.id,
        name: req.startingDepot.name,
        latitude: req.startingDepot.latitude,
        longitude: req.startingDepot.longitude,
      },
      candidates: candidatesPayload,
      max_stops: req.maxStops || 0,
      capacity_limit_kg: req.capacityLimitKg || 0,
      objective: req.objective || 'distance',
    };

    // 4. Execute C++ Engine
    const cppRes = await executeCppEngine('optimize-route', cppInput);
    if (!cppRes.success || !cppRes.data) {
      throw new Error(`C++ Route Optimizer failed: ${cppRes.error}`);
    }

    const data = cppRes.data;

    // Fetch vehicle info
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: req.vehicleId },
    });

    // 5. Store planned route in database
    const createdRoute = await prisma.route.create({
      data: {
        vehicleId: req.vehicleId,
        depotName: req.startingDepot.name,
        depotLatitude: req.startingDepot.latitude,
        depotLongitude: req.startingDepot.longitude,
        totalDistanceKm: data.total_distance_km || 0,
        totalDurationMinutes: data.total_duration_minutes || 0,
        algorithmUsed: data.algorithm || 'Greedy Multi-Stop Dijkstra Heuristic',
        timeComplexity: data.time_complexity || 'O(K * (V + E) log V)',
        pathGeoJson: JSON.stringify(data.full_path_coordinates || []),
        status: 'planned',
      },
    });

    // Store route stops
    const orderedStops = (data.ordered_stops || []).map((st: any) => ({
      stopOrder: st.stop_order,
      type: st.type as 'depot' | 'bin',
      id: st.id,
      name: st.name,
      latitude: st.latitude,
      longitude: st.longitude,
      demandKg: st.demand_kg,
      cumulativeDistanceMeters: st.cumulative_distance_meters,
      cumulativeTimeMinutes: st.cumulative_time_minutes,
    }));

    for (const stop of orderedStops) {
      await prisma.routeStop.create({
        data: {
          routeId: createdRoute.id,
          stopOrder: stop.stopOrder,
          type: stop.type,
          binId: stop.type === 'bin' ? stop.id : null,
          name: stop.name,
          latitude: stop.latitude,
          longitude: stop.longitude,
          demandKg: stop.demandKg || 0,
          cumulativeDistanceMeters: stop.cumulativeDistanceMeters,
          cumulativeTimeMinutes: stop.cumulativeTimeMinutes,
          status: 'pending',
        },
      });
    }

    return {
      routeId: createdRoute.id,
      vehicleId: req.vehicleId,
      vehicleReg: vehicle?.registrationNo || 'MH-15-MUNICIPAL',
      orderedStops,
      pathCoordinates: data.full_path_coordinates || [],
      totalDistanceKm: data.total_distance_km || 0,
      totalDurationMinutes: data.total_duration_minutes || 0,
      algorithmUsed: data.algorithm,
      timeComplexity: data.time_complexity,
      unreachableBinIds: data.unreachable_stops || [],
      constraintsSatisfied: !data.capacity_constraint_exceeded,
      computedAt: new Date().toISOString(),
    };
  }
}

export const dsaService = new DsaService();
