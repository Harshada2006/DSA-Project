import { prisma } from '../apps/api/src/database/client.js';

async function investigate() {
  console.log('=== INVESTIGATING HISTORICAL OBSERVATIONS & WARD COUNTS ===\n');

  // 1. Total counts by provenance
  const provenanceCounts = await prisma.binObservation.groupBy({
    by: ['provenance'],
    _count: { id: true },
  });
  console.log('1. OBSERVATIONS BY PROVENANCE:', provenanceCounts);

  // 2. Date ranges
  const minObs = await prisma.binObservation.findFirst({
    orderBy: { observedAt: 'asc' },
    select: { observedAt: true },
  });
  const maxObs = await prisma.binObservation.findFirst({
    orderBy: { observedAt: 'desc' },
    select: { observedAt: true },
  });
  console.log(`2. DATE RANGE: min=${minObs?.observedAt?.toISOString()} to max=${maxObs?.observedAt?.toISOString()}`);

  // 3. Count of observations per bin
  const obsPerBin = await prisma.binObservation.groupBy({
    by: ['binId'],
    _count: { id: true },
  });
  const minBinCount = Math.min(...obsPerBin.map((b) => b._count.id));
  const maxBinCount = Math.max(...obsPerBin.map((b) => b._count.id));
  console.log(`3. OBSERVATIONS PER BIN: count=${obsPerBin.length} bins, minCount=${minBinCount}, maxCount=${maxBinCount}`);

  // 4. Wards and their bins
  const wards = await prisma.ward.findMany({
    include: {
      bins: {
        select: { id: true, code: true, name: true },
      },
    },
  });

  console.log('\n4. WARDS AND BIN COUNTS:');
  for (const ward of wards) {
    const binIds = ward.bins.map((b) => b.id);
    const totalObs = await prisma.binObservation.count({
      where: { binId: { in: binIds } },
    });
    console.log(`  - Ward "${ward.name}" (code=${ward.code}, id=${ward.id}): ${ward.bins.length} bins, ${totalObs} total observations`);
  }

  // 5. Look at the specific 14-day and 30-day date filters
  // Let's check what the API does for "14 days" or "30 days"
  const now = new Date('2026-10-29T21:00:00.000Z');
  const d14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  console.log(`\n5. TIME FILTER TESTS (relative to now = ${now.toISOString()}):`);
  for (const ward of wards) {
    const binIds = ward.bins.map((b) => b.id);
    const obs14 = await prisma.binObservation.count({
      where: {
        binId: { in: binIds },
        observedAt: { gte: d14 },
      },
    });
    const obs30 = await prisma.binObservation.count({
      where: {
        binId: { in: binIds },
        observedAt: { gte: d30 },
      },
    });
    console.log(`  - Ward "${ward.name}" (${ward.bins.length} bins): last 14d=${obs14} (expected ~${ward.bins.length * 14}), last 30d=${obs30} (expected ~${ward.bins.length * 30})`);
  }

  // 6. Check unique dates per bin and check if there are multiple observations on the same day for any bin
  console.log('\n6. CHECKING DUPLICATE DATES PER BIN (SAME DAY OBSERVATIONS):');
  const sampleBins = wards[0].bins.slice(0, 3);
  for (const b of sampleBins) {
    const allObs = await prisma.binObservation.findMany({
      where: { binId: b.id },
      orderBy: { observedAt: 'desc' },
      take: 40,
    });
    console.log(`  Bin ${b.code} (${b.name}) latest 10 observations:`);
    for (const o of allObs.slice(0, 10)) {
      console.log(`    id=${o.id}, observedAt=${o.observedAt.toISOString()}, fillLevel=${o.fillLevel}, provenance=${o.provenance}`);
    }
  }

  // 7. Check the 11 observed records specifically
  console.log('\n7. AUDITING THE "OBSERVED" PROVENANCE RECORDS:');
  const observedRecords = await prisma.binObservation.findMany({
    where: { provenance: 'observed' },
    include: { bin: { select: { code: true, name: true, wardId: true } } },
  });
  console.log(`  Found ${observedRecords.length} observed records:`);
  for (const obs of observedRecords) {
    console.log(`    id=${obs.id}, bin=${obs.bin?.code}, observedAt=${obs.observedAt.toISOString()}, fillLevel=${obs.fillLevel}`);
  }
}

investigate().finally(() => prisma.$disconnect());

