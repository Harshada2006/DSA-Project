import { prisma } from '../database/client.js';
import { predictionService } from './predictionService.js';

export class BinService {
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
