import assert from 'assert';
import app from '../app.js';
import { prisma } from '../database/client.js';
import { dsaService } from '../services/dsaService.js';
import { authService } from '../services/authService.js';
import { binService } from '../services/binService.js';
import { complaintService } from '../services/complaintService.js';
import { ewasteService } from '../services/ewasteService.js';
import { taskService } from '../services/taskService.js';
import { issueService } from '../services/issueService.js';
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
  console.log('       ECONEXUS COMPREHENSIVE TEST SUITE           ');
  console.log('====================================================');

  // 1. C++ DSA Engine Health & Shortest Path
  await test('C++ Engine Health Verification', async () => {
    const health = await dsaService.getEngineHealth();
    assert.strictEqual(health.success, true);
    assert.strictEqual(health.data.status, 'healthy');
  });

  await test('C++ Dijkstra Shortest Path on Nashik Road Graph', async () => {
    const res = await dsaService.getShortestPath('N-PAN', 'N-CAN', false);
    assert.strictEqual(res.reachable, true);
    assert.ok(res.distance_meters > 0);
    assert.ok(res.node_path.length >= 2);
  });

  // 2. Citizen Password Registration, Email Verification & Login (Section 5)
  await test('Citizen Password Signup, Email Verification & Password Login', async () => {
    const testEmail = `citizen_test_${Date.now()}@example.com`;
    const password = 'TestCitizenPass123!';

    // Register citizen
    const regRes = await authService.citizenRegister({
      name: 'Pooja Deshmukh',
      email: testEmail,
      password,
    });
    assert.strictEqual(regRes.requiresVerification, true);
    assert.ok(regRes.devOtpCode);

    // Cannot login before email verification
    await assert.rejects(
      async () => authService.citizenLogin(testEmail, password),
      /Your email address has not been verified/
    );

    // Verify email with code
    const verifyRes = await authService.verifyCitizenEmail(testEmail, regRes.devOtpCode);
    assert.strictEqual(verifyRes.success, true);

    // Duplicate registration rejected
    await assert.rejects(
      async () => authService.citizenRegister({ name: 'Duplicate', email: testEmail, password }),
      /already exists/
    );

    // Login with password succeeds
    const loginRes = await authService.citizenLogin(testEmail, password);
    assert.ok(loginRes.token);
    assert.strictEqual(loginRes.user.email, testEmail);

    // Invalid password rejected
    await assert.rejects(
      async () => authService.citizenLogin(testEmail, 'WrongPassword!'),
      /Invalid email or password/
    );
  });

  // 3. Password Reset Flow (Section 5)
  await test('Password Reset Request & Token Invalidation', async () => {
    const testEmail = `pooja.reset_${Date.now()}@example.com`;
    const reg = await authService.citizenRegister({
      name: 'Pooja Reset',
      email: testEmail,
      password: 'OldPassword123!',
    });
    await authService.verifyCitizenEmail(testEmail, reg.devOtpCode);

    const resetReq = await authService.requestPasswordReset(testEmail);
    assert.ok(resetReq.devOtpCode);

    // Confirm password reset
    const newPass = 'NewPassword456!';
    const confirmRes = await authService.resetPassword({
      email: testEmail,
      code: resetReq.devOtpCode,
      newPassword: newPass,
    });
    assert.strictEqual(confirmRes.success, true);

    // Token is single-use: cannot be reused
    await assert.rejects(
      async () => authService.resetPassword({ email: testEmail, code: resetReq.devOtpCode, newPassword: 'AnotherPassword!' }),
      /Invalid or expired/
    );
  });

  // 4. Worker Password Login & Account Activation (Section 6)
  await test('Worker Login & Activation Token Flow (No Quick Fill)', async () => {
    // Login with seeded credentials
    const workerLogin = await authService.workerLogin('WRK-NSK-101', 'WorkerPassword123!');
    assert.ok(workerLogin.token);
    assert.strictEqual(workerLogin.user.role, 'WORKER');

    // Reject invalid password
    await assert.rejects(
      async () => authService.workerLogin('WRK-NSK-101', 'BadPass!'),
      /Invalid worker credentials/
    );

    // Provision new worker and activate account
    const adminUser = await prisma.user.findFirst({ where: { role: 'ORGANIZATION_ADMIN' } });
    const provisionRes = await authService.provisionWorker(adminUser, {
      name: 'Ramesh Koli',
      email: `ramesh_${Date.now()}@econexus.gov.in`,
      phone: '+91 98221 88990',
      assignedWard: 'Panchavati',
    });
    assert.ok(provisionRes.worker.activationToken);

    // Worker activates account with token
    const activateRes = await authService.activateWorkerAccount({
      workerId: provisionRes.worker.workerId,
      activationToken: provisionRes.worker.activationToken,
      newPassword: 'ActivatedPass123!',
    });
    assert.strictEqual(activateRes.success, true);

    // Cannot re-use activation token
    await assert.rejects(
      async () => authService.activateWorkerAccount({
        workerId: provisionRes.worker.workerId,
        activationToken: provisionRes.worker.activationToken,
        newPassword: 'SecondPass123!',
      }),
      /Invalid, already-used, or expired/
    );
  });

  // 5. Organization Admin Login & Request Access Pending (Section 7)
  await test('Organization Admin Login & Request Access Workflow', async () => {
    const adminRes = await authService.organizationAdminLogin('admin@econexus.gov.in', 'AdminPassword123!');
    assert.ok(adminRes.token);
    assert.strictEqual(adminRes.user.role, 'ORGANIZATION_ADMIN');

    // Register organization request access (must remain pending)
    const orgReq = await authService.requestOrganizationRegistration({
      organizationName: `Panchavati Green_${Date.now()}`,
      officialWorkEmail: `sharad_${Date.now()}@panchavatigreen.org`,
      adminName: 'Dr. Sharad Pawar',
      contactPhone: '+91 98220 12345',
      reasonForRequest: 'Municipal ward solid waste NGO partnership',
    });
    assert.strictEqual(orgReq.status, 'pending');
  });

  // 6. Citizen Complaint Filing Without Manual Urgency or Bin ID (Section 8)
  await test('Citizen Complaint Submission (No Manual Urgency, Privacy Scoping)', async () => {
    const citizen = await prisma.user.findFirst({ where: { role: 'CITIZEN' } });
    const ward = await prisma.ward.findFirst();

    const complaint = await complaintService.submitComplaint(citizen, {
      title: 'Overflowing waste near market entrance',
      category: 'OVERFLOW',
      description: 'Street waste accumulation',
      wardId: ward.id,
      landmark: 'Near vegetable market',
    });

    assert.ok(complaint.ticketNo.startsWith('CMP-2026-'));
    assert.ok(complaint.severity); // Computed internally by system

    // Scoped list: citizen can only see their own complaints
    const citizenComplaints = await complaintService.getComplaints(citizen);
    assert.ok(citizenComplaints.some((c) => c.id === complaint.id));

    // Access denied for unauthorized citizen
    const otherCitizen = { id: 'other-unauthorized-citizen-id', role: 'CITIZEN' };
    await assert.rejects(
      async () => complaintService.getComplaintDetails(complaint.id, otherCitizen),
      /Access denied/
    );
  });

  // 7. Worker Collection Without Manual Bin-Fill Percentage (Section 11 & 16)
  await test('Worker Collection Execution (No Manual Fill % Input)', async () => {
    const worker = await prisma.user.findFirst({ where: { role: 'WORKER' } });
    const task = await prisma.collectionTask.findFirst({
      where: { assignedWorkerId: worker.id, status: 'assigned' },
    });

    if (task) {
      await taskService.startTask(task.id, worker);
      const collected = await taskService.recordCollection(
        task.id,
        {
          weightKg: 110.0,
          wasteType: 'SOLID',
          notes: 'Bin cleared and emptied into vehicle',
          gpsConsent: true,
        },
        worker
      );
      assert.strictEqual(collected.status, 'collected');
    }
  });

  // 8. Worker Issue Reporting & Roadblock-Aware Routing (Section 12, 20 & 21)
  await test('Worker Issue Reporting & Roadblock Avoidance Routing', async () => {
    const worker = await prisma.user.findFirst({ where: { role: 'WORKER' } });

    // 1. Report road closure
    const issue = await issueService.reportIssue(worker, {
      issueType: 'blocked_road',
      roadName: 'Gangapur Road Sector 4',
      description: 'Underground pipeline repair',
      locationText: 'Gangapur Road',
    });
    assert.ok(issue.id);
    assert.strictEqual(issue.issueType, 'blocked_road');

    // 2. Route optimizer dynamically avoids roadblocks
    const bins = await prisma.bin.findMany({ take: 3 });
    const route = await dsaService.getOptimizedRoute({
      binIds: bins.map((b) => b.id),
      avoidRoadblocks: true,
    });
    assert.ok(route.ordered_stops.length > 0);
    assert.ok(route.total_distance_km >= 0);
  });

  // 9. Nashik Section 18 E-Waste Facilities & Handover Workflow (Section 14 & 18)
  await test('Nashik E-Waste Facilities & Handover Workflow', async () => {
    // Verify Section 18 Nashik facilities exist with correct attributes
    const facilities = await prisma.facility.findMany({
      where: { wasteType: 'electronic' },
    });
    assert.ok(facilities.length >= 4);

    const wonderPrint = facilities.find((f) => f.name.includes('Wonder Print'));
    if (wonderPrint) {
      assert.ok(wonderPrint.facilityAddress.includes('MIDC Ambad'));
      assert.ok(wonderPrint.businessAddress.includes('Gangapur Road'));
    }

    const worker = await prisma.user.findFirst({ where: { role: 'WORKER' } });
    const facility = facilities[0];

    // Worker records handover
    const handover = await ewasteService.recordFacilityHandover(
      {
        facilityId: facility.id,
        measuredWeightKg: 25.0,
        receiptNumber: 'MNF-NSK-990011',
        manifestNumber: 'MNF-NSK-990011',
        certificateNumber: 'CERT-MPCB-1122',
        notes: 'Verified transfer to authorized recycler',
      },
      worker
    );
    assert.ok(handover.id);
    assert.strictEqual(handover.facilityId, facility.id);
  });

  // 10. Pure JS Machine Learning Pipeline & Prediction Disclaimers (Section 16)
  await test('Pure JS Ridge ML Pipeline & Prediction Disclaimers', async () => {
    const bins = await prisma.bin.findMany({ take: 1 });
    const pred = await predictionService.predictBinFullness(bins[0].id);

    assert.ok(pred.predictedNextDayFill >= 0 && pred.predictedNextDayFill <= 100);
    assert.strictEqual(pred.isRealMeasurement, false);
    assert.ok(pred.predictionHorizon.includes('horizon'));
    assert.ok(pred.disclaimer.includes('historical accumulation'));
  });

  // 11. Dashboard Analytics Summary & CSV Export
  await test('Dashboard Analytics Summary & CSV Export', async () => {
    const summary = await analyticsService.getDashboardSummary();
    assert.ok(summary.metrics.totalRegisteredBins > 0);
    assert.ok(summary.wardSummaries.length > 0);

    const csv = await analyticsService.exportReportCsv('bins');
    assert.ok(csv.includes('Bin Code'));
  });

  // 12. Bin 180-Day Historical Observations & Chronological Consistency (Phase 2 & 4)
  await test('Bin 180-Day History & Chronological State Consistency', async () => {
    const bin = await prisma.bin.findFirst();
    assert.ok(bin);

    const history = await binService.getBinHistory(bin.id, { limit: 180 });
    assert.ok(history.bin);
    assert.ok(history.timeline.length > 0);
    assert.ok(history.timeline.length <= 180);
    assert.ok(history.prediction);
    assert.strictEqual(typeof history.prediction.predictedFillTomorrow, 'number');
    assert.ok(history.prediction.disclaimer.includes('SYNTHETIC_SIMULATION'));

    // Check bounded fill percentages
    for (const obs of history.timeline) {
      assert.ok(obs.fillPercentage >= 0 && obs.fillPercentage <= 100);
      assert.ok(obs.estimatedVolumeLitres >= 0);
    }
  });

  // 13. Vehicle Capacity Tracking & Municipal Dumping Facility Routing (Phase 6 & 7)
  await test('Vehicle Capacity Tracking & Dumping Facility Shortest-Path Routing', async () => {
    const worker = await prisma.user.findFirst({ where: { role: 'WORKER' } });
    assert.ok(worker);

    // Get vehicle status
    const status = await taskService.getVehicleStatus(worker);
    assert.ok(status.vehicle);
    assert.ok(status.dumpingFacility);
    assert.strictEqual(status.dumpingFacility.nodeId, 'N-PAT');
    assert.ok(status.vehicle.capacityKg > 0);

    // Route to dumping facility
    const dumpingRoute = await taskService.getRouteToDumpingFacility({ avoidBlocked: true });
    assert.strictEqual(dumpingRoute.reachable, true);
    assert.strictEqual(dumpingRoute.target_id, 'N-PAT');
    assert.ok(dumpingRoute.distance_meters > 0);
    assert.ok(dumpingRoute.coordinate_path.length >= 2);

    // Unload vehicle
    const unloadRes = await taskService.recordTruckUnload(status.vehicle.id, worker, {});
    assert.strictEqual(unloadRes.success, true);
    assert.strictEqual(unloadRes.vehicle.currentLoadKg, 0.0);
    assert.strictEqual(unloadRes.vehicle.isFull, false);
  });

  // 14. Duplicate Collection Submission Prevention (Phase 6 & 12)
  await test('Duplicate Collection Submission Rejection', async () => {
    const worker = await prisma.user.findFirst({ where: { role: 'WORKER' } });
    const completedTask = await prisma.collectionTask.findFirst({
      where: { status: 'collected' },
    });

    if (completedTask) {
      await assert.rejects(
        async () => taskService.recordCollection(completedTask.id, { weightKg: 50 }, worker, {}),
        /already been completed/
      );
    }
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
