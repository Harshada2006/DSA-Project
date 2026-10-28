import { prisma } from '../database/client.js';
import { predictionService } from './predictionService.js';

export class BinService {
  /* ============================================================
   * MODULE 1: Bin Inventory & Filtering Retrieval
   * Queries bins by ward, status, waste stream, and search term
   * ============================================================ */
  async getBins(filters = {}) {
    const where = {};
    if (filters.wardId) where.wardId = filters.wardId;
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

    return await prisma.bin.findMany({
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

    const observations = await prisma.binObservation.findMany({
      where: whereObs,
      orderBy: { observedAt: 'asc' },
      take: options.limit ? parseInt(options.limit, 10) : 180,
    });

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
    if (options.date) {
      const targetDate = String(options.date).trim();
      selectedObservation = timeline.find((t) => t.date === targetDate);
    }
    if (!selectedObservation && timeline.length > 0) {
      selectedObservation = timeline[timeline.length - 1]; // default to latest
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
      latestObservation,
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
