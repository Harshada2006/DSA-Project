import { prisma } from '../apps/api/src/database/client.js';

async function removeUnverifiedFacilities() {
  console.log('=== REMOVING UNVERIFIED FACILITIES PER USER DIRECTIVE ===\n');

  // 1. Find primary verified recycler to re-link handovers
  const verifiedRecycler = await prisma.facility.findFirst({
    where: {
      verificationStatus: 'verified',
      name: { contains: 'Techeco' },
    },
  });

  if (!verifiedRecycler) {
    throw new Error('No verified recycler found to preserve handovers!');
  }
  console.log(`Target verified recycler for handovers: ${verifiedRecycler.name} (${verifiedRecycler.id})`);

  // 2. Re-link handovers from unverified facilities
  const unverifiedFacilities = await prisma.facility.findMany({
    where: {
      verificationStatus: { not: 'verified' },
    },
    select: { id: true, name: true },
  });

  const unverifiedIds = unverifiedFacilities.map((f) => f.id);
  console.log(`Found ${unverifiedIds.length} unverified facilities to remove:`, unverifiedFacilities.map((f) => f.name));

  const updatedHandovers = await prisma.handoverRecord.updateMany({
    where: { facilityId: { in: unverifiedIds } },
    data: { facilityId: verifiedRecycler.id },
  });
  console.log(`Re-linked ${updatedHandovers.count} handover record(s) to ${verifiedRecycler.name}.`);

  // 3. Delete unverified facilities
  const deleted = await prisma.facility.deleteMany({
    where: { id: { in: unverifiedIds } },
  });
  console.log(`✓ Successfully deleted ${deleted.count} unverified facility record(s) from database.\n`);

  // 4. Verify remaining facilities
  const remaining = await prisma.facility.findMany();
  console.log('REMAINING VERIFIED FACILITIES IN DATABASE:');
  console.table(remaining.map((f) => ({
    id: f.id,
    name: f.name,
    facilityType: f.facilityType,
    verificationStatus: f.verificationStatus,
    authorizationNumber: f.authorizationNumber,
  })));
}

removeUnverifiedFacilities().finally(() => prisma.$disconnect());
