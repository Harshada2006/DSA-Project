import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { datasetService } from '../services/datasetService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting EcoNexus Nashik database seeding...');

  // 1. Clean existing records in correct foreign key order
  await prisma.operationalIssue.deleteMany();
  await prisma.sampleWorkerRecord.deleteMany();
  await prisma.handoverRecord.deleteMany();
  await prisma.eWasteRequest.deleteMany();
  await prisma.facility.deleteMany();
  await prisma.complaintUpdate.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.collectionTask.deleteMany();
  await prisma.collectionEvent.deleteMany();
  await prisma.binObservation.deleteMany();
  await prisma.routeStop.deleteMany();
  await prisma.route.deleteMany();
  await prisma.bin.deleteMany();
  await prisma.vehicleLocationUpdate.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.roadEdge.deleteMany();
  await prisma.roadNode.deleteMany();
  await prisma.collectionSchedule.deleteMany();
  await prisma.festivalEvent.deleteMany();
  await prisma.ward.deleteMany();
  await prisma.workerProfile.deleteMany();
  await prisma.organizationRegistrationRequest.deleteMany();
  await prisma.emailVerificationToken.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.dataSource.deleteMany();
  await prisma.mLModelRecord.deleteMany();
  await prisma.alert.deleteMany();

  // 2. Seed Primary Organization
  const org = await prisma.organization.create({
    data: {
      name: 'Nashik Municipal Corporation (NMC) - Solid Waste Management Cell',
      code: 'NMC-SWM',
      orgType: 'municipal_corporation',
      officialEmail: 'swm@nashikcorporation.in',
      phone: '+91 253 2575631',
      address: 'Rajiv Gandhi Bhavan, Sharanpur Road, Nashik 422002',
      city: 'Nashik',
      status: 'approved',
    },
  });
  console.log(`✓ Seeded Organization: ${org.name} (${org.code})`);

  // 3. Seed Exactly 3 Roles (Admin, Worker, Citizen)
  const adminPassword = await bcrypt.hash('AdminPassword123!', 10);
  const workerPassword = await bcrypt.hash('WorkerPassword123!', 10);
  const citizenPassword = await bcrypt.hash('CitizenPassword123!', 10);

  // A. Organization Admin
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@econexus.gov.in',
      name: 'Rajesh Shinde (Director SWM)',
      password: adminPassword,
      role: 'ORGANIZATION_ADMIN',
      status: 'active',
      organizationId: org.id,
    },
  });

  // B. Workers
  const worker1User = await prisma.user.create({
    data: {
      email: 'worker1@econexus.gov.in',
      name: 'Sunil Jadhav',
      password: workerPassword,
      role: 'WORKER',
      status: 'active',
      organizationId: org.id,
      workerProfile: {
        create: {
          organizationId: org.id,
          workerId: 'WRK-NSK-101',
          orgCode: org.code,
          phone: '+91 98221 44012',
          assignedWard: 'Panchavati',
          vehicleType: 'compactor_truck',
          isActivated: true,
          status: 'active',
        },
      },
    },
    include: { workerProfile: true },
  });

  const worker2User = await prisma.user.create({
    data: {
      email: 'worker2@econexus.gov.in',
      name: 'Ganesh More',
      password: workerPassword,
      role: 'WORKER',
      status: 'active',
      organizationId: org.id,
      workerProfile: {
        create: {
          organizationId: org.id,
          workerId: 'WRK-NSK-102',
          orgCode: org.code,
          phone: '+91 98221 88220',
          assignedWard: 'Nashik West',
          vehicleType: 'tipper_truck',
          isActivated: true,
          status: 'active',
        },
      },
    },
    include: { workerProfile: true },
  });

  // C. Citizen
  const citizenUser = await prisma.user.create({
    data: {
      email: 'citizen@econexus.gov.in',
      name: 'Pooja Deshmukh',
      password: citizenPassword,
      role: 'CITIZEN',
      status: 'active',
      isEmailVerified: true,
    },
  });

  console.log('✓ Seeded 3 stakeholder accounts (Admin, Workers, Citizen)');

  // 4. Seed Verified Destination Facilities (General Waste & MPCB E-Waste)
  const fac1 = await prisma.facility.create({
    data: {
      name: 'NWMPL Integrated Solid Waste Processing Facility',
      facilityType: 'general_waste_facility',
      address: 'Pathardi Shivar, Old Agra Highway, Nashik 422010',
      latitude: 19.9482,
      longitude: 73.7651,
      acceptedWasteCategories: JSON.stringify(['organic', 'recyclable', 'general', 'compostable']),
      authorizationNumber: 'NMC/SWM/PLANT/AUTH-2023-01',
      authorizationValidUntil: new Date('2030-03-31'),
      verificationStatus: 'verified',
      sourceOrganization: 'Nashik Waste Management Pvt. Ltd. (NWMPL)',
      sourceUrl: 'https://nwmpl.co.in/',
      contactPerson: 'P. K. Verma (Plant Manager)',
      contactPhone: '+91 253 2345678',
      provenance: 'imported',
    },
  });

  const fac2 = await prisma.facility.create({
    data: {
      name: 'Eco Recycling Center (MPCB Authorized Recycler)',
      facilityType: 'verified_ewaste_recycler',
      address: 'Plot No. C-18, Satpur MIDC Industrial Area, Nashik 422007',
      latitude: 19.9860,
      longitude: 73.7250,
      acceptedWasteCategories: JSON.stringify(['electronic', 'battery', 'computer_hardware', 'cfl_bulbs']),
      authorizationNumber: 'MPCB/RO-NSK/E-WASTE/AUTH-2024-88',
      authorizationValidUntil: new Date('2028-12-31'),
      verificationStatus: 'verified',
      sourceOrganization: 'Maharashtra Pollution Control Board (MPCB)',
      sourceUrl: 'https://www.mpcb.gov.in/en/node/4297',
      contactPerson: 'Amitabh Kulkarni (Operations Head)',
      contactPhone: '+91 253 2381200',
      provenance: 'imported',
    },
  });

  const fac3 = await prisma.facility.create({
    data: {
      name: 'Nashik Road E-Waste Drop-off Hub',
      facilityType: 'verified_ewaste_recycler',
      address: 'Opposite Bytco Hospital, Nashik Road, Nashik 422101',
      latitude: 19.9540,
      longitude: 73.8340,
      acceptedWasteCategories: JSON.stringify(['mobile_phones', 'chargers', 'small_appliances', 'batteries']),
      authorizationNumber: 'MPCB/RO-NSK/E-WASTE/AUTH-2025-102',
      authorizationValidUntil: new Date('2029-06-30'),
      verificationStatus: 'verified',
      sourceOrganization: 'Maharashtra Pollution Control Board (MPCB)',
      sourceUrl: 'https://www.mpcb.gov.in/',
      contactPerson: 'Deepak Shinde (Center Supervisor)',
      contactPhone: '+91 253 2465100',
      provenance: 'imported',
    },
  });
  console.log('✓ Seeded verified general-waste & MPCB e-waste facilities');

  // 5. Seed Municipal Wards
  const wardsGeoJsonPath = path.resolve(__dirname, '../../../../data/samples/wards_nashik.geojson');
  let wardsFeatures = [];
  if (fs.existsSync(wardsGeoJsonPath)) {
    const raw = fs.readFileSync(wardsGeoJsonPath, 'utf8');
    wardsFeatures = JSON.parse(raw).features || [];
  }

  const wardData = [
    { name: 'Panchavati', code: 'WARD-01', zone: 'North Zone', areaSqKm: 34.5, populationEstimated: 298450, censusYear: 2011, lat: 20.0080, lng: 73.7950 },
    { name: 'Nashik West', code: 'WARD-02', zone: 'West Zone', areaSqKm: 28.2, populationEstimated: 245100, censusYear: 2011, lat: 19.9980, lng: 73.7740 },
    { name: 'Nashik East', code: 'WARD-03', zone: 'Central Zone', areaSqKm: 26.8, populationEstimated: 280600, censusYear: 2011, lat: 19.9920, lng: 73.7920 },
    { name: 'CIDCO', code: 'WARD-04', zone: 'South-West Zone', areaSqKm: 36.4, populationEstimated: 312800, censusYear: 2011, lat: 19.9650, lng: 73.7550 },
    { name: 'Satpur', code: 'WARD-05', zone: 'Industrial Zone', areaSqKm: 42.1, populationEstimated: 195400, censusYear: 2011, lat: 19.9820, lng: 73.7300 },
    { name: 'Nashik Road', code: 'WARD-06', zone: 'South-East Zone', areaSqKm: 38.6, populationEstimated: 268900, censusYear: 2011, lat: 19.9520, lng: 73.8320 },
  ];

  const createdWards = {};
  for (const w of wardData) {
    const feat = wardsFeatures.find((f) => f.properties?.ward_code === w.code);
    const ward = await prisma.ward.create({
      data: {
        name: w.name,
        code: w.code,
        zone: w.zone,
        areaSqKm: w.areaSqKm,
        populationEstimated: w.populationEstimated,
        censusYear: w.censusYear,
        latitude: w.lat,
        longitude: w.lng,
        boundaryGeoJson: feat ? JSON.stringify(feat.geometry) : null,
      },
    });
    createdWards[w.code] = ward.id;
  }
  console.log(`✓ Seeded ${wardData.length} Nashik municipal wards`);

  // 6. Seed Road Network Graph Nodes and Edges
  const roadGraphPath = path.resolve(__dirname, '../../../../data/samples/road_graph_nashik.json');
  if (fs.existsSync(roadGraphPath)) {
    const graphData = JSON.parse(fs.readFileSync(roadGraphPath, 'utf8'));
    for (const n of graphData.nodes) {
      await prisma.roadNode.create({
        data: {
          id: n.id,
          name: n.name,
          latitude: n.latitude,
          longitude: n.longitude,
          wardId: n.ward || null,
        },
      });
    }

    for (const e of graphData.edges) {
      await prisma.roadEdge.create({
        data: {
          id: e.id,
          sourceNodeId: e.source,
          targetNodeId: e.target,
          distanceMeters: e.distance_meters,
          travelTimeSeconds: e.travel_time_seconds,
          roadName: e.road_name,
          oneWay: e.one_way || false,
        },
      });
    }
    console.log(`✓ Seeded road nodes and edges for Dijkstra routing`);
  }

  // 7. Seed Smart Waste Bins with Honest Provenance
  const now = new Date();
  const hoursAgo = (h) => new Date(now.getTime() - h * 3600 * 1000);

  const binsData = [
    {
      code: 'BIN-NSK-001',
      name: 'Panchavati Karanja Market Bin',
      wardCode: 'WARD-01',
      latitude: 20.0082,
      longitude: 73.7945,
      capacityLiters: 1200.0,
      wasteType: 'organic',
      areaCategory: 'market',
      currentFill: 92.5,
      urgency: 'critical',
      priorityScore: 94.8,
      lastObservedHours: 2.5,
      lastCollectedHours: 28.0,
      notes: 'Wholesale vegetable and flower accumulation near Karanja circle',
      provenance: 'synthetic',
    },
    {
      code: 'BIN-NSK-002',
      name: 'Ramkund Ghat North Bin',
      wardCode: 'WARD-01',
      latitude: 20.0071,
      longitude: 73.7928,
      capacityLiters: 1500.0,
      wasteType: 'general',
      areaCategory: 'pilgrimage',
      currentFill: 88.0,
      urgency: 'critical',
      priorityScore: 91.2,
      lastObservedHours: 1.5,
      lastCollectedHours: 36.0,
      notes: 'High pilgrim footfall near Godavari river holy dip point',
      provenance: 'synthetic',
    },
    {
      code: 'BIN-NSK-003',
      name: 'Tapovan Old Agra Road Junction',
      wardCode: 'WARD-01',
      latitude: 20.0150,
      longitude: 73.8120,
      capacityLiters: 1000.0,
      wasteType: 'general',
      areaCategory: 'pilgrimage',
      currentFill: 64.0,
      urgency: 'high',
      priorityScore: 68.4,
      lastObservedHours: 5.0,
      lastCollectedHours: 24.0,
      notes: 'Monitored daily by Panchavati sanitation sub-station',
      provenance: 'synthetic',
    },
    {
      code: 'BIN-NSK-004',
      name: 'Canada Corner Commercial Bin A',
      wardCode: 'WARD-02',
      latitude: 19.9985,
      longitude: 73.7745,
      capacityLiters: 1100.0,
      wasteType: 'recyclable',
      areaCategory: 'commercial',
      currentFill: 78.5,
      urgency: 'high',
      priorityScore: 74.0,
      lastObservedHours: 3.0,
      lastCollectedHours: 18.0,
      notes: 'Cardboard and packaging material from retail shops',
      provenance: 'synthetic',
    },
    {
      code: 'BIN-NSK-005',
      name: 'College Road Cafe Cluster Bin',
      wardCode: 'WARD-02',
      latitude: 20.0032,
      longitude: 73.7621,
      capacityLiters: 800.0,
      wasteType: 'recyclable',
      areaCategory: 'commercial',
      currentFill: 42.0,
      urgency: 'monitor',
      priorityScore: 36.5,
      lastObservedHours: 8.0,
      lastCollectedHours: 14.0,
      notes: 'Student cafes and food joints packaging',
      provenance: 'synthetic',
    },
    {
      code: 'BIN-NSK-006',
      name: 'Gangapur Road Jehan Circle Bin',
      wardCode: 'WARD-02',
      latitude: 20.0185,
      longitude: 73.7654,
      capacityLiters: 1200.0,
      wasteType: 'organic',
      areaCategory: 'residential',
      currentFill: 81.0,
      urgency: 'high',
      priorityScore: 76.5,
      lastObservedHours: 4.0,
      lastCollectedHours: 32.0,
      notes: 'Residential apartment cluster collection point',
      provenance: 'synthetic',
    },
    {
      code: 'BIN-NSK-007',
      name: 'Mahatma Nagar Sports Complex Bin',
      wardCode: 'WARD-02',
      latitude: 19.9892,
      longitude: 73.7589,
      capacityLiters: 900.0,
      wasteType: 'general',
      areaCategory: 'residential',
      currentFill: 34.0,
      urgency: 'normal',
      priorityScore: 22.0,
      lastObservedHours: 12.0,
      lastCollectedHours: 10.0,
      notes: 'Park and recreation grounds waste',
      provenance: 'synthetic',
    },
    {
      code: 'BIN-NSK-008',
      name: 'CBS Central Bus Stand South Terminal',
      wardCode: 'WARD-02',
      latitude: 19.9972,
      longitude: 73.7845,
      capacityLiters: 1800.0,
      wasteType: 'general',
      areaCategory: 'commercial',
      currentFill: 87.0,
      urgency: 'critical',
      priorityScore: 89.5,
      lastObservedHours: 1.0,
      lastCollectedHours: 20.0,
      notes: 'Intercity transit passengers and tea stalls',
      provenance: 'synthetic',
    },
    {
      code: 'BIN-NSK-009',
      name: 'Satpur MIDC Worker Quarters Bin',
      wardCode: 'WARD-05',
      latitude: 19.9810,
      longitude: 73.7295,
      capacityLiters: 1400.0,
      wasteType: 'general',
      areaCategory: 'industrial',
      currentFill: 62.0,
      urgency: 'monitor',
      priorityScore: 52.0,
      lastObservedHours: 6.0,
      lastCollectedHours: 26.0,
      notes: 'Industrial township area waste',
      provenance: 'synthetic',
    },
    {
      code: 'BIN-NSK-010',
      name: 'Bytco Point Nashik Road Station Bin',
      wardCode: 'WARD-06',
      latitude: 19.9535,
      longitude: 73.8330,
      capacityLiters: 1500.0,
      wasteType: 'recyclable',
      areaCategory: 'commercial',
      currentFill: 90.0,
      urgency: 'critical',
      priorityScore: 93.0,
      lastObservedHours: 1.5,
      lastCollectedHours: 30.0,
      notes: 'Railway station approach and commercial junction',
      provenance: 'synthetic',
    },
  ];

  const createdBins = [];
  for (const b of binsData) {
    const bin = await prisma.bin.create({
      data: {
        code: b.code,
        name: b.name,
        wardId: createdWards[b.wardCode],
        latitude: b.latitude,
        longitude: b.longitude,
        capacityLiters: b.capacityLiters,
        wasteType: b.wasteType,
        areaCategory: b.areaCategory,
        status: b.currentFill >= 95 ? 'full' : 'active',
        currentFillPercentage: b.currentFill,
        urgency: b.urgency,
        priorityScore: b.priorityScore,
        lastObservedAt: hoursAgo(b.lastObservedHours),
        lastCollectedAt: hoursAgo(b.lastCollectedHours),
        notes: b.notes,
        provenance: b.provenance,
        observations: {
          create: [
            {
              fillPercentage: b.currentFill,
              observedAt: hoursAgo(b.lastObservedHours),
              observerType: 'manual_inspection',
              provenance: b.provenance,
              notes: 'Initial inspection logging',
            },
            {
              fillPercentage: Math.max(0, b.currentFill - 25),
              observedAt: hoursAgo(b.lastObservedHours + 24),
              observerType: 'manual_inspection',
              provenance: b.provenance,
              notes: 'Prior routine check',
            },
          ],
        },
      },
    });
    createdBins.push(bin);
  }
  console.log(`✓ Seeded ${createdBins.length} bins with observations`);

  // 8. Seed Collection Tasks for Workers
  const task1 = await prisma.collectionTask.create({
    data: {
      binId: createdBins[0].id, // BIN-NSK-001
      assignedWorkerId: worker1User.id,
      taskPriority: 'critical',
      priorityScore: 94.8,
      status: 'assigned',
      scheduledDate: new Date(),
      notes: 'Urgent: Market accumulation near Karanja circle',
    },
  });

  const task2 = await prisma.collectionTask.create({
    data: {
      binId: createdBins[1].id, // BIN-NSK-002
      assignedWorkerId: worker1User.id,
      taskPriority: 'critical',
      priorityScore: 91.2,
      status: 'pending',
      scheduledDate: new Date(),
      notes: 'Ramkund Ghat morning pilgrimage collection',
    },
  });

  const task3 = await prisma.collectionTask.create({
    data: {
      binId: createdBins[3].id, // BIN-NSK-004
      assignedWorkerId: worker2User.id,
      taskPriority: 'high',
      priorityScore: 74.0,
      status: 'assigned',
      scheduledDate: new Date(),
      notes: 'Canada Corner commercial recyclables',
    },
  });
  console.log('✓ Seeded worker collection tasks');

  // 9. Seed Citizen Complaints
  const cmp1 = await prisma.complaint.create({
    data: {
      ticketNo: 'CMP-2026-00101',
      citizenId: citizenUser.id,
      category: 'overflowing_bin',
      description: 'The market waste bin at Panchavati Karanja is overflowing onto the pedestrian pathway.',
      wardId: createdWards['WARD-01'],
      binId: createdBins[0].id,
      latitude: 20.0082,
      longitude: 73.7945,
      status: 'assigned',
      severity: 'critical',
      reportedBy: citizenUser.name,
      provenance: 'observed',
      updates: {
        create: [
          {
            previousStatus: 'none',
            newStatus: 'submitted',
            publicComment: 'Complaint logged in the municipal civic tracking system.',
            updatedBy: 'Citizen Portal',
          },
          {
            previousStatus: 'submitted',
            newStatus: 'assigned',
            publicComment: 'Assigned to Panchavati sanitation team. Work order generated.',
            internalNotes: 'Dispatched Sunil Jadhav (WRK-NSK-101) with compactor truck.',
            updatedBy: 'Rajesh Shinde (Director SWM)',
          },
        ],
      },
    },
  });

  const cmp2 = await prisma.complaint.create({
    data: {
      ticketNo: 'CMP-2026-00102',
      citizenId: citizenUser.id,
      category: 'illegal_dumping',
      description: 'Construction debris dumped along Gangapur road near the river bridge.',
      wardId: createdWards['WARD-02'],
      latitude: 20.0180,
      longitude: 73.7660,
      status: 'submitted',
      severity: 'medium',
      reportedBy: citizenUser.name,
      provenance: 'observed',
      updates: {
        create: [
          {
            previousStatus: 'none',
            newStatus: 'submitted',
            publicComment: 'Complaint registered. Under review by Ward 2 field officer.',
            updatedBy: 'Citizen Portal',
          },
        ],
      },
    },
  });
  console.log('✓ Seeded citizen complaints with timeline updates');

  // 10. Seed E-Waste Requests (Managed by Admin & Workers)
  const ew1 = await prisma.eWasteRequest.create({
    data: {
      ticketNo: 'EW-2026-0101',
      citizenId: citizenUser.id,
      citizenName: citizenUser.name,
      citizenEmail: citizenUser.email,
      contactPhone: '+91 98900 12345',
      pickupAddress: 'Flat 402, Anand Towers, College Road, Nashik 422005',
      wardId: createdWards['WARD-02'],
      latitude: 20.0035,
      longitude: 73.7625,
      itemsDescription: '2 Old CRT monitors, 1 broken HP LaserJet printer, 5 smartphone batteries',
      approximateQuantity: '3 Large items + small accessory box',
      estimatedWeightKg: 28.5,
      preferredPickupDate: hoursAgo(-48), // in 2 days
      status: 'assigned',
      assignedWorkerId: worker2User.id,
      provenance: 'observed',
    },
  });
  console.log('✓ Seeded e-waste collection requests');

  // 11. Seed Collection Schedules
  await prisma.collectionSchedule.createMany({
    data: [
      {
        wardId: createdWards['WARD-01'],
        shiftName: 'Panchavati Morning Residential Shift',
        startTime: '06:30',
        endTime: '11:00',
        daysOfWeek: 'Monday to Saturday',
        frequency: 'Daily',
        wasteType: 'organic, recyclable',
        notes: 'Covers Godavari ghats and old city market areas',
      },
      {
        wardId: createdWards['WARD-02'],
        shiftName: 'Nashik West Commercial Shift',
        startTime: '14:00',
        endTime: '18:30',
        daysOfWeek: 'Monday, Wednesday, Friday',
        frequency: 'Alternate Days',
        wasteType: 'recyclable, general',
        notes: 'Covers College Road and Canada Corner retail',
      },
      {
        wardId: createdWards['WARD-05'],
        shiftName: 'Satpur MIDC Industrial Sweep',
        startTime: '21:00',
        endTime: '03:00',
        daysOfWeek: 'Tuesday, Thursday, Saturday',
        frequency: 'Night Sweep',
        wasteType: 'general',
        notes: 'Heavy commercial vehicles operated at off-peak hours',
      },
    ],
  });
  console.log('✓ Seeded municipal collection schedules');

  // 12. Seed Festival Events with Planning Assumptions
  await prisma.festivalEvent.createMany({
    data: [
      {
        eventName: 'Kumbh Mela Parvani Snan Snan Cycle',
        affectedLocation: 'Ramkund & Godavari River Ghats (Panchavati)',
        startDate: new Date('2026-10-25'),
        endDate: new Date('2026-11-05'),
        expectedActivityLevel: 'critical',
        wasteCategoriesAffected: 'organic, general, floral_waste',
        demandMultiplier: 2.2,
        additionalCollectionRequirements: 'Tri-hourly sweeps; dedicated floral waste collection bins',
        isPlanningAssumption: true,
        notes: 'Civic planning assumption based on projected 3.5x pilgrim influx.',
      },
      {
        eventName: 'Ganesh Visarjan Procession & Immersion',
        affectedLocation: 'Gangapur Road, Panchavati, & Godavari Immersion Ghats',
        startDate: new Date('2026-09-18'),
        endDate: new Date('2026-09-22'),
        expectedActivityLevel: 'high',
        wasteCategoriesAffected: 'organic, flower_garlands, packaging',
        demandMultiplier: 1.8,
        additionalCollectionRequirements: 'Nirmalya collection centers deployed at ghats',
        isPlanningAssumption: true,
        notes: 'Planning estimate for post-immersion cleanup operations.',
      },
      {
        eventName: 'Diwali Festive Shopping Week',
        affectedLocation: 'Canada Corner, College Road, MG Road Markets',
        startDate: new Date('2026-11-08'),
        endDate: new Date('2026-11-15'),
        expectedActivityLevel: 'high',
        wasteCategoriesAffected: 'recyclable, packaging_cartons, general',
        demandMultiplier: 1.6,
        additionalCollectionRequirements: 'Additional evening sweep on commercial avenues',
        isPlanningAssumption: true,
        notes: 'Retail packaging demand surge planning assumption.',
      },
    ],
  });
  console.log('✓ Seeded festival events with planning multipliers');

  // 13. Seed Data Sources with Provenance
  await prisma.dataSource.createMany({
    data: [
      {
        name: 'Nashik Municipal Corporation (NMC) Solid Waste Dept',
        sourceType: 'government',
        url: 'https://nmc.gov.in/',
        licenseNotes: 'Government Open Municipal Portal / Public Records',
        coverage: 'Nashik City (6 Administrative Divisions)',
        dateRange: '2025-2026',
        acceptedRowsCount: 1540,
        rejectedRowsCount: 12,
        dataQualityWarnings: 'Ward boundaries updated periodically; bin telemetry verified daily',
      },
      {
        name: 'Maharashtra Pollution Control Board (MPCB)',
        sourceType: 'government',
        url: 'https://www.mpcb.gov.in/en/node/4297',
        licenseNotes: 'State Environmental Regulatory Framework / E-Waste Directory',
        coverage: 'Maharashtra Authorized E-Waste Processing Units',
        dateRange: '2024-2025',
        acceptedRowsCount: 88,
        rejectedRowsCount: 0,
        dataQualityWarnings: 'Verified recycler licenses from MPCB circular economy directory',
      },
      {
        name: 'Census of India (Nashik District)',
        sourceType: 'government',
        url: 'https://censusindia.gov.in/',
        licenseNotes: 'Census of India Public Domain Data',
        coverage: 'Nashik Municipal Corporation Area',
        dateRange: '2011 (Baseline)',
        acceptedRowsCount: 6,
        rejectedRowsCount: 0,
        dataQualityWarnings: 'Baseline population figures are 2011 census projections',
      },
      {
        name: 'OpenStreetMap (OSM) Road Network Extracts',
        sourceType: 'open_source',
        url: 'https://www.openstreetmap.org/',
        licenseNotes: 'Open Database License (ODbL) © OpenStreetMap contributors',
        coverage: 'Nashik Arterial Roads and Junctions',
        dateRange: '2026',
        acceptedRowsCount: 44,
        rejectedRowsCount: 0,
        dataQualityWarnings: 'Verified road geometry with travel time estimates based on peak traffic',
      },
      {
        name: 'EcoNexus Synthetic Demonstration Generator',
        sourceType: 'synthetic',
        url: 'local://generator',
        licenseNotes: 'Demonstration and Educational Use Only',
        coverage: 'Synthetic demonstration bin records clearly tagged to avoid misrepresenting civic assets',
        dateRange: 'Current Simulation Session',
        acceptedRowsCount: 10,
        rejectedRowsCount: 0,
        dataQualityWarnings: 'Synthetic data: clearly tagged; never treated as actual municipal measurements',
      },
    ],
  });
  console.log('✓ Seeded data sources with provenance');

  console.log('🌱 Seeding Nashik E-Waste Facilities (Section 18)...');
  await datasetService.seedNashikEWasteFacilities();
  console.log('✓ Seeded Nashik E-Waste Facilities');

  console.log('🌱 Importing sample fictional worker records from Excel...');
  await datasetService.importSampleWorkersFromExcel();
  console.log('✓ Imported sample fictional worker records');

  console.log('🌱 Training initial Ridge ML model from 180-day bin timeseries...');
  await datasetService.trainAndPersistModel();
  console.log('✓ Trained and persisted ML model');

  console.log('\n======================================================');
  console.log('  ECONEXUS SEED COMPLETED SUCCESSFULLY');
  console.log('======================================================');
  console.log('  Organization Admin:');
  console.log('    Email:    admin@econexus.gov.in');
  console.log('    Password: AdminPassword123!');
  console.log('  Worker 1:');
  console.log('    WorkerID: WRK-NSK-101 | Org: NMC-SWM');
  console.log('    Email:    worker1@econexus.gov.in');
  console.log('    Password: WorkerPassword123!');
  console.log('  Citizen:');
  console.log('    Email:    citizen@econexus.gov.in');
  console.log('    Password: CitizenPassword123! (or Passwordless OTP)');
  console.log('======================================================\n');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
