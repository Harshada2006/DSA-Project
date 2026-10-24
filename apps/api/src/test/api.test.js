import assert from 'assert';
import app from '../app.js';
import { prisma } from '../database/client.js';
import { dsaService } from '../services/dsaService.js';
import { authService } from '../services/authService.js';
import { binService } from '../services/binService.js';
import { complaintService } from '../services/complaintService.js';
import { ewasteService } from '../services/ewasteService.js';
import { taskService } from '../services/taskService.js';
import { predictionService } from '../services/predictionService.js';
import { analyticsService } from '../services/analyticsService.js';

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}:`, err.message);
    failed++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('       ECONEXUS API & INTEGRATION TEST SUITE        ');
  console.log('====================================================');

  // 1. C++ DSA Engine Health
  await test('C++ Engine Health Verification', async () => {
    const health = await dsaService.getEngineHealth();
    assert.strictEqual(health.success, true);
    assert.strictEqual(health.data.status, 'healthy');
  });

  // 2. Citizen OTP Flow
  await test('Citizen OTP Request & Verification Flow', async () => {
    const email = 'test_citizen_nashik@example.com';
    const otpRes = await authService.requestCitizenOtp(email, 'Kavita Joshi');
    assert.ok(otpRes.message);

    // Fetch token from DB
    const tokenRecord = await prisma.emailVerificationToken.findFirst({
      where: { email, isUsed: false },
    });
    assert.ok(tokenRecord);

    const verifyRes = await authService.verifyCitizenOtp(email, tokenRecord.otpCode, 'Kavita Joshi');
    assert.ok(verifyRes.token);
    assert.strictEqual(verifyRes.user.role, 'CITIZEN');
  });

  // 3. Worker Login & Role Protection
  await test('Worker Login & Credentials Validation', async () => {
    const loginRes = await authService.workerLogin('WRK-NSK-101', 'NMC-SWM', 'WorkerPassword123!');
    assert.ok(loginRes.token);
    assert.strictEqual(loginRes.user.role, 'WORKER');
    assert.strictEqual(loginRes.user.workerId, 'WRK-NSK-101');

    // Invalid password rejected
    await assert.rejects(
      async () => authService.workerLogin('WRK-NSK-101', 'NMC-SWM', 'WrongPassword!'),
      /Invalid worker credentials/
    );
  });

  // 4. Organization Admin Login
  await test('Organization Admin Login & Session Generation', async () => {
    const adminRes = await authService.organizationAdminLogin('admin@econexus.gov.in', 'AdminPassword123!');
    assert.ok(adminRes.token);
    assert.strictEqual(adminRes.user.role, 'ORGANIZATION_ADMIN');
  });

  // 5. C++ 4-Factor Priority Ranking
  await test('C++ Max-Heap 4-Factor Priority Ranking (Section 13)', async () => {
    const result = await dsaService.getPrioritizedTasks();
    assert.ok(result.tasks.length > 0);
    assert.ok(result.tasks[0].priority_score >= result.tasks[result.tasks.length - 1].priority_score);
    assert.ok(result.tasks[0].reason_for_prioritization);
    assert.ok(result.tasks[0].factor_contributions);
    assert.ok(result.tasks[0].factor_contributions.overflow_risk_contribution >= 0);
  });

  // 6. C++ Dijkstra Shortest Path
  await test('C++ Dijkstra Shortest Path on Nashik Road Network', async () => {
    const res = await dsaService.getShortestPath('N-PAN', 'N-CAN', false);
    assert.strictEqual(res.reachable, true);
    assert.ok(res.distance_meters > 0);
    assert.ok(res.node_path.length >= 2);
  });

  // 7. Sensor-Free Fullness Prediction
  await test('Sensor-Free Heuristic Prediction with Observation Decay', async () => {
    const bins = await prisma.bin.findMany({ take: 1 });
    const pred = await predictionService.predictBinFullness(bins[0].id);
    assert.ok(pred.estimatedCurrentFullness >= 0 && pred.estimatedCurrentFullness <= 100);
    assert.ok(['High', 'Medium', 'Low', 'Unknown'].includes(pred.confidenceLevel));
    assert.ok(pred.observationDisplay);
  });

  // 8. Citizen Complaint Filing & Privacy
  await test('Citizen Complaint Filing & Privacy Boundary', async () => {
    const citizen = await prisma.user.findFirst({ where: { role: 'CITIZEN' } });
    const ward = await prisma.ward.findFirst();

    const complaint = await complaintService.submitComplaint(citizen, {
      category: 'overflowing_bin',
      description: 'Test complaint about overflow near market',
      wardId: ward.id,
      latitude: 20.008,
      longitude: 73.794,
    });
    assert.ok(complaint.ticketNo.startsWith('CMP-2026-'));

    // Citizen views own complaints
    const citizenComplaints = await complaintService.getComplaints(citizen);
    assert.ok(citizenComplaints.some((c) => c.id === complaint.id));

    // Other citizen cannot see this complaint
    const otherCitizen = { id: 'other-citizen-uuid', role: 'CITIZEN' };
    await assert.rejects(
      async () => complaintService.getComplaintDetails(complaint.id, otherCitizen),
      /Access denied/
    );
  });

  // 9. Worker Task Lifecycle
  await test('Worker Task Execution: Start -> Record Collection', async () => {
    const worker = await prisma.user.findFirst({ where: { role: 'WORKER' } });
    const task = await prisma.collectionTask.findFirst({
      where: { assignedWorkerId: worker.id, status: 'assigned' },
    });

    if (task) {
      // Worker starts task
      const started = await taskService.startTask(task.id, worker);
      assert.strictEqual(started.status, 'started');

      // Worker records collection
      const collected = await taskService.recordCollection(
        task.id,
        { observedFillAfter: 5.0, collectedWeightKg: 120.0, notes: 'Collected successfully' },
        worker
      );
      assert.strictEqual(collected.status, 'collected');
    }
  });

  // 10. E-Waste Lifecycle (Citizen -> Admin -> Worker -> Recycler Handover)
  await test('E-Waste Pipeline: Request -> Assignment -> Recycler Handover', async () => {
    const citizen = await prisma.user.findFirst({ where: { role: 'CITIZEN' } });
    const admin = await prisma.user.findFirst({ where: { role: 'ORGANIZATION_ADMIN' } });
    const worker = await prisma.user.findFirst({ where: { role: 'WORKER' } });
    const facility = await prisma.facility.findFirst({ where: { facilityType: 'verified_ewaste_recycler' } });

    // 1. Citizen submits request
    const ewReq = await ewasteService.submitPickupRequest(citizen, {
      citizenName: 'Deepak Patil',
      contactPhone: '+91 98220 99887',
      pickupAddress: 'Shop 12, Satpur MIDC Market, Nashik',
      itemsDescription: '1 Old CRT TV, 2 motherboards',
      estimatedWeightKg: 18.0,
    });
    assert.strictEqual(ewReq.status, 'submitted');

    // 2. Admin assigns worker
    const assigned = await ewasteService.assignWorker(ewReq.id, worker.id, admin);
    assert.strictEqual(assigned.status, 'assigned');

    // 3. Worker records collection
    const collected = await ewasteService.recordWorkerCollection(ewReq.id, { measuredWeightKg: 19.5 }, worker);
    assert.strictEqual(collected.status, 'collected');

    // 4. Worker records handover to verified MPCB facility
    const handover = await ewasteService.recordFacilityHandover(
      {
        facilityId: facility.id,
        ewasteRequestId: ewReq.id,
        measuredWeightKg: 19.5,
        receiptNumber: 'REC-MPCB-2026-908',
      },
      worker
    );
    assert.ok(handover.id);
    assert.strictEqual(handover.facilityId, facility.id);
  });

  // 11. Dashboard Analytics Summary & CSV Export
  await test('Dashboard Analytics Summary & CSV Export', async () => {
    const summary = await analyticsService.getDashboardSummary();
    assert.ok(summary.metrics.totalRegisteredBins > 0);
    assert.ok(summary.wardSummaries.length > 0);
    assert.ok(summary.priorityDistribution.Critical >= 0);

    const csv = await analyticsService.exportReportCsv('bins');
    assert.ok(csv.includes('Bin Code'));
    assert.ok(csv.includes('BIN-NSK-001'));
  });

  console.log('====================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((e) => {
    console.error('Fatal test runner error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
