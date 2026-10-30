import { prisma } from '../apps/api/src/database/client.js';

async function analyzeWardQuery() {
  console.log('=== ANALYZING WARD OBSERVATION QUERIES ===\n');

  // Let's inspect the wards
  const wards = await prisma.ward.findMany({
    include: { bins: true },
  });

  // Let's test various date ranges:
  // 14 days ago vs 29 days ago vs 30 days ago
  const refDate = new Date('2026-10-29T20:00:00.000Z');

  for (let days of [14, 28, 29, 30]) {
    const since = new Date(refDate.getTime() - days * 24 * 60 * 60 * 1000);
    console.log(`\n--- Query with days = ${days} (since ${since.toISOString()}) ---`);
    for (const w of wards.slice(0, 3)) {
      const binIds = w.bins.map((b) => b.id);
      const obsCount = await prisma.binObservation.count({
        where: {
          binId: { in: binIds },
          observedAt: { gte: since },
        },
      });
      const collCount = await prisma.collectionEvent.count({
        where: {
          binId: { in: binIds },
          collectedAt: { gte: since },
        },
      });
      console.log(`  Ward ${w.name} (${w.bins.length} bins): obsCount=${obsCount}, collCount=${collCount}`);
    }
  }

  // Now let's check what the API route does!
  // Where is the area-wise history endpoint in apps/api/src/routes/ ?
}

analyzeWardQuery().finally(() => prisma.$disconnect());

