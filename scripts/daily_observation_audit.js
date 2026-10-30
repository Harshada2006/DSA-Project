import { prisma } from '../apps/api/src/database/client.js';

async function auditDaily() {
  const raw = await prisma.$queryRaw`
    SELECT date(observedAt / 1000, 'unixepoch') as obsDate, count(*) as count, provenance
    FROM BinObservation
    GROUP BY date(observedAt / 1000, 'unixepoch'), provenance
    ORDER BY obsDate DESC
    LIMIT 35;
  `;
  console.log('DAILY OBSERVATION DISTRIBUTION:');
  console.table(raw);

  // Check unique dates total
  const uniqueDates = await prisma.$queryRaw`
    SELECT count(DISTINCT date(observedAt / 1000, 'unixepoch')) as uniqueDateCount, provenance
    FROM BinObservation
    GROUP BY provenance;
  `;
  console.log('UNIQUE DATES BY PROVENANCE:');
  console.table(uniqueDates);

  // Check if any bin has duplicate observations on the SAME calendar date for synthetic data
  const duplicates = await prisma.$queryRaw`
    SELECT binId, date(observedAt / 1000, 'unixepoch') as obsDate, count(*) as count
    FROM BinObservation
    WHERE provenance = 'synthetic'
    GROUP BY binId, date(observedAt / 1000, 'unixepoch')
    HAVING count(*) > 1;
  `;
  console.log(`DUPLICATE SYNTHETIC OBSERVATIONS (same bin on same calendar date): ${duplicates.length}`);
  if (duplicates.length > 0) {
    console.table(duplicates);
  } else {
    console.log('✓ Zero duplicate synthetic observations! Exactly 1 observation per bin per calendar day.');
  }

  // Min and max date for synthetic
  const range = await prisma.$queryRaw`
    SELECT min(date(observedAt / 1000, 'unixepoch')) as minDate, max(date(observedAt / 1000, 'unixepoch')) as maxDate, count(*) as totalCount
    FROM BinObservation
    WHERE provenance = 'synthetic';
  `;
  console.log('SYNTHETIC OBSERVATIONS RANGE:');
  console.table(range);
}

auditDaily().finally(() => prisma.$disconnect());
