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
import { facilityService } from '../services/facilityService.js';
import { analyticsService } from '../services/analyticsService.js';

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}:`, err.stack || err.message);
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

  await test('C++ Dijkstra Shortest Path: Source Equal to Destination', async () => {
    const res = await dsaService.getShortestPath('N-CAN', 'N-CAN', false);
    assert.strictEqual(res.reachable, true);
    assert.strictEqual(res.distance_meters, 0);
    assert.strictEqual(res.total_distance_km, 0);
    assert.strictEqual(res.node_path.length, 1);
    assert.strictEqual(res.node_path[0], 'N-CAN');
    assert.strictEqual(res.coordinate_path.length, 1);
  });

  await test('C++ Dijkstra Shortest Path: Known Graph Path Reconstruction & Total Distance', async () => {
    const res = await dsaService.getShortestPath('N-ABB', 'N-CBS', false);
    assert.strictEqual(res.reachable, true);
    assert.deepStrictEqual(res.node_path, ['N-ABB', 'N-CAN', 'N-CBS']);
    assert.strictEqual(res.graph_distance_meters, 3000);
    assert.ok(res.distance_meters > 0);
    assert.ok(res.coordinate_path.length >= 3);
    assert.strictEqual(res.intermediateNodes.length, 3);
    assert.ok(res.geometry_source === 'osrm' || res.geometry_source === 'graph_nodes_approximate_fallback');
    for (const coord of res.coordinate_path) {
      assert.ok(Array.isArray(coord) && coord.length === 2);
      assert.ok(coord[0] >= 19.0 && coord[0] <= 21.0);
      assert.ok(coord[1] >= 73.0 && coord[1] <= 75.0);
    }
  });

  await test('C++ Dijkstra Shortest Path: Invalid Source or Destination Node Handling', async () => {
    const res = await dsaService.getShortestPath('NON_EXISTENT_SOURCE', 'N-CBS', false);
    assert.strictEqual(res.reachable, false);
    assert.ok(res.error.includes('Node not found') || res.error.includes('Invalid'));
  });

  await test('C++ Dijkstra Shortest Path: Route Visualization Data Mapping Verification', async () => {
    const res = await dsaService.getShortestPath('N-PAN', 'N-BYT', false);
    assert.strictEqual(res.reachable, true);
    assert.ok(res.coordinate_path.length >= res.node_path.length);
    assert.strictEqual(res.intermediateNodes.length, res.node_path.length);
    for (let i = 0; i < res.node_path.length; i++) {
      assert.strictEqual(res.intermediateNodes[i].id, res.node_path[i]);
    }
    for (const coord of res.coordinate_path) {
      assert.ok(Array.isArray(coord) && coord.length === 2);
      assert.ok(coord[0] >= 19.0 && coord[0] <= 21.0);
      assert.ok(coord[1] >= 73.0 && coord[1] <= 75.0);
    }
  });

  await test('C++ Multi-Waypoint Dijkstra Shortest Path (Source -> Intermediate Stop -> Destination)', async () => {
    // Route from Panchavati (N-PAN) to CBS (N-CBS) with Canada Corner (N-CAN) as intermediate waypoint
    const res = await dsaService.getShortestPath('N-PAN', 'N-CBS', false, true, ['N-CAN']);
    assert.strictEqual(res.reachable, true);
    assert.ok(res.distance_meters > 0);
    assert.ok(res.total_distance_km > 0);
    assert.ok(res.total_duration_minutes > 0);
    assert.strictEqual(res.stops.length, 3);
    assert.strictEqual(res.stops[0].type, 'source');
    assert.strictEqual(res.stops[1].type, 'waypoint');
    assert.strictEqual(res.stops[2].type, 'destination');
    assert.strictEqual(res.legs.length, 2);
    assert.strictEqual(res.legs[0].to, 'N-CAN');
    assert.strictEqual(res.legs[1].from, 'N-CAN');
    // Ensure total distance equals sum of leg distances
    const sumLegDistance = res.legs.reduce((acc, l) => acc + l.distance_meters, 0);
    assert.strictEqual(res.distance_meters, sumLegDistance);
    // Ensure node_path includes the waypoint in the correct order
    const waypointIndex = res.node_path.indexOf('N-CAN');
    assert.ok(waypointIndex > 0 && waypointIndex < res.node_path.length - 1);
  });

  await test('C++ Multi-Stop Dijkstra Shortest Path with Multiple Ordered Waypoints', async () => {
    // Route from N-JEH to N-ABB via N-CBS and N-CAN
    const res = await dsaService.getShortestPath('N-JEH', 'N-ABB', false, true, ['N-CBS', 'N-CAN']);
    assert.strictEqual(res.reachable, true);
    assert.strictEqual(res.stops.length, 4);
    assert.strictEqual(res.legs.length, 3);
    assert.deepStrictEqual(res.stops.map((s) => s.id), ['N-JEH', 'N-CBS', 'N-CAN', 'N-ABB']);
    assert.strictEqual(res.legs[0].from, 'N-JEH');
    assert.strictEqual(res.legs[0].to, 'N-CBS');
    assert.strictEqual(res.legs[1].from, 'N-CBS');
    assert.strictEqual(res.legs[1].to, 'N-CAN');
    assert.strictEqual(res.legs[2].from, 'N-CAN');
    assert.strictEqual(res.legs[2].to, 'N-ABB');
  });

  await test('C++ Multi-Waypoint Routing: Invalid / Unreachable Stop Handling', async () => {
    const res = await dsaService.getShortestPath('N-PAN', 'N-CBS', false, true, ['INVALID_STOP_NODE']);
    assert.strictEqual(res.reachable, false);
    assert.ok(res.error.includes('Node not found') || res.error.includes('Invalid'));
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

  // 15. Historical Bin Data & Date Filtering Verification
  await test('Historical Bin Fill Inspection with Date Filtering', async () => {
    const bin = await prisma.bin.findFirst();
    assert.ok(bin);

    // Get an existing observation date for this bin
    const obs = await prisma.binObservation.findFirst({
      where: { binId: bin.id },
      orderBy: { observedAt: 'desc' },
    });

    if (obs) {
      const dateStr = obs.observedAt.toISOString().slice(0, 10);
      const binsRes = await binService.getBins({ date: dateStr });
      assert.ok(binsRes.length > 0);
      const targetBin = binsRes.find((b) => b.id === bin.id);
      assert.ok(targetBin);
      assert.strictEqual(targetBin.isHistorical, true);
      assert.strictEqual(targetBin.hasHistoricalData, true);
      assert.ok(typeof targetBin.displayedFillPercentage === 'number');

      // Test bin history for that exact date
      const historyForDate = await binService.getBinHistory(bin.id, { date: dateStr });
      assert.strictEqual(historyForDate.selectedDate, dateStr);
      assert.strictEqual(historyForDate.hasHistoricalDataForDate, true);
      assert.ok(historyForDate.selectedObservation !== null);
      assert.ok(typeof historyForDate.currentFillPercentage === 'number');
    }

    // Test a date far in the future or with no historical observations
    const noDataDate = '2099-01-01';
    const futureHistory = await binService.getBinHistory(bin.id, { date: noDataDate });
    assert.strictEqual(futureHistory.selectedDate, noDataDate);
    assert.strictEqual(futureHistory.hasHistoricalDataForDate, false);
    assert.strictEqual(futureHistory.selectedObservation, null);
    assert.ok(typeof futureHistory.currentFillPercentage === 'number');
  });

  // 16. Facility Creation with Address Normalization & Validation
  await test('Facility Creation with Address Normalization & Validation', async () => {
    // 1. Missing address must fail validation cleanly
    await assert.rejects(
      async () => {
        await facilityService.createFacility({ name: 'Test Facility Missing Address' });
      },
      /address is required/i
    );

    // 2. Normalization of facilityAddress when address field is omitted
    const created = await facilityService.createFacility({
      name: 'Nashik Circular Hub Test',
      facilityAddress: 'Plot 42, MIDC Ambad, Nashik 422010',
      facilityType: 'RECYCLER',
      latitude: 19.9385,
      longitude: 73.7345,
    });
    assert.ok(created.id);
    assert.strictEqual(created.address, 'Plot 42, MIDC Ambad, Nashik 422010');
    assert.strictEqual(created.verificationStatus, 'unverified');

    // Clean up created test facility
    await prisma.facility.delete({ where: { id: created.id } }).catch(() => {});
  });

  // 17. E-Waste Facility Handover Contract Compatibility, Status Transition & Duplicate Prevention
  await test('E-Waste Facility Handover Contract Compatibility & Duplicate Prevention', async () => {
    const verifiedRecycler = await prisma.facility.findFirst({
      where: {
        verificationStatus: 'verified',
        facilityType: { in: ['verified_ewaste_recycler', 'recycler', 'RECYCLER'] },
      },
    }) || await prisma.facility.findFirst({ where: { verificationStatus: 'verified' } });
    assert.ok(verifiedRecycler, 'At least one verified recycler facility required in DB');

    // Create a temporary test e-waste request
    const testEWaste = await prisma.eWasteRequest.create({
      data: {
        ticketNo: `EW-TEST-${Date.now()}`,
        citizenName: 'Pooja Deshmukh',
        citizenEmail: 'citizen@econexus.gov.in',
        contactPhone: '+91 98900 12345',
        pickupAddress: 'MG Road, Shalimar, Nashik',
        latitude: 19.9928,
        longitude: 73.7891,
        itemsDescription: 'Old computer monitor and microwave',
        approximateQuantity: '2 Large items',
        estimatedWeightKg: 25.0,
        status: 'assigned',
      },
    });

    try {
      // 1. Record handover using weightKg and manifestNumber contract aliases
      const manifestNum = `MNF-TEST-${Date.now().toString().slice(-6)}`;
      const handoverRes = await ewasteService.recordFacilityHandover({
        facilityId: verifiedRecycler.id,
        weightKg: 25.0,
        manifestNumber: manifestNum,
        ewasteRequestId: testEWaste.id,
        notes: 'Handover verification test',
      });

      assert.ok(handoverRes.id);
      assert.strictEqual(handoverRes.measuredWeightKg, 25.0);
      assert.strictEqual(handoverRes.receiptNumber, manifestNum);

      // Verify transaction updated eWasteRequest status to delivered_to_recycler
      const updatedReq = await prisma.eWasteRequest.findUnique({ where: { id: testEWaste.id } });
      assert.strictEqual(updatedReq.status, 'delivered_to_recycler');
      assert.strictEqual(updatedReq.assignedFacilityId, verifiedRecycler.id);

      // 2. Duplicate handover on already delivered request must be rejected
      await assert.rejects(
        async () => {
          await ewasteService.recordFacilityHandover({
            facilityId: verifiedRecycler.id,
            weightKg: 25.0,
            manifestNumber: `MNF-DUP-${Date.now().toString().slice(-6)}`,
            ewasteRequestId: testEWaste.id,
          });
        },
        /already been delivered/i
      );
    } finally {
      // Clean up test records
      await prisma.handoverRecord.deleteMany({ where: { ewasteRequestId: testEWaste.id } }).catch(() => {});
      await prisma.eWasteRequest.delete({ where: { id: testEWaste.id } }).catch(() => {});
    }
  });

  // 18. Geographic Bin Filtering, Haversine Distance & Coordinate Validation
  await test('Geographic Bin Filtering, Haversine Distance & Coordinate Validation', async () => {
    // 1. Coordinate range validation
    await assert.rejects(
      async () => {
        await binService.getBins({ latitude: 95.0, longitude: 73.7898 });
      },
      /invalid geographic coordinates/i
    );

    // 2. Haversine distance filtering within 2.0 km radius
    const nearbyBins = await binService.getBins({
      latitude: 19.9972, // CBS
      longitude: 73.7845,
      radiusKm: 2.0,
    });
    assert.ok(nearbyBins.length > 0);
    for (const b of nearbyBins) {
      assert.ok(b.distanceKm !== null && b.distanceKm <= 2.0);
    }

    // 3. Zone filtering
    const northZoneBins = await binService.getBins({ zone: 'North Zone' });
    assert.ok(northZoneBins.length > 0);
    for (const b of northZoneBins) {
      assert.strictEqual(b.ward?.zone, 'North Zone');
    }
  });

  // 19. Road-Following Shortest-Path Geometry & Physical Terminal Retention
  await test('Road-Following Shortest-Path Geometry & Physical Terminal Retention', async () => {
    const bin = await prisma.bin.findFirst();
    const facility = await prisma.facility.findFirst({ where: { verificationStatus: 'verified' } });
    assert.ok(bin && facility);

    const routeRes = await dsaService.getShortestPath(bin.id, facility.id, false);
    assert.strictEqual(routeRes.reachable, true);
    assert.ok(routeRes.coordinate_path.length >= 2);
    assert.ok(routeRes.geometry_source === 'local_edge_geometry' || routeRes.geometry_source === 'osrm');

    // Terminal coordinates should match physical entities
    const firstCoord = routeRes.coordinate_path[0];
    const lastCoord = routeRes.coordinate_path[routeRes.coordinate_path.length - 1];
    assert.ok(Math.abs(firstCoord[0] - bin.latitude) < 0.001);
    assert.ok(Math.abs(firstCoord[1] - bin.longitude) < 0.001);
    assert.ok(Math.abs(lastCoord[0] - facility.latitude) < 0.001);
    assert.ok(Math.abs(lastCoord[1] - facility.longitude) < 0.001);

    // No duplicate consecutive coordinates along the path
    for (let i = 0; i < routeRes.coordinate_path.length - 1; i++) {
      const c1 = routeRes.coordinate_path[i];
      const c2 = routeRes.coordinate_path[i + 1];
      const isIdentical = c1[0] === c2[0] && c1[1] === c2[1];
      assert.strictEqual(isIdentical, false, `Duplicate coordinate detected at index ${i}`);
    }
  });

  // 20. Road-Following Geometry: Dense Drivable Coordinates & Street Summaries
  await test('Road-Following Geometry: Dense Drivable Coordinates & Street Summaries', async () => {
    const res = await dsaService.getShortestPath('N-PAN', 'N-COL', false);
    assert.strictEqual(res.reachable, true);
    assert.strictEqual(res.geometry_source, 'osrm');
    assert.strictEqual(res.is_approximate, false);
    assert.strictEqual(res.routing_provider, 'OSRM (OpenStreetMap Road Network)');
    assert.ok(res.coordinate_path.length > res.node_path.length * 5, `Expected dense geometry, got ${res.coordinate_path.length} coords for ${res.node_path.length} nodes`);
    assert.ok(res.legs.length >= 1);
    assert.ok(res.legs[0].summary && res.legs[0].summary.length > 0);
    for (const [lat, lng] of res.coordinate_path) {
      assert.ok(lat >= 19.8 && lat <= 20.2, `Latitude out of bounds: ${lat}`);
      assert.ok(lng >= 73.6 && lng <= 74.0, `Longitude out of bounds: ${lng}`);
    }
  });

  // 21. C++ Authoritative Roadblock Avoidance Forces Detour
  await test('C++ Dijkstra Authoritative Roadblock Avoidance & Detour Generation', async () => {
    const edge = await prisma.roadEdge.findFirst({
      where: {
        OR: [
          { sourceNodeId: 'N-ABB', targetNodeId: 'N-CAN' },
          { sourceNodeId: 'N-CAN', targetNodeId: 'N-ABB' },
        ],
      },
    });
    assert.ok(edge, 'Edge between N-ABB and N-CAN must exist');

    try {
      await prisma.roadEdge.update({
        where: { id: edge.id },
        data: { isBlocked: true },
      });

      const detourRes = await dsaService.getShortestPath('N-ABB', 'N-CBS', false, true);
      assert.strictEqual(detourRes.reachable, true);
      const directUsed = detourRes.node_path.some((n, idx) => {
        const next = detourRes.node_path[idx + 1];
        return (n === 'N-ABB' && next === 'N-CAN') || (n === 'N-CAN' && next === 'N-ABB');
      });
      assert.strictEqual(directUsed, false, 'Route must not traverse blocked edge');
      assert.ok(detourRes.coordinate_path.length > 0);
    } finally {
      await prisma.roadEdge.update({
        where: { id: edge.id },
        data: { isBlocked: false },
      });
    }
  });

  // 22. C++ Dijkstra One-Way Road Rule Enforcement
  await test('C++ Dijkstra One-Way Road Rule Enforcement', async () => {
    const edge = await prisma.roadEdge.findFirst({
      where: { sourceNodeId: 'N-CAN', targetNodeId: 'N-ABB' },
    });
    assert.ok(edge);

    try {
      await prisma.roadEdge.update({
        where: { id: edge.id },
        data: { oneWay: true },
      });

      // Forward direction (N-CAN -> N-ABB) along one-way edge must succeed
      const fwd = await dsaService.getShortestPath('N-CAN', 'N-ABB', false);
      assert.strictEqual(fwd.reachable, true);
      assert.strictEqual(fwd.node_path[0], 'N-CAN');
      assert.strictEqual(fwd.node_path[fwd.node_path.length - 1], 'N-ABB');

      // Reverse direction (N-ABB -> N-CAN) must NOT traverse direct backward step on this one-way edge
      const rev = await dsaService.getShortestPath('N-ABB', 'N-CAN', false);
      if (rev.reachable) {
        const backwardDirect = rev.node_path.some((n, idx) => n === 'N-ABB' && rev.node_path[idx + 1] === 'N-CAN');
        assert.strictEqual(backwardDirect, false, 'One-way restriction violated: traversed against one-way flow');
      }
    } finally {
      await prisma.roadEdge.update({
        where: { id: edge.id },
        data: { oneWay: false },
      });
    }
  });

  // 23. Graceful Fallback on OSRM Provider Failure / Timeout
  await test('Graceful Fallback on OSRM Provider Failure or Offline', async () => {
    const prevEnabled = process.env.OSRM_ENABLED;
    try {
      process.env.OSRM_ENABLED = 'false';
      const fallbackRes = await dsaService.getShortestPath('N-ABB', 'N-CBS', false);
      assert.strictEqual(fallbackRes.reachable, true);
      assert.strictEqual(fallbackRes.is_approximate, true);
      assert.strictEqual(fallbackRes.geometry_source, 'graph_nodes_approximate_fallback');
      assert.ok(fallbackRes.routing_message && fallbackRes.routing_message.includes('approximate'));
      assert.strictEqual(fallbackRes.distance_meters, fallbackRes.graph_distance_meters);
      assert.strictEqual(fallbackRes.coordinate_path.length, fallbackRes.intermediateNodes.length);
    } finally {
      process.env.OSRM_ENABLED = prevEnabled;
    }
  });

  // 24. Inaccessible Destination Error Handling
  await test('Inaccessible or Disconnected Node Handling', async () => {
    const res = await dsaService.getShortestPath('N-PAN', 'UNKNOWN_NODE_999', false);
    assert.strictEqual(res.reachable, false);
    assert.ok(res.error && res.error.length > 0);
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
