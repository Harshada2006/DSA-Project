import { prisma } from '../database/client.js';
import { executeCppEngine } from '../engine/cppSubprocess.js';

/* ============================================================
 * OpenStreetMap / OSRM Driving Road Geometry Integration
 * Strict real-road geometry from OpenStreetMap - NO artificial curves or fabricated coordinates.
 * If OSRM is unreachable or timed out, gracefully falls back to transparent approximate graph lines.
 * ============================================================ */
async function fetchOsrmRoadGeometry(waypointCoords, waypointIndices = null) {
  if (process.env.OSRM_ENABLED === 'false') {
    return null;
  }

  const osrmBase = process.env.OSRM_ROUTING_URL || 'https://router.project-osrm.org/route/v1/driving';
  const timeoutMs = parseInt(process.env.OSRM_TIMEOUT_MS, 10) || 5000;

  if (!Array.isArray(waypointCoords) || waypointCoords.length < 2) {
    return null;
  }

  const waypointSet = Array.isArray(waypointIndices) ? new Set(waypointIndices) : null;
  const mappedIndices = [];

  // Validate coordinates and filter out invalid/corrupted pairs
  const validWaypoints = [];
  for (let idx = 0; idx < waypointCoords.length; idx++) {
    const pt = waypointCoords[idx];
    const lng = typeof pt.lng === 'number' ? pt.lng : (Array.isArray(pt) ? pt[0] : null);
    const lat = typeof pt.lat === 'number' ? pt.lat : (Array.isArray(pt) ? pt[1] : null);
    if (
      typeof lng === 'number' &&
      typeof lat === 'number' &&
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    ) {
      // Deduplicate consecutive near-identical coordinates (distance < 5m)
      if (validWaypoints.length > 0) {
        const prev = validWaypoints[validWaypoints.length - 1];
        if (Math.hypot(prev.lat - lat, prev.lng - lng) < 0.00005) {
          if (waypointSet && waypointSet.has(idx)) {
            mappedIndices.push(validWaypoints.length - 1);
          }
          continue;
        }
      }
      validWaypoints.push({ lat, lng });
      if (waypointSet && waypointSet.has(idx)) {
        mappedIndices.push(validWaypoints.length - 1);
      }
    }
  }

  if (validWaypoints.length < 2) {
    return null;
  }

  const query = validWaypoints.map((w) => `${w.lng},${w.lat}`).join(';');
  let url = `${osrmBase.replace(/\/+$/, '')}/${query}?overview=full&geometries=geojson&steps=true`;
  if (mappedIndices.length >= 2) {
    const uniqueSorted = [...new Set(mappedIndices)].sort((a, b) => a - b);
    if (uniqueSorted.length >= 2) {
      url += `&waypoints=${uniqueSorted.join(';')}`;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[Routing Engine] OSRM request returned HTTP ${res.status}. Falling back to graph-node approximation.`);
      return null;
    }

    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes || !data.routes[0]) {
      console.warn(`[Routing Engine] OSRM returned code '${data.code}'. Falling back to graph-node approximation.`);
      return null;
    }

    const route = data.routes[0];
    const leafletCoords = (route.geometry?.coordinates || []).map(([lng, lat]) => [lat, lng]);

    if (leafletCoords.length === 0) {
      return null;
    }

    const legs = (route.legs || []).map((leg, idx) => ({
      legIndex: idx + 1,
      distance_meters: Math.round(leg.distance || 0),
      travel_time_seconds: Math.round(leg.duration || 0),
      distance_km: parseFloat(((leg.distance || 0) / 1000).toFixed(2)),
      duration_minutes: Math.max(1, Math.round((leg.duration || 0) / 60)),
      summary: leg.summary || (leg.steps && leg.steps.find((s) => s.name)?.name) || 'City Street Corridor',
      stepsCount: leg.steps ? leg.steps.length : 0,
    }));

    return {
      coordinates: leafletCoords,
      distanceMeters: Math.round(route.distance || 0),
      durationSeconds: Math.round(route.duration || 0),
      totalDistanceKm: parseFloat(((route.distance || 0) / 1000).toFixed(2)),
      totalDurationMinutes: Math.max(1, Math.round((route.duration || 0) / 60)),
      legs,
      provider: 'OSRM (OpenStreetMap Road Network)',
      source: 'osrm',
      isApproximate: false,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      console.warn(`[Routing Engine] OSRM request timed out after ${timeoutMs}ms. Falling back to graph-node approximation.`);
    } else {
      console.warn(`[Routing Engine] OSRM network error: ${err.message}. Falling back to graph-node approximation.`);
    }
    return null;
  }
}

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
   * MODULE 3: Road Network Nodes & Dijkstra Shortest Path
   * ============================================================ */
  async getRoadNodes() {
    return await prisma.roadNode.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async getShortestPath(sourceId, targetId, useTime = false, avoidBlocked = true, intermediateStops = []) {
    const nodes = await prisma.roadNode.findMany();
    const edgeFilter = avoidBlocked ? { isBlocked: false } : {};
    const edges = await prisma.roadEdge.findMany({ where: edgeFilter });

    if (!nodes || nodes.length === 0) {
      throw new Error('Road network graph data is currently unavailable in the database.');
    }

    // Helper to snap to closest road network node
    const findClosestNode = (lat, lng) => {
      let minDist = Infinity;
      let closest = null;
      for (const n of nodes) {
        const d = Math.hypot(n.latitude - lat, n.longitude - lng);
        if (d < minDist) {
          minDist = d;
          closest = n;
        }
      }
      return closest;
    };

    // Helper to resolve an arbitrary location identifier (node ID, bin ID/code, facility, or depot)
    const resolveLocation = async (locIdentifier) => {
      if (!locIdentifier) return null;
      if (typeof locIdentifier === 'object' && locIdentifier !== null) {
        if (locIdentifier.id && nodes.some((n) => n.id === locIdentifier.id)) {
          const directNode = nodes.find((n) => n.id === locIdentifier.id);
          return { node: directNode, entity: locIdentifier };
        }
        const lat = locIdentifier.latitude ?? locIdentifier.lat;
        const lng = locIdentifier.longitude ?? locIdentifier.lng;
        if (typeof lat === 'number' && typeof lng === 'number') {
          const closest = findClosestNode(lat, lng);
          return { node: closest, entity: locIdentifier };
        }
        locIdentifier = locIdentifier.id || locIdentifier.code || locIdentifier.name || '';
      }

      const clean = String(locIdentifier).trim();

      // 1. Exact node match
      const nodeMatch = nodes.find(
        (n) => n.id.toLowerCase() === clean.toLowerCase() || n.name.toLowerCase() === clean.toLowerCase()
      );
      if (nodeMatch) return { node: nodeMatch, entity: nodeMatch };

      // 2. Bin match
      const bin = await prisma.bin.findFirst({
        where: { OR: [{ id: clean }, { code: clean }] },
        include: { ward: true },
      });
      if (bin) {
        const closest = findClosestNode(bin.latitude, bin.longitude);
        return { node: closest, entity: bin };
      }

      // 3. Facility match
      const facility = await prisma.facility.findFirst({
        where: { OR: [{ id: clean }, { name: { contains: clean } }] },
      });
      if (facility) {
        const closest = findClosestNode(facility.latitude, facility.longitude);
        return { node: closest, entity: facility };
      }

      // 4. Depots & dumping landmarks
      const lclean = clean.toLowerCase();
      if (lclean.includes('panchavati') && (lclean.includes('depot') || lclean.includes('workshop'))) {
        const p = nodes.find((n) => n.id === 'N-DEP') || nodes.find((n) => n.id === 'N-PAN') || nodes[0];
        return { node: p, entity: { name: 'Panchavati Solid Waste Sub-Depot' } };
      }
      if (lclean.includes('cidco') && lclean.includes('depot')) {
        const c = nodes.find((n) => n.id === 'N-TRI') || nodes.find((n) => n.id === 'N-PAW') || nodes[0];
        return { node: c, entity: { name: 'CIDCO Division Sanitation Depot' } };
      }
      if (lclean.includes('satpur') && lclean.includes('depot')) {
        const s = nodes.find((n) => n.id === 'N-SAT') || nodes[0];
        return { node: s, entity: { name: 'Satpur MIDC Sanitation Hub' } };
      }
      if (lclean.includes('nashik-road') || lclean.includes('railway')) {
        const nr = nodes.find((n) => n.id === 'N-NRS') || nodes.find((n) => n.id === 'N-BYT') || nodes[0];
        return { node: nr, entity: { name: 'Nashik Road Railway Ward Depot' } };
      }
      if (lclean.includes('nwmpl') || lclean.includes('dumping') || lclean.includes('pathardi')) {
        const pat = nodes.find((n) => n.id === 'N-PAT') || nodes.find((n) => n.id === 'N-AMB') || nodes[0];
        return { node: pat, entity: { name: 'NWMPL Pathardi Shivar Facility' } };
      }

      return null;
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

    // Ordered sequence of waypoints: [Source, ...intermediateStops, Destination]
    const rawWaypoints = Array.isArray(intermediateStops)
      ? intermediateStops.filter((s) => s !== null && s !== undefined && s !== '')
      : [];

    // Validation: Reject duplicate intermediate stop IDs
    const seenWaypoints = new Set();
    for (const wp of rawWaypoints) {
      const wpKey = String(wp).trim().toLowerCase();
      if (seenWaypoints.has(wpKey)) {
        return {
          reachable: false,
          error: `Duplicate intermediate stop detected (${wp}). Each intermediate waypoint must be unique.`,
          source_id: sourceId,
          target_id: targetId,
          stops: [],
        };
      }
      seenWaypoints.add(wpKey);
    }

    // Validation: Reject intermediate stops identical to source or destination
    const srcKey = String(sourceId).trim().toLowerCase();
    const tgtKey = String(targetId).trim().toLowerCase();
    for (const wp of rawWaypoints) {
      const wpKey = String(wp).trim().toLowerCase();
      if (wpKey === srcKey) {
        return {
          reachable: false,
          error: `Intermediate stop cannot be identical to the route source location (${sourceId}).`,
          source_id: sourceId,
          target_id: targetId,
          stops: [],
        };
      }
      if (wpKey === tgtKey) {
        return {
          reachable: false,
          error: `Intermediate stop cannot be identical to the route destination location (${targetId}).`,
          source_id: sourceId,
          target_id: targetId,
          stops: [],
        };
      }
    }

    const fullSequence = [sourceId, ...rawWaypoints, targetId];

    const resolvedStops = [];
    for (let i = 0; i < fullSequence.length; i++) {
      const raw = fullSequence[i];
      const res = await resolveLocation(raw);
      if (!res || !res.node) {
        const label = i === 0 ? 'Source' : i === fullSequence.length - 1 ? 'Destination' : `Intermediate Stop #${i}`;
        return {
          reachable: false,
          error: `Invalid ${label} location (${typeof raw === 'object' ? JSON.stringify(raw) : raw}). Node not found in Nashik road network.`,
          source_id: sourceId,
          target_id: targetId,
          stops: [],
        };
      }
      resolvedStops.push({
        raw,
        order: i + 1,
        type: i === 0 ? 'source' : i === fullSequence.length - 1 ? 'destination' : 'waypoint',
        node: res.node,
        entity: res.entity,
      });
    }

    // Special Case: Source equals Destination with NO intermediate stops
    if (resolvedStops.length === 2 && resolvedStops[0].node.id === resolvedStops[1].node.id) {
      const singleNode = resolvedStops[0].node;
      const sLoc = {
        id: resolvedStops[0].entity?.id || singleNode.id,
        name: resolvedStops[0].entity?.name || singleNode.name,
        code: resolvedStops[0].entity?.code || singleNode.id,
        latitude: resolvedStops[0].entity?.latitude ?? singleNode.latitude,
        longitude: resolvedStops[0].entity?.longitude ?? singleNode.longitude,
      };
      return {
        reachable: true,
        source_id: sourceId,
        target_id: targetId,
        resolvedSourceId: singleNode.id,
        resolvedTargetId: singleNode.id,
        sourceNode: singleNode,
        targetNode: singleNode,
        sourceLocation: sLoc,
        targetLocation: sLoc,
        distance_meters: 0,
        travel_time_seconds: 0,
        total_distance_km: 0,
        total_duration_minutes: 0,
        node_path: [singleNode.id],
        coordinate_path: [[sLoc.latitude, sLoc.longitude]],
        intermediateNodes: [singleNode],
        stops: [
          { order: 1, type: 'source', id: sLoc.id, name: sLoc.name, code: sLoc.code, latitude: sLoc.latitude, longitude: sLoc.longitude },
          { order: 2, type: 'destination', id: sLoc.id, name: sLoc.name, code: sLoc.code, latitude: sLoc.latitude, longitude: sLoc.longitude },
        ],
        legs: [],
        geometry_source: 'single_point',
        routing_provider: 'EcoNexus Co-located Source/Destination',
        is_approximate: false,
        algorithm: "Dijkstra's Shortest Path Algorithm (C++17 STL min-heap)",
        roadRestrictionsAvoided: avoidBlocked,
      };
    }

    // Traverse each consecutive leg via C++ Dijkstra
    let totalDistanceMeters = 0;
    let totalTimeSeconds = 0;
    const combinedNodePath = [];
    const combinedCoordinatePath = [];
    const legs = [];

    for (let i = 0; i < resolvedStops.length - 1; i++) {
      const startPt = resolvedStops[i];
      const endPt = resolvedStops[i + 1];

      // If adjacent points resolve to identical node
      if (startPt.node.id === endPt.node.id) {
        if (combinedNodePath.length === 0) {
          combinedNodePath.push(startPt.node.id);
          combinedCoordinatePath.push([startPt.node.latitude, startPt.node.longitude]);
        }
        legs.push({
          legIndex: i + 1,
          from: startPt.node.id,
          to: endPt.node.id,
          fromName: startPt.node.name,
          toName: endPt.node.name,
          distance_meters: 0,
          travel_time_seconds: 0,
          node_path: [startPt.node.id],
        });
        continue;
      }

      const cppInput = {
        source_id: startPt.node.id,
        target_id: endPt.node.id,
        use_time: useTime,
        graph: graphPayload,
      };

      const cppRes = await executeCppEngine('shortest-path', cppInput);

      if (!cppRes.success || !cppRes.data || !cppRes.data.reachable) {
        const fromLabel = startPt.type === 'source' ? `Source (${startPt.node.name})` : `Stop #${i} (${startPt.node.name})`;
        const toLabel = endPt.type === 'destination' ? `Destination (${endPt.node.name})` : `Stop #${i + 1} (${endPt.node.name})`;
        return {
          reachable: false,
          source_id: sourceId,
          target_id: targetId,
          failedLegIndex: i + 1,
          error: `No road route found between ${fromLabel} and ${toLabel}. Please select another waypoint or check road network connectivity.`,
          stops: resolvedStops.map((s) => ({
            order: s.order,
            type: s.type,
            id: s.node.id,
            name: s.entity?.name || s.node.name,
            latitude: s.entity?.latitude ?? s.node.latitude,
            longitude: s.entity?.longitude ?? s.node.longitude,
          })),
        };
      }

      const legData = cppRes.data;
      totalDistanceMeters += legData.distance_meters;
      totalTimeSeconds += legData.travel_time_seconds;

      legs.push({
        legIndex: i + 1,
        from: startPt.node.id,
        to: endPt.node.id,
        fromName: startPt.node.name,
        toName: endPt.node.name,
        distance_meters: legData.distance_meters,
        travel_time_seconds: legData.travel_time_seconds,
        node_path: legData.node_path,
      });

      const legNodes = legData.node_path || [];
      const nodeStart = combinedNodePath.length === 0 ? 0 : 1;
      for (let n = nodeStart; n < legNodes.length; n++) {
        combinedNodePath.push(legNodes[n]);
      }

      const legCoords = legData.coordinate_path || [];
      const coordStart = combinedCoordinatePath.length === 0 ? 0 : 1;
      for (let c = coordStart; c < legCoords.length; c++) {
        combinedCoordinatePath.push(legCoords[c]);
      }
    }

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const intermediateNodes = combinedNodePath.map((nid) => nodeMap.get(nid)).filter(Boolean);

    const firstStop = resolvedStops[0];
    const lastStop = resolvedStops[resolvedStops.length - 1];

    const sourceLocation = {
      id: firstStop.entity?.id || firstStop.node.id,
      name: firstStop.entity?.name || firstStop.node.name,
      code: firstStop.entity?.code || firstStop.node.id,
      latitude: firstStop.entity?.latitude ?? firstStop.node.latitude,
      longitude: firstStop.entity?.longitude ?? firstStop.node.longitude,
    };

    const targetLocation = {
      id: lastStop.entity?.id || lastStop.node.id,
      name: lastStop.entity?.name || lastStop.node.name,
      code: lastStop.entity?.code || lastStop.node.id,
      latitude: lastStop.entity?.latitude ?? lastStop.node.latitude,
      longitude: lastStop.entity?.longitude ?? lastStop.node.longitude,
    };

    // Construct the vehicle's driving waypoint sequence with explicit stop indices:
    // Physical Source -> intermediate C++ nodes of Leg 0 -> Physical Stop 1 -> ... -> Physical Destination
    const drivingWaypoints = [];
    const stopIndices = [];

    for (let i = 0; i < resolvedStops.length; i++) {
      const stop = resolvedStops[i];
      const sLat = stop.entity?.latitude ?? stop.node.latitude;
      const sLng = stop.entity?.longitude ?? stop.node.longitude;

      stopIndices.push(drivingWaypoints.length);
      drivingWaypoints.push({ lng: sLng, lat: sLat });

      // If not last stop, include intermediate C++ nodes traversed along leg i
      if (i < resolvedStops.length - 1) {
        const leg = legs[i];
        if (leg && Array.isArray(leg.node_path)) {
          for (let n = 1; n < leg.node_path.length - 1; n++) {
            const nid = leg.node_path[n];
            const nObj = nodeMap.get(nid);
            if (nObj) {
              drivingWaypoints.push({ lng: nObj.longitude, lat: nObj.latitude });
            }
          }
        }
      }
    }

    // Request actual drivable road geometry from OSRM (OpenStreetMap)
    const osrmResult = await fetchOsrmRoadGeometry(drivingWaypoints, stopIndices);

    let finalCoordinates = [];
    let finalDistanceKm = parseFloat((totalDistanceMeters / 1000).toFixed(2));
    let finalDurationMinutes = Math.max(1, Math.round(totalTimeSeconds / 60));
    let finalLegs = legs;
    let geometrySource = 'graph_nodes_approximate_fallback';
    let routingProvider = 'C++17 Dijkstra (Approximate Graph Fallback)';
    let isApproximate = true;
    let routingMessage = null;

    if (osrmResult && Array.isArray(osrmResult.coordinates) && osrmResult.coordinates.length > 0) {
      finalCoordinates = [...osrmResult.coordinates];

      // Ensure exact physical terminal pins are seamlessly attached
      if (Math.hypot(finalCoordinates[0][0] - sourceLocation.latitude, finalCoordinates[0][1] - sourceLocation.longitude) > 0.0001) {
        finalCoordinates.unshift([sourceLocation.latitude, sourceLocation.longitude]);
      }
      const lastCoord = finalCoordinates[finalCoordinates.length - 1];
      if (Math.hypot(lastCoord[0] - targetLocation.latitude, lastCoord[1] - targetLocation.longitude) > 0.0001) {
        finalCoordinates.push([targetLocation.latitude, targetLocation.longitude]);
      }

      finalDistanceKm = osrmResult.totalDistanceKm;
      finalDurationMinutes = osrmResult.totalDurationMinutes;
      if (osrmResult.legs && osrmResult.legs.length > 0) {
        if (osrmResult.legs.length === legs.length) {
          finalLegs = osrmResult.legs.map((ol, idx) => ({
            legIndex: idx + 1,
            from: legs[idx].from,
            to: legs[idx].to,
            fromName: legs[idx].fromName,
            toName: legs[idx].toName,
            distance_meters: ol.distance_meters,
            travel_time_seconds: ol.travel_time_seconds,
            distance_km: ol.distance_km,
            duration_minutes: ol.duration_minutes,
            summary: ol.summary,
          }));
        } else {
          const ratio = osrmResult.distanceMeters / Math.max(1, totalDistanceMeters);
          finalLegs = legs.map((lg, idx) => {
            const distM = Math.round(lg.distance_meters * ratio);
            return {
              ...lg,
              legIndex: idx + 1,
              distance_meters: distM,
              distance_km: parseFloat((distM / 1000).toFixed(2)),
              duration_minutes: Math.max(1, Math.round(lg.travel_time_seconds / 60)),
              summary: osrmResult.legs[0]?.summary || 'Road corridor',
            };
          });
        }
      }
      geometrySource = 'osrm';
      routingProvider = 'OSRM (OpenStreetMap Road Network)';
      isApproximate = false;
    } else {
      // Graceful fallback: straight-line segments across graph nodes
      finalCoordinates.push([sourceLocation.latitude, sourceLocation.longitude]);
      for (const nid of combinedNodePath) {
        const n = nodeMap.get(nid);
        if (n) {
          const prev = finalCoordinates[finalCoordinates.length - 1];
          if (Math.hypot(prev[0] - n.latitude, prev[1] - n.longitude) > 0.00005) {
            finalCoordinates.push([n.latitude, n.longitude]);
          }
        }
      }
      const prev = finalCoordinates[finalCoordinates.length - 1];
      if (Math.hypot(prev[0] - targetLocation.latitude, prev[1] - targetLocation.longitude) > 0.00005) {
        finalCoordinates.push([targetLocation.latitude, targetLocation.longitude]);
      }
      routingMessage = 'Notice: OpenStreetMap road geometry provider unavailable or timed out. Displaying approximate straight-line connection between graph nodes.';
    }

    const finalDistanceMeters = finalLegs.reduce((acc, l) => acc + (l.distance_meters || 0), 0) || Math.round(finalDistanceKm * 1000);
    finalDistanceKm = parseFloat((finalDistanceMeters / 1000).toFixed(2));

    const formattedStops = resolvedStops.map((s) => ({
      order: s.order,
      type: s.type,
      id: s.entity?.id || s.node.id,
      name: s.entity?.name || s.node.name,
      code: s.entity?.code || s.node.id,
      latitude: s.entity?.latitude ?? s.node.latitude,
      longitude: s.entity?.longitude ?? s.node.longitude,
      resolvedNodeId: s.node.id,
      areaCategory: s.entity?.areaCategory,
      wasteType: s.entity?.wasteType,
    }));

    return {
      reachable: true,
      source_id: sourceId,
      target_id: targetId,
      resolvedSourceId: resolvedStops[0].node.id,
      resolvedTargetId: resolvedStops[resolvedStops.length - 1].node.id,
      sourceNode: resolvedStops[0].node,
      targetNode: resolvedStops[resolvedStops.length - 1].node,
      sourceLocation,
      targetLocation,
      distance_meters: finalDistanceMeters,
      travel_time_seconds: finalDurationMinutes * 60,
      total_distance_km: finalDistanceKm,
      total_duration_minutes: finalDurationMinutes,
      node_path: combinedNodePath,
      coordinate_path: finalCoordinates,
      geometry_source: geometrySource,
      routing_provider: routingProvider,
      is_approximate: isApproximate,
      routing_message: routingMessage,
      graph_distance_meters: totalDistanceMeters,
      graph_travel_time_seconds: totalTimeSeconds,
      intermediateNodes,
      stops: formattedStops,
      legs: finalLegs,
      roadRestrictionsAvoided: avoidBlocked,
      algorithm: rawWaypoints.length > 0
        ? "Multi-Waypoint Dijkstra Shortest Path Algorithm (C++17 STL min-heap) + OSRM Real Road Geometry"
        : "Dijkstra's Shortest Path Algorithm (C++17 STL min-heap) + OSRM Real Road Geometry",
    };
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

    if (data.route && Array.isArray(data.route.node_path) && data.route.node_path.length >= 2) {
      const nodeMap = new Map(nodes.map((n) => [n.id, n]));
      const optWaypoints = [];
      if (depot && typeof depot.latitude === 'number') {
        optWaypoints.push({ lng: depot.longitude, lat: depot.latitude });
      }
      for (const nid of data.route.node_path) {
        const n = nodeMap.get(nid);
        if (n) {
          optWaypoints.push({ lng: n.longitude, lat: n.latitude });
        }
      }
      if (depot && typeof depot.latitude === 'number') {
        optWaypoints.push({ lng: depot.longitude, lat: depot.latitude });
      }

      const osrmOpt = await fetchOsrmRoadGeometry(optWaypoints);
      if (osrmOpt && osrmOpt.coordinates && osrmOpt.coordinates.length > 0) {
        data.route.coordinate_path = osrmOpt.coordinates;
        data.route.total_distance_km = osrmOpt.totalDistanceKm;
        data.route.total_duration_minutes = osrmOpt.totalDurationMinutes;
        data.route.geometry_source = 'osrm';
        data.route.routing_provider = 'OSRM (OpenStreetMap Road Network)';
        data.route.is_approximate = false;
      } else {
        data.route.geometry_source = 'graph_nodes_approximate_fallback';
        data.route.routing_provider = 'C++17 Dijkstra (Approximate Graph Fallback)';
        data.route.is_approximate = true;
      }
    }

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
