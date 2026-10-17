import { prisma } from '../database/client';
import { Bin, CreateBinSchema } from '@eco-collect/shared';
import { z } from 'zod';

export class BinService {
  async listBins(options: {
    wardId?: string;
    status?: string;
    urgency?: string;
    wasteType?: string;
    search?: string;
    provenance?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 25));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options.wardId) where.wardId = options.wardId;
    if (options.status) where.status = options.status;
    if (options.urgency) where.urgency = options.urgency;
    if (options.wasteType) where.wasteType = options.wasteType;
    if (options.provenance) where.provenance = options.provenance;
    if (options.search) {
      where.OR = [
        { code: { contains: options.search } },
        { name: { contains: options.search } },
      ];
    }

    const [total, bins] = await Promise.all([
      prisma.bin.count({ where }),
      prisma.bin.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priorityScore: 'desc' }, { currentFillPercentage: 'desc' }],
        include: {
          ward: { select: { id: true, name: true, code: true } },
          _count: { select: { observations: true, complaints: true, collections: true } },
        },
      }),
    ]);

    const formattedBins: Bin[] = bins.map(b => ({
      id: b.id,
      code: b.code,
      name: b.name,
      wardId: b.wardId,
      wardName: b.ward.name,
      latitude: b.latitude,
      longitude: b.longitude,
      capacityLiters: b.capacityLiters,
      wasteType: b.wasteType as any,
      areaCategory: b.areaCategory as any,
      status: b.status as any,
      currentFillPercentage: b.currentFillPercentage,
      lastObservedAt: b.lastObservedAt?.toISOString() || null,
      lastCollectedAt: b.lastCollectedAt?.toISOString() || null,
      urgency: b.urgency as any,
      priorityScore: b.priorityScore,
      provenance: b.provenance as any,
      notes: b.notes,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    }));

    return {
      bins: formattedBins,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getBinById(id: string) {
    const bin = await prisma.bin.findUnique({
      where: { id },
      include: {
        ward: true,
        observations: {
          orderBy: { observedAt: 'desc' },
          take: 20,
        },
        complaints: {
          orderBy: { reportedAt: 'desc' },
          take: 10,
        },
        collections: {
          orderBy: { collectedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!bin) return null;

    return {
      ...bin,
      wardName: bin.ward.name,
      createdAt: bin.createdAt.toISOString(),
      updatedAt: bin.updatedAt.toISOString(),
      lastObservedAt: bin.lastObservedAt?.toISOString() || null,
      lastCollectedAt: bin.lastCollectedAt?.toISOString() || null,
    };
  }

  async createBin(data: z.infer<typeof CreateBinSchema>) {
    // Check if code is already used
    const existing = await prisma.bin.findUnique({ where: { code: data.code } });
    if (existing) {
      throw new Error(`Bin code "${data.code}" already exists in the system.`);
    }

    const created = await prisma.bin.create({
      data: {
        code: data.code,
        name: data.name,
        wardId: data.wardId,
        latitude: data.latitude,
        longitude: data.longitude,
        capacityLiters: data.capacityLiters,
        wasteType: data.wasteType,
        areaCategory: data.areaCategory,
        status: data.status || 'active',
        currentFillPercentage: 0.0,
        urgency: 'low',
        priorityScore: 0.0,
        provenance: data.provenance || 'observed',
        notes: data.notes || null,
      },
      include: { ward: true },
    });

    return created;
  }

  async updateBin(id: string, data: Partial<z.infer<typeof CreateBinSchema>>) {
    const updated = await prisma.bin.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.wardId && { wardId: data.wardId }),
        ...(data.latitude && { latitude: data.latitude }),
        ...(data.longitude && { longitude: data.longitude }),
        ...(data.capacityLiters && { capacityLiters: data.capacityLiters }),
        ...(data.wasteType && { wasteType: data.wasteType }),
        ...(data.areaCategory && { areaCategory: data.areaCategory }),
        ...(data.status && { status: data.status }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: { ward: true },
    });

    return updated;
  }

  async archiveBin(id: string) {
    return await prisma.bin.update({
      where: { id },
      data: { status: 'archived' },
    });
  }

  async recordObservation(data: {
    binId: string;
    fillPercentage: number;
    observedAt?: string;
    observerType?: string;
    notes?: string | null;
    provenance?: string;
  }) {
    const obsTime = data.observedAt ? new Date(data.observedAt) : new Date();

    // Determine urgency based on fill level
    let urgency = 'low';
    if (data.fillPercentage >= 85) urgency = 'critical';
    else if (data.fillPercentage >= 70) urgency = 'high';
    else if (data.fillPercentage >= 45) urgency = 'medium';

    // Update bin fill and timestamp
    const [observation, bin] = await prisma.$transaction([
      prisma.binObservation.create({
        data: {
          binId: data.binId,
          fillPercentage: data.fillPercentage,
          observedAt: obsTime,
          observerType: data.observerType || 'manual_inspection',
          notes: data.notes || null,
          provenance: data.provenance || 'observed',
        },
      }),
      prisma.bin.update({
        where: { id: data.binId },
        data: {
          currentFillPercentage: data.fillPercentage,
          lastObservedAt: obsTime,
          urgency,
          status: data.fillPercentage >= 95 ? 'full' : 'active',
        },
      }),
    ]);

    return { observation, bin };
  }

  async recordCollection(data: {
    binId: string;
    vehicleId: string;
    driverName: string;
    fillBefore: number;
    fillAfter?: number;
    status?: string;
    notes?: string | null;
    provenance?: string;
  }) {
    const postFill = data.fillAfter ?? 0.0;
    const now = new Date();

    const [collectionEvent, bin] = await prisma.$transaction([
      prisma.collectionEvent.create({
        data: {
          binId: data.binId,
          vehicleId: data.vehicleId,
          driverName: data.driverName,
          collectedAt: now,
          fillBefore: data.fillBefore,
          fillAfter: postFill,
          status: data.status || 'completed',
          notes: data.notes || null,
          provenance: data.provenance || 'observed',
        },
      }),
      prisma.bin.update({
        where: { id: data.binId },
        data: {
          currentFillPercentage: postFill,
          lastCollectedAt: now,
          urgency: 'low',
          status: 'active',
        },
      }),
    ]);

    return { collectionEvent, bin };
  }

  async listCollections(limit = 50) {
    return await prisma.collectionEvent.findMany({
      take: limit,
      orderBy: { collectedAt: 'desc' },
      include: {
        bin: { select: { id: true, code: true, name: true, wardId: true } },
        vehicle: { select: { id: true, registrationNo: true, driverName: true } },
      },
    });
  }
}

export const binService = new BinService();
