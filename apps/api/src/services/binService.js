import { prisma } from '../database/client.js';
import { predictionService } from './predictionService.js';

function calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

export class BinService {
  /* ============================================================
   * MODULE 1: Bin Inventory & Filtering Retrieval
   * Queries bins by ward, status, waste stream, search term, and geographic bounds
   * ============================================================ */
  async getBins(filters = {}) {
    const where = {};
    if (filters.wardId) where.wardId = filters.wardId;
    if (filters.zone) where.ward = { zone: filters.zone };
    if (filters.status) where.status = filters.status;
    if (filters.wasteType) where.wasteType = filters.wasteType;
    if (filters.areaCategory) where.areaCategory = filters.areaCategory;
    if (filters.urgency) where.urgency = filters.urgency;
    if (filters.provenance) where.provenance = filters.provenance;
    if (filters.search) {
      where.OR = [
        { code: { contains: filters.search } },
        { name: { contains: filters.search } },
      ];
    }

    // Geographic Proximity Validation
    const hasGeoFilter = filters.latitude !== undefined || filters.longitude !== undefined;
    let targetLat = null;
    let targetLng = null;
    let radiusKm = 5.0;

    if (hasGeoFilter) {
      if (filters.latitude === undefined || filters.longitude === undefined || filters.latitude === '' || filters.longitude === '') {
        throw new Error('Both latitude and longitude are required when performing a geographic location search.');
      }
      targetLat = parseFloat(filters.latitude);
      targetLng = parseFloat(filters.longitude);
      if (isNaN(targetLat) || isNaN(targetLng) || targetLat < -90 || targetLat > 90 || targetLng < -180 || targetLng > 180) {
        throw new Error('Invalid geographic coordinates: latitude must be between -90 and 90, longitude between -180 and 180.');
      }
      radiusKm = parseFloat(filters.radiusKm || filters.maxDistanceKm) || 5.0;
    }

    if (filters.date) {
      const targetDate = String(filters.date).trim();
      const endOfTargetDate = new Date(`${targetDate}T23:59:59.999Z`);
      const bins = await prisma.bin.findMany({
        where,
        include: {
          ward: true,
          observations: {
            where: { observedAt: { lte: endOfTargetDate } },
            orderBy: { observedAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { priorityScore: 'desc' },
      });

      const mapped = bins.map((bin) => {
        const obs = bin.observations && bin.observations.length > 0 ? bin.observations[0] : null;
        const obsDate = obs ? obs.observedAt.toISOString().split('T')[0] : null;
        const hasData = !!obs && obsDate === targetDate;
        const distanceKm = hasGeoFilter ? calculateHaversineDistanceKm(targetLat, targetLng, bin.latitude, bin.longitude) : null;
        return {
          ...bin,
          isHistorical: true,
          historicalDate: targetDate,
          hasHistoricalData: hasData,
          currentFillPercentage: bin.currentFillPercentage,
          displayedFillPercentage: hasData ? obs.fillPercentage : (obs ? obs.fillPercentage : null),
          historicalObservation: obs,
          distanceKm,
        };
      });

      if (hasGeoFilter) {
        return mapped.filter((b) => b.distanceKm <= radiusKm);
      }
      return mapped;
    }

    const bins = await prisma.bin.findMany({
      where,
      include: {
        ward: true,
        observations: {
          orderBy: { observedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { priorityScore: 'desc' },
    });

    const mapped = bins.map((bin) => {
      const distanceKm = hasGeoFilter ? calculateHaversineDistanceKm(targetLat, targetLng, bin.latitude, bin.longitude) : null;
      return {
        ...bin,
        isHistorical: false,
        displayedFillPercentage: bin.currentFillPercentage,
        distanceKm,
      };
    });

    if (hasGeoFilter) {
      return mapped.filter((b) => b.distanceKm <= radiusKm);
    }
    return mapped;
  }

  /* ============================================================
   * MODULE 2: Bin Diagnostics & ML Fullness Prediction
   * Fetches bin detail, historical observations, and ML forecast
   * ============================================================ */
  async getBinById(id) {
    const bin = await prisma.bin.findUnique({
      where: { id },
      include: {
        ward: true,
        observations: {
          orderBy: { observedAt: 'desc' },
          take: 10,
        },
        collections: {
          orderBy: { collectedAt: 'desc' },
          take: 5,
        },
        complaints: {
          orderBy: { reportedAt: 'desc' },
          take: 5,
        },
        tasks: {
          orderBy: { scheduledDate: 'desc' },
          take: 5,
        },
      },
    });

    if (!bin) throw new Error('Bin record not found.');

    const prediction = await predictionService.predictBinFullness(id);
    return { ...bin, prediction };
  }

  /* ============================================================
   * MODULE 2B: 180-Day Historical Timeseries & Date Inspection
   * Fetches chronological observations, collections, and overflow risk
   * ============================================================ */
  async getBinHistory(id, options = {}) {
    const bin = await prisma.bin.findUnique({
      where: { id },
      include: { ward: true },
    });
    if (!bin) throw new Error('Bin not found.');

    const whereObs = { binId: id };
    if (options.startDate || options.endDate) {
      whereObs.observedAt = {};
      if (options.startDate) whereObs.observedAt.gte = new Date(options.startDate + 'T00:00:00Z');
      if (options.endDate) whereObs.observedAt.lte = new Date(options.endDate + 'T23:59:59Z');
    }

    const recentObservations = await prisma.binObservation.findMany({
      where: whereObs,
      orderBy: { observedAt: 'desc' },
      take: options.limit ? parseInt(options.limit, 10) : 365,
    });
    const observations = [...recentObservations].reverse();

    const whereCol = { binId: id };
    if (options.startDate || options.endDate) {
      whereCol.collectedAt = {};
      if (options.startDate) whereCol.collectedAt.gte = new Date(options.startDate + 'T00:00:00Z');
      if (options.endDate) whereCol.collectedAt.lte = new Date(options.endDate + 'T23:59:59Z');
    }

    const collections = await prisma.collectionEvent.findMany({
      where: whereCol,
      orderBy: { collectedAt: 'asc' },
    });

    // Map collections by date string YYYY-MM-DD
    const collectionsByDate = new Map();
    collections.forEach((c) => {
      const d = c.collectedAt.toISOString().split('T')[0];
      collectionsByDate.set(d, c);
    });

    // Build timeline for chart and state consistency
    const timeline = observations.map((obs) => {
      const d = obs.observedAt.toISOString().split('T')[0];
      const col = collectionsByDate.get(d);
      const fill = obs.fillPercentage;
      let risk = 'normal';
      if (fill >= 85) risk = 'critical';
      else if (fill >= 70) risk = 'high';
      else if (fill >= 50) risk = 'monitor';

      return {
        id: obs.id,
        date: d,
        observedAt: obs.observedAt,
        fillPercentage: fill,
        estimatedVolumeLitres: Math.round(((fill / 100.0) * bin.capacityLiters) * 10) / 10,
        overflowRisk: risk,
        collectionPerformed: col ? 1 : 0,
        collectionQuantityLitres: col ? Math.round(((col.fillBefore - col.fillAfter) / 100.0) * bin.capacityLiters * 10) / 10 : 0,
        provenance: obs.provenance,
        notes: obs.notes,
      };
    });

    // Selected date observation
    let selectedObservation = null;
    let hasHistoricalDataForDate = true;
    const requestedDate = options.date ? String(options.date).trim() : null;

    if (requestedDate) {
      selectedObservation = timeline.find((t) => t.date === requestedDate) || null;
      if (!selectedObservation) {
        // Direct query fallback for dates outside the timeline slice
        const exactObs = await prisma.binObservation.findFirst({
          where: {
            binId: id,
            observedAt: {
              gte: new Date(requestedDate + 'T00:00:00.000Z'),
              lte: new Date(requestedDate + 'T23:59:59.999Z'),
            },
          },
          orderBy: { observedAt: 'desc' },
        });
        if (exactObs) {
          const d = exactObs.observedAt.toISOString().split('T')[0];
          selectedObservation = {
            id: exactObs.id,
            date: d,
            observedAt: exactObs.observedAt,
            fillPercentage: exactObs.fillPercentage,
            estimatedVolumeLitres: Math.round(((exactObs.fillPercentage / 100.0) * bin.capacityLiters) * 10) / 10,
            overflowRisk: exactObs.fillPercentage >= 85 ? 'critical' : exactObs.fillPercentage >= 70 ? 'high' : exactObs.fillPercentage >= 50 ? 'monitor' : 'normal',
            collectionPerformed: 0,
            collectionQuantityLitres: 0,
            provenance: exactObs.provenance,
            notes: exactObs.notes,
          };
          hasHistoricalDataForDate = true;
        } else {
          hasHistoricalDataForDate = false;
        }
      }
    } else {
      selectedObservation = timeline.length > 0 ? timeline[timeline.length - 1] : null;
    }

    const latestObservation = timeline.length > 0 ? timeline[timeline.length - 1] : null;

    let prediction = null;
    try {
      prediction = await predictionService.predictBinFullness(id);
    } catch (err) {
      console.warn('Prediction notice:', err.message);
    }

    return {
      bin,
      selectedObservation,
      hasHistoricalDataForDate,
      requestedDate,
      selectedDate: requestedDate,
      latestObservation,
      currentFillPercentage: bin.currentFillPercentage,
      timeline,
      totalObservations: timeline.length,
      totalCollections: collections.length,
      prediction,
      provenanceLabel: 'SYNTHETIC_SIMULATION',
      provenanceDisclaimer:
        'Observations marked SYNTHETIC_SIMULATION represent simulated prototypes for algorithmic and routing evaluation, not physical IoT sensor readings from Nashik Municipal Corporation.',
    };
  }

  /* ============================================================
   * MODULE 3: Municipal Bin Asset Provisioning
   * Registers new smart bins into Nashik geospatial registry
   * ============================================================ */
  async createBin(data) {
    const {
      code,
      name,
      wardId,
      latitude,
      longitude,
      capacityLiters,
      wasteType,
      areaCategory,
      notes,
      provenance,
    } = data;

    if (!code || !name || !wardId) {
      throw new Error('Bin code, name, and municipal ward ID are required.');
    }

    const existing = await prisma.bin.findUnique({ where: { code } });
    if (existing) {
      throw new Error(`Bin with code "${code}" already exists.`);
    }

    return await prisma.bin.create({
      data: {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        wardId,
        latitude: parseFloat(latitude) || 20.005,
        longitude: parseFloat(longitude) || 73.785,
        capacityLiters: parseFloat(capacityLiters) || 1200.0,
        wasteType: wasteType || 'general',
        areaCategory: areaCategory || 'residential',
        notes: notes || null,
        provenance: provenance || 'observed',
        status: 'active',
        currentFillPercentage: 0.0,
        urgency: 'normal',
      },
      include: { ward: true },
    });
  }

  /* ============================================================
   * MODULE 4: Bin Configuration & Lifecycle Updates
   * ============================================================ */
  async updateBin(id, data) {
    const bin = await prisma.bin.findUnique({ where: { id } });
    if (!bin) throw new Error('Bin not found.');

    return await prisma.bin.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: { ward: true },
    });
  }

  /* ============================================================
   * MODULE 5: Fill Level Observation & Dynamic Urgency Classification
   * Logs telemetry/sensor reading and recalculates normal/high/critical urgency
   * ============================================================ */
  async recordObservation(binId, observationData, observerUser) {
    const { fillPercentage, notes, provenance } = observationData;
    const fill = Math.max(0.0, Math.min(100.0, parseFloat(fillPercentage)));

    const bin = await prisma.bin.findUnique({ where: { id: binId } });
    if (!bin) throw new Error('Bin not found.');

    const now = new Date();

    // Determine urgency category
    let urgency = 'normal';
    if (fill >= 90.0) urgency = 'critical';
    else if (fill >= 75.0) urgency = 'high';
    else if (fill >= 50.0) urgency = 'monitor';

    const [observation] = await prisma.$transaction([
      prisma.binObservation.create({
        data: {
          binId,
          fillPercentage: fill,
          observerType: observerUser?.role === 'WORKER' ? 'worker_inspection' : 'manual_inspection',
          provenance: provenance || 'observed',
          notes: notes || null,
          observedAt: now,
        },
      }),
      prisma.bin.update({
        where: { id: binId },
        data: {
          currentFillPercentage: fill,
          lastObservedAt: now,
          urgency,
          status: fill >= 95.0 ? 'full' : 'active',
        },
      }),
    ]);

    return observation;
  }
}

export const binService = new BinService();
