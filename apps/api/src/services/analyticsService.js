import { prisma } from '../database/client.js';

export class AnalyticsService {
  /* ============================================================
   * MODULE 1: Municipal Executive Dashboard KPI Aggregation
   * Aggregates real-time metrics, bins, complaints, and collections
   * ============================================================ */
  async getDashboardSummary(filters = {}) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const binWhere = {};
    if (filters.wardId) binWhere.wardId = filters.wardId;

    const [
      totalBins,
      criticalUrgencyBins,
      highUrgencyBins,
      openComplaints,
      completedTodayCollections,
      activeWorkersCount,
      pendingTasksCount,
      ewasteRequestsCount,
      bins,
      complaints,
      collections,
      wards,
      facilities,
    ] = await Promise.all([
      prisma.bin.count({ where: binWhere }),
      prisma.bin.count({ where: { ...binWhere, urgency: 'critical' } }),
      prisma.bin.count({ where: { ...binWhere, urgency: 'high' } }),
      prisma.complaint.count({
        where: {
          ...(filters.wardId ? { wardId: filters.wardId } : {}),
          status: { in: ['submitted', 'under_review', 'assigned', 'in_progress'] },
        },
      }),
      prisma.collectionEvent.count({
        where: {
          collectedAt: { gte: today },
          ...(filters.wardId ? { bin: { wardId: filters.wardId } } : {}),
        },
      }),
      prisma.workerProfile.count({ where: { status: 'active', isActivated: true } }),
      prisma.collectionTask.count({
        where: {
          ...(filters.wardId ? { bin: { wardId: filters.wardId } } : {}),
          status: { in: ['pending', 'assigned', 'started'] },
        },
      }),
      prisma.eWasteRequest.count({ where: { status: { not: 'delivered_to_recycler' } } }),
      prisma.bin.findMany({
        where: binWhere,
        select: {
          id: true,
          code: true,
          name: true,
          wasteType: true,
          areaCategory: true,
          currentFillPercentage: true,
          urgency: true,
          priorityScore: true,
          provenance: true,
          wardId: true,
        },
      }),
      prisma.complaint.findMany({
        where: filters.wardId ? { wardId: filters.wardId } : {},
        take: 5,
        orderBy: { reportedAt: 'desc' },
        include: { ward: { select: { name: true } } },
      }),
      prisma.collectionEvent.findMany({
        where: filters.wardId ? { bin: { wardId: filters.wardId } } : {},
        take: 5,
        orderBy: { collectedAt: 'desc' },
        include: { bin: { select: { code: true, name: true } } },
      }),
      prisma.ward.findMany({
        where: filters.wardId ? { id: filters.wardId } : {},
        include: {
          _count: {
            select: { bins: true, complaints: true },
          },
        },
      }),
      prisma.facility.findMany(),
    ]);

    // Priority Distribution
    const priorityDistribution = {
      Normal: bins.filter((b) => b.priorityScore < 40).length,
      Monitor: bins.filter((b) => b.priorityScore >= 40 && b.priorityScore < 60).length,
      High: bins.filter((b) => b.priorityScore >= 60 && b.priorityScore < 80).length,
      Critical: bins.filter((b) => b.priorityScore >= 80 || b.urgency === 'critical').length,
    };

    // Waste Category Distribution
    const wasteCategoryBreakdown = {};
    for (const b of bins) {
      wasteCategoryBreakdown[b.wasteType] = (wasteCategoryBreakdown[b.wasteType] || 0) + 1;
    }

    // Provenance Distribution
    const provenanceDistribution = {};
    for (const b of bins) {
      provenanceDistribution[b.provenance] = (provenanceDistribution[b.provenance] || 0) + 1;
    }

    // Ward summaries
    const wardSummaries = wards.map((w) => {
      const wardBins = bins.filter((b) => b.wardId === w.id);
      const avgFill = wardBins.length
        ? Math.round(wardBins.reduce((acc, b) => acc + b.currentFillPercentage, 0) / wardBins.length)
        : 0;
      const criticalCount = wardBins.filter((b) => b.urgency === 'critical' || b.priorityScore >= 80).length;

      return {
        wardId: w.id,
        wardName: w.name,
        zone: w.zone,
        binCount: wardBins.length,
        averageFillPercentage: avgFill,
        criticalBinsCount: criticalCount,
        openComplaintsCount: w._count.complaints,
      };
    });

    // 7-Day Collection Activity Trend from real CollectionEvent records in DB
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const recentCollectionEvents = await prisma.collectionEvent.findMany({
      where: {
        collectedAt: { gte: sevenDaysAgo },
        ...(filters.wardId ? { bin: { wardId: filters.wardId } } : {}),
      },
      include: {
        bin: { select: { capacityLiters: true } },
      },
    });

    const collectionsByDay = new Map();
    for (const ce of recentCollectionEvents) {
      const dStr = ce.collectedAt.toISOString().split('T')[0];
      const existing = collectionsByDay.get(dStr) || { count: 0, volumeTons: 0 };
      existing.count += 1;
      const clearedLitres = Math.max(0, ce.fillBefore - ce.fillAfter) * (ce.bin?.capacityLiters || 1100) / 100.0;
      existing.volumeTons += (clearedLitres * 0.35) / 1000.0;
      collectionsByDay.set(dStr, existing);
    }

    const collectionActivityTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const entry = collectionsByDay.get(dateStr) || { count: 0, volumeTons: 0 };
      collectionActivityTrend.push({
        date: dateStr,
        count: entry.count,
        volumeTons: Math.round(entry.volumeTons * 100) / 100,
      });
    }

    return {
      metrics: {
        totalRegisteredBins: totalBins,
        binsRequiringAttention: criticalUrgencyBins + highUrgencyBins,
        criticalUrgencyBins,
        highUrgencyBins,
        openComplaints,
        completedCollectionsToday: completedTodayCollections,
        activeWorkers: activeWorkersCount,
        pendingTasks: pendingTasksCount,
        openEWasteRequests: ewasteRequestsCount,
        verifiedFacilitiesCount: facilities.filter((f) => f.verificationStatus === 'verified').length,
      },
      priorityDistribution,
      wasteCategoryBreakdown,
      provenanceDistribution,
      wardSummaries,
      collectionActivityTrend,
      recentComplaints: complaints,
      recentCollections: collections,
    };
  }

  /* ============================================================
   * MODULE 2: Area-Wise Historical Timeseries & Analytics
   * Supports filtering by Municipal Ward (Area), individual Bin, and Date Range.
   * A selected bin displays its own history; a selected area aggregates
   * all bins in that area; city-wide aggregates across all Nashik wards.
   * Observations and predictions are presented as separate series.
   * ============================================================ */
  async getAreaWiseHistory(filters = {}) {
    const { wardId, binId, startDate, endDate } = filters;
    const limitDays = Math.min(180, Math.max(7, parseInt(filters.limitDays, 10) || 30));

    // 1. Resolve Target Receptacles based on filter
    let targetBins = [];
    let scope = 'city';
    let scopeName = 'City-Wide (All Nashik Municipal Wards)';
    let selectedBin = null;

    if (binId) {
      selectedBin = await prisma.bin.findUnique({
        where: { id: binId },
        include: { ward: true },
      });
      if (!selectedBin) throw new Error('Selected bin not found.');
      targetBins = [selectedBin];
      scope = 'bin';
      scopeName = `${selectedBin.code} — ${selectedBin.name} (${selectedBin.ward.name})`;
    } else if (wardId) {
      const ward = await prisma.ward.findUnique({ where: { id: wardId } });
      if (!ward) throw new Error('Selected municipal ward not found.');
      targetBins = await prisma.bin.findMany({
        where: { wardId },
        include: { ward: true },
      });
      scope = 'ward';
      scopeName = `${ward.name} Ward (${ward.zone})`;
    } else {
      targetBins = await prisma.bin.findMany({
        include: { ward: true },
      });
    }

    const binIds = targetBins.map((b) => b.id);
    if (binIds.length === 0) {
      return {
        scope,
        scopeName,
        totalContributingBins: 0,
        timeline: [],
        contributingBins: [],
        summary: {
          totalBins: 0,
          averageCurrentFill: 0,
          totalObservations: 0,
          totalCollectionsLogged: 0,
        },
      };
    }

    // 2. Build Date Range Query
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - limitDays);
    dateLimit.setHours(0, 0, 0, 0);

    const whereObs = {
      binId: { in: binIds },
      observedAt: { gte: dateLimit },
    };
    const whereCol = {
      binId: { in: binIds },
      collectedAt: { gte: dateLimit },
    };

    if (startDate) {
      const sDate = new Date(startDate + 'T00:00:00.000Z');
      whereObs.observedAt.gte = sDate;
      whereCol.collectedAt.gte = sDate;
    }
    if (endDate) {
      const eDate = new Date(endDate + 'T23:59:59.999Z');
      whereObs.observedAt.lte = eDate;
      whereCol.collectedAt.lte = eDate;
    }

    // 3. Query Real Observations and Collection Events from Database
    const [observations, collections] = await Promise.all([
      prisma.binObservation.findMany({
        where: whereObs,
        orderBy: { observedAt: 'asc' },
      }),
      prisma.collectionEvent.findMany({
        where: whereCol,
        orderBy: { collectedAt: 'asc' },
        include: { bin: { select: { capacityLiters: true } } },
      }),
    ]);

    // 4. Daily Aggregation Map
    const dayMap = new Map();

    for (const obs of observations) {
      const dStr = obs.observedAt.toISOString().split('T')[0];
      if (!dayMap.has(dStr)) {
        dayMap.set(dStr, {
          date: dStr,
          fills: [],
          provenances: new Set(),
          collectionsCount: 0,
          volumeCollectedKg: 0,
        });
      }
      const entry = dayMap.get(dStr);
      entry.fills.push(obs.fillPercentage);
      entry.provenances.add(obs.provenance || 'observed');
    }

    for (const col of collections) {
      const dStr = col.collectedAt.toISOString().split('T')[0];
      if (!dayMap.has(dStr)) {
        dayMap.set(dStr, {
          date: dStr,
          fills: [],
          provenances: new Set(['observed']),
          collectionsCount: 0,
          volumeCollectedKg: 0,
        });
      }
      const entry = dayMap.get(dStr);
      entry.collectionsCount += 1;
      const clearedLitres = Math.max(0, col.fillBefore - col.fillAfter) * (col.bin?.capacityLiters || 1100) / 100.0;
      entry.volumeCollectedKg += Math.round(clearedLitres * 0.35);
    }

    // 5. Build Chronological Timeseries Points
    const sortedDates = Array.from(dayMap.keys()).sort();

    const timeline = sortedDates.map((dateStr, idx) => {
      const d = dayMap.get(dateStr);
      const avgFill = d.fills.length > 0
        ? Math.round((d.fills.reduce((a, b) => a + b, 0) / d.fills.length) * 10) / 10
        : null;

      // Model predicted fill: projected from recent trajectory
      const prevFill = idx > 0 ? (dayMap.get(sortedDates[idx - 1])?.fills[0] ?? avgFill) : avgFill;
      const predictedFill = avgFill !== null
        ? Math.min(100, Math.max(0, Math.round((avgFill + (avgFill - (prevFill || avgFill)) * 0.3 + 2.5) * 10) / 10))
        : null;

      const isSynthetic = Array.from(d.provenances).some((p) => p === 'synthetic' || p === 'synthetic_simulation');

      return {
        date: dateStr,
        observedFill: avgFill,
        predictedFill,
        observationCount: d.fills.length,
        collectionEventsCount: d.collectionsCount,
        volumeCollectedKg: d.volumeCollectedKg,
        provenance: isSynthetic ? 'synthetic_simulation' : 'observed',
        isSynthetic,
      };
    });

    const currentAvgFill = targetBins.length > 0
      ? Math.round(targetBins.reduce((acc, b) => acc + b.currentFillPercentage, 0) / targetBins.length)
      : 0;

    return {
      scope,
      scopeName,
      totalContributingBins: targetBins.length,
      averageCurrentFill: currentAvgFill,
      totalObservations: observations.length,
      totalCollectionsLogged: collections.length,
      contributingBins: targetBins.map((b) => ({
        id: b.id,
        code: b.code,
        name: b.name,
        wardName: b.ward?.name,
        currentFillPercentage: b.currentFillPercentage,
        urgency: b.urgency,
      })),
      timeline,
      disclaimer: 'Observations reflect logged physical readings or certified simulation records. Model predictions represent separate econometric projections.',
    };
  }

  /* ============================================================
   * MODULE 2: Regulatory Compliance CSV Data Export
   * Generates downloadable CSV audits for Bins, Complaints & E-Waste
   * ============================================================ */
  async exportReportCsv(type = 'bins') {
    if (type === 'bins') {
      const bins = await prisma.bin.findMany({ include: { ward: true } });
      const headers = 'Bin Code,Name,Ward,Waste Type,Area Category,Fill Percentage,Urgency,Priority Score,Provenance,Created At\n';
      const rows = bins
        .map(
          (b) =>
            `"${b.code}","${b.name}","${b.ward.name}","${b.wasteType}","${b.areaCategory}",${b.currentFillPercentage},"${b.urgency}",${b.priorityScore},"${b.provenance}","${b.createdAt.toISOString()}"`
        )
        .join('\n');
      return headers + rows;
    }

    if (type === 'complaints') {
      const complaints = await prisma.complaint.findMany({ include: { ward: true } });
      const headers = 'Ticket No,Category,Ward,Status,Severity,Reported By,Reported At,Resolved At\n';
      const rows = complaints
        .map(
          (c) =>
            `"${c.ticketNo}","${c.category}","${c.ward.name}","${c.status}","${c.severity}","${c.reportedBy}","${c.reportedAt.toISOString()}","${c.resolvedAt ? c.resolvedAt.toISOString() : ''}"`
        )
        .join('\n');
      return headers + rows;
    }

    if (type === 'ewaste') {
      const requests = await prisma.eWasteRequest.findMany();
      const headers = 'Ticket No,Citizen Name,Contact Phone,Pickup Address,Items,Status,Created At\n';
      const rows = requests
        .map(
          (r) =>
            `"${r.ticketNo}","${r.citizenName}","${r.contactPhone}","${r.pickupAddress}","${r.itemsDescription}","${r.status}","${r.createdAt.toISOString()}"`
        )
        .join('\n');
      return headers + rows;
    }

    throw new Error(`Unknown report type: ${type}`);
  }
}

export const analyticsService = new AnalyticsService();
