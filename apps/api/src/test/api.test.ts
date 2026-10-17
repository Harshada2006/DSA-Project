import { dsaService } from '../services/dsaService';
import { binService } from '../services/binService';
import { complaintService } from '../services/complaintService';
import { dashboardService } from '../services/dashboardService';
import { predictionService } from '../services/predictionService';
import { prisma } from '../database/client';

async function runApiTests() {
  console.log('====================================================');
  console.log('       ECO COLLECT API INTEGRATION TEST SUITE       ');
  console.log('====================================================');

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✗ ${name} FAILED:`, err.message);
      failed++;
    }
  }

  // 1. C++ Engine Health
  await test('C++ Engine Health Verification', async () => {
    const health = await dsaService.getEngineHealth();
    if (!health.success) throw new Error(`C++ health check failed: ${health.error}`);
    if (health.data?.status !== 'healthy') throw new Error('Expected status to be healthy');
  });

  // 2. Dashboard Summary
  await test('Dashboard Summary Metrics', async () => {
    const summary = await dashboardService.getSummary();
    if (summary.totalRegisteredBins <= 0) throw new Error('Expected totalRegisteredBins > 0');
    if (summary.wardSummaries.length !== 6) throw new Error(`Expected 6 wards, got ${summary.wardSummaries.length}`);
    if (!summary.activeVehiclesCount) throw new Error('Missing activeVehiclesCount');
  });

  // 3. Bin Service
  await test('Bin Listing and Filtering', async () => {
    const res = await binService.listBins({ limit: 10 });
    if (res.bins.length === 0) throw new Error('No bins returned');
    if (res.pagination.total < 20) throw new Error(`Expected at least 20 bins, got ${res.pagination.total}`);
  });

  // 4. C++ Priority Queue Execution
  await test('C++ Max-Heap Priority Task Ranking', async () => {
    const result = await dsaService.getPrioritizedTasks({ limit: 5 });
    if (!result.tasks || result.tasks.length === 0) throw new Error('No tasks returned from C++ engine');
    // Verify tasks are ordered by priorityScore descending
    for (let i = 0; i < result.tasks.length - 1; i++) {
      if (result.tasks[i].priorityScore < result.tasks[i + 1].priorityScore) {
        throw new Error('Tasks not sorted in descending priority order');
      }
    }
  });

  // 5. C++ Route Optimization
  await test('C++ Route Optimization & Dijkstra Path Reconstruction', async () => {
    const allBins = await binService.listBins({ limit: 3 });
    const binIds = allBins.bins.slice(0, 3).map(b => b.id);
    const vehicle = await prisma.vehicle.findFirst();
    if (!vehicle) throw new Error('No vehicle found in database');

    const depot = {
      id: 'depot-panchavati',
      name: 'Central Municipal Solid Waste Depot (Panchavati)',
      latitude: 20.0210,
      longitude: 73.8015,
    };

    const route = await dsaService.optimizeRoute({
      startingDepot: depot,
      vehicleId: vehicle.id,
      binIds,
      objective: 'distance',
    });

    if (route.orderedStops.length < 3) throw new Error('Expected at least 3 stops (depot + bins + depot return)');
    if (route.totalDistanceKm <= 0) throw new Error('Expected positive route distance');
    if (route.pathCoordinates.length < 2) throw new Error('Expected coordinate path from Dijkstra');
  });

  // 6. ML & Baseline Predictions
  await test('Fill Predictions & Edge Case Handling', async () => {
    const predictions = await predictionService.predictBins();
    if (predictions.length === 0) throw new Error('No predictions generated');
    const first = predictions[0];
    if (first.predictedFill24h < 0 || first.predictedFill24h > 100) throw new Error('Predicted fill out of bounds (0-100)');
    if (first.timeToThresholdHours < 0) throw new Error('timeToThresholdHours cannot be negative');
  });

  // 7. Complaint Lifecycle
  await test('Complaint Creation & Ticket Generation', async () => {
    const wards = await dashboardService.getSummary();
    const wardId = wards.wardSummaries[0].wardId;

    const complaint = await complaintService.createComplaint({
      category: 'overflow',
      description: 'Test municipal overflow report for automated test suite',
      wardId,
      latitude: 20.005,
      longitude: 73.795,
      severity: 'high',
      reportedBy: 'Automated Tester',
    });

    if (!complaint.ticketNo.startsWith('TCK-')) throw new Error('Invalid ticket number format');
    if (complaint.status !== 'open') throw new Error('Expected initial status to be open');
  });

  console.log('====================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runApiTests().catch((e) => {
  console.error('Test suite error:', e);
  process.exit(1);
});
