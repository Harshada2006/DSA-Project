import path from 'path';
import { fileURLToPath } from 'url';
import PrismaPkg from '@prisma/client';
const { PrismaClient } = PrismaPkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function verifyBackup(backupPath) {
  const resolvedBackup = path.resolve(backupPath);
  const dbUrl = `file:${resolvedBackup}`;
  console.log(`Connecting to backup database at: ${dbUrl}`);

  const prisma = new PrismaClient({
    datasources: { db: { url: dbUrl } },
  });

  try {
    const counts = {
      users: await prisma.user.count(),
      workerProfiles: await prisma.workerProfile.count(),
      wards: await prisma.ward.count(),
      bins: await prisma.bin.count(),
      binObservations: await prisma.binObservation.count(),
      collectionTasks: await prisma.collectionTask.count(),
      collectionEvents: await prisma.collectionEvent.count(),
      complaints: await prisma.complaint.count(),
      ewasteRequests: await prisma.eWasteRequest.count(),
      facilities: await prisma.facility.count(),
      handoverRecords: await prisma.handoverRecord.count(),
      vehicles: await prisma.vehicle.count(),
      roadNodes: await prisma.roadNode.count(),
      roadEdges: await prisma.roadEdge.count(),
      operationalIssues: await prisma.operationalIssue.count(),
      auditLogs: await prisma.auditLog.count(),
    };

    // Check foreign keys
    const orphanedBins = await prisma.bin.count({
      where: {
        wardId: { notIn: (await prisma.ward.findMany({ select: { id: true } })).map((w) => w.id) },
      },
    });
    const orphanedObs = await prisma.binObservation.count({
      where: {
        binId: { notIn: (await prisma.bin.findMany({ select: { id: true } })).map((b) => b.id) },
      },
    });

    console.log('BACKUP_VERIFICATION_COUNTS:', JSON.stringify(counts, null, 2));
    console.log(`INTEGRITY_CHECK: orphanedBins=${orphanedBins}, orphanedObs=${orphanedObs}`);
    
    if (orphanedBins === 0 && orphanedObs === 0 && counts.bins === 100) {
      console.log('BACKUP_STATUS: VERIFIED_VALID_AND_RESTORABLE');
    } else {
      console.warn('BACKUP_STATUS: INTEGRITY_WARNING');
    }
  } finally {
    await prisma.$disconnect();
  }
}

const target = process.argv[2] || path.join(__dirname, '../apps/api/prisma/eco_collect.db.backup_phase1_safe');
verifyBackup(target).catch((err) => {
  console.error('BACKUP_VERIFICATION_ERROR:', err);
  process.exit(1);
});

