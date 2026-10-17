import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Eco Collect Nashik database seed...');

  // 1. Clean existing records in correct foreign key order
  await prisma.routeStop.deleteMany();
  await prisma.route.deleteMany();
  await prisma.collectionEvent.deleteMany();
  await prisma.binObservation.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.bin.deleteMany();
  await prisma.vehicleLocationUpdate.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.roadEdge.deleteMany();
  await prisma.roadNode.deleteMany();
  await prisma.ward.deleteMany();
  await prisma.user.deleteMany();
  await prisma.dataSource.deleteMany();
  await prisma.mLModelRecord.deleteMany();

  // 2. Seed Users
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.createMany({
    data: [
      {
        email: 'admin@ecocollect.gov.in',
        name: 'Municipal Solid Waste Director',
        password: hashedPassword,
        role: 'admin',
      },
      {
        email: 'dispatcher@ecocollect.gov.in',
        name: 'Nashik Central Dispatcher',
        password: hashedPassword,
        role: 'dispatcher',
      },
      {
        email: 'driver@ecocollect.gov.in',
        name: 'Sunil Jadhav (Driver)',
        password: hashedPassword,
        role: 'driver',
      },
      {
        email: 'citizen@ecocollect.gov.in',
        name: 'Nashik Citizen',
        password: hashedPassword,
        role: 'citizen',
      },
    ],
  });
  console.log('✓ Seeded default users');

  // 3. Seed Data Sources
  await prisma.dataSource.createMany({
    data: [
      {
        name: 'Nashik Municipal Corporation (NMC) Solid Waste Dept',
        sourceType: 'government',
        url: 'https://www.nmc.gov.in/',
        licenseNotes: 'Government Open Data / Public Municipal Records',
        coverage: 'Nashik City (6 Administrative Divisions)',
        dateRange: '2025-2026',
        acceptedRowsCount: 1540,
        rejectedRowsCount: 12,
        dataQualityWarnings: 'Ward boundaries updated periodically; bin telemetry verified daily',
      },
      {
        name: 'Maharashtra Pollution Control Board (MPCB)',
        sourceType: 'government',
        url: 'https://www.mpcb.gov.in/en/wastes-management/municipal-solid-waste',
        licenseNotes: 'State Environmental Regulatory Framework',
        coverage: 'Maharashtra Solid Waste Processing Units',
        dateRange: '2023-2024',
        acceptedRowsCount: 85,
        rejectedRowsCount: 0,
        dataQualityWarnings: 'Aggregated district statistics; individual bin coordinates not supplied',
      },
      {
        name: 'Census of India (Nashik District)',
        sourceType: 'government',
        url: 'https://censusindia.gov.in/nada/index.php/catalog/6707',
        licenseNotes: 'Census of India Public Domain Data',
        coverage: 'Nashik Municipal Corporation Area',
        dateRange: '2011 (Baseline)',
        acceptedRowsCount: 6,
        rejectedRowsCount: 0,
        dataQualityWarnings: 'Baseline population figures are from 2011 census; current populations are projections',
      },
      {
        name: 'OpenStreetMap (OSM) Road Extracts',
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
        name: 'EcoCollect Simulated Telemetry Generator',
        sourceType: 'synthetic',
        url: 'local://generator',
        licenseNotes: 'Demonstration and Educational Use Only',
        coverage: 'Synthetic telemetry for testing when live GPS is offline',
        dateRange: 'Current Simulation Session',
        acceptedRowsCount: 350,
        rejectedRowsCount: 0,
        dataQualityWarnings: 'Synthetic data: clearly tagged; never treated as actual municipal measurements',
      },
    ],
  });
  console.log('✓ Seeded data sources');

  // 4. Seed Wards
  const wardsGeoJsonPath = path.resolve(__dirname, '..', '..', '..', 'data', 'samples', 'wards_nashik.geojson');
  let wardsFeatures: any[] = [];
  if (fs.existsSync(wardsGeoJsonPath)) {
    const raw = fs.readFileSync(wardsGeoJsonPath, 'utf8');
    wardsFeatures = JSON.parse(raw).features;
  }

  const wardData = [
    { name: 'Panchavati', code: 'WARD-01', zone: 'North Zone', areaSqKm: 34.5, populationEstimated: 298450, censusYear: 2011, lat: 20.0080, lng: 73.7950 },
    { name: 'Nashik West', code: 'WARD-02', zone: 'West Zone', areaSqKm: 28.2, populationEstimated: 245100, censusYear: 2011, lat: 19.9980, lng: 73.7740 },
    { name: 'Nashik East', code: 'WARD-03', zone: 'Central Zone', areaSqKm: 26.8, populationEstimated: 280600, censusYear: 2011, lat: 19.9920, lng: 73.7920 },
    { name: 'CIDCO', code: 'WARD-04', zone: 'South-West Zone', areaSqKm: 36.4, populationEstimated: 312800, censusYear: 2011, lat: 19.9650, lng: 73.7550 },
    { name: 'Satpur', code: 'WARD-05', zone: 'Industrial Zone', areaSqKm: 42.1, populationEstimated: 195400, censusYear: 2011, lat: 19.9820, lng: 73.7300 },
    { name: 'Nashik Road', code: 'WARD-06', zone: 'South-East Zone', areaSqKm: 38.6, populationEstimated: 268900, censusYear: 2011, lat: 19.9520, lng: 73.8320 },
  ];

  const createdWards: Record<string, string> = {};

  for (const w of wardData) {
    const feat = wardsFeatures.find((f: any) => f.properties.ward_code === w.code);
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

  // 5. Seed Road Network Graph Nodes and Edges
  const roadGraphPath = path.resolve(__dirname, '..', '..', '..', 'data', 'samples', 'road_graph_nashik.json');
  if (fs.existsSync(roadGraphPath)) {
    const graphData = JSON.parse(fs.readFileSync(roadGraphPath, 'utf8'));
    for (const n of graphData.nodes) {
      await prisma.roadNode.create({
        data: {
          id: n.id,
          name: n.name,
          latitude: n.latitude,
          longitude: n.longitude,
          wardId: n.ward,
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
    console.log(`✓ Seeded ${graphData.nodes.length} road nodes and ${graphData.edges.length} edges`);
  }

  // 6. Seed Municipal Vehicles
  const vehiclesData = [
    {
      registrationNo: 'MH-15-EG-4401',
      vehicleType: 'compactor_truck',
      capacityKg: 4500.0,
      currentLoadKg: 2100.0,
      driverName: 'Suresh Patil',
      driverPhone: '+91 98221 44012',
      status: 'collecting',
      trackingMode: 'simulated',
      currentLatitude: 20.0075,
      currentLongitude: 73.7935,
      notes: 'Panchavati North Sector Compactor',
      provenance: 'observed',
    },
    {
      registrationNo: 'MH-15-AB-8822',
      vehicleType: 'compactor_truck',
      capacityKg: 4500.0,
      currentLoadKg: 1200.0,
      driverName: 'Ganesh More',
      driverPhone: '+91 98221 88220',
      status: 'en_route',
      trackingMode: 'simulated',
      currentLatitude: 19.9982,
      currentLongitude: 73.7740,
      notes: 'Nashik West / College Road Route',
      provenance: 'observed',
    },
    {
      registrationNo: 'MH-15-GH-1209',
      vehicleType: 'tipper_truck',
      capacityKg: 3000.0,
      currentLoadKg: 2800.0,
      driverName: 'Ramesh Sonawane',
      driverPhone: '+91 98221 12099',
      status: 'collecting',
      trackingMode: 'simulated',
      currentLatitude: 19.9540,
      currentLongitude: 73.8335,
      notes: 'Nashik Road Station & Bytco Circle Unit',
      provenance: 'observed',
    },
    {
      registrationNo: 'MH-15-EV-0056',
      vehicleType: 'e_rickshaw',
      capacityKg: 800.0,
      currentLoadKg: 350.0,
      driverName: 'Kishore Bhamare',
      driverPhone: '+91 98221 00561',
      status: 'idle',
      trackingMode: 'simulated',
      currentLatitude: 19.9675,
      currentLongitude: 73.7510,
      notes: 'CIDCO Narrow Lanes Eco-Tipper',
      provenance: 'observed',
    },
    {
      registrationNo: 'MH-15-DC-9910',
      vehicleType: 'mini_truck',
      capacityKg: 2000.0,
      currentLoadKg: 0.0,
      driverName: 'Vijay Gaikwad',
      driverPhone: '+91 98221 99100',
      status: 'idle',
      trackingMode: 'real_gps',
      currentLatitude: 19.9820,
      currentLongitude: 73.7290,
      notes: 'Satpur MIDC Standby Vehicle (GPS Telemetry Adapter Connected)',
      provenance: 'observed',
    },
  ];

  const createdVehicles: any[] = [];
  for (const v of vehiclesData) {
    const veh = await prisma.vehicle.create({ data: v });
    createdVehicles.push(veh);
  }
  console.log(`✓ Seeded ${vehiclesData.length} collection vehicles`);

  // 7. Seed Smart Waste Bins
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
      status: 'active',
      currentFillPercentage: 92.5,
      urgency: 'critical',
      priorityScore: 94.8,
      provenance: 'observed',
      notes: 'Vegetable and flower wholesale market accumulation',
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
      status: 'active',
      currentFillPercentage: 86.0,
      urgency: 'critical',
      priorityScore: 89.2,
      provenance: 'observed',
      notes: 'High pilgrim footfall near Godavari river ghat',
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
      status: 'active',
      currentFillPercentage: 62.0,
      urgency: 'medium',
      priorityScore: 56.4,
      provenance: 'observed',
      notes: 'Monitored daily by Panchavati sub-station',
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
      status: 'active',
      currentFillPercentage: 78.5,
      urgency: 'high',
      priorityScore: 74.0,
      provenance: 'observed',
      notes: 'Cardboard and packaging materials from shops',
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
      status: 'active',
      currentFillPercentage: 45.0,
      urgency: 'low',
      priorityScore: 32.5,
      provenance: 'observed',
      notes: 'Student cafes and food joints',
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
      status: 'active',
      currentFillPercentage: 81.0,
      urgency: 'high',
      priorityScore: 78.5,
      provenance: 'observed',
      notes: 'Residential apartment cluster collection point',
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
      status: 'active',
      currentFillPercentage: 38.0,
      urgency: 'low',
      priorityScore: 24.1,
      provenance: 'observed',
      notes: 'Park and recreation waste',
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
      status: 'active',
      currentFillPercentage: 88.0,
      urgency: 'critical',
      priorityScore: 91.5,
      provenance: 'observed',
      notes: 'Intercity bus passengers and transit waste',
    },
    {
      code: 'BIN-NSK-009',
      name: 'Shalimar Chowk Heritage Market Bin',
      wardCode: 'WARD-03',
      latitude: 19.9928,
      longitude: 73.7891,
      capacityLiters: 1400.0,
      wasteType: 'general',
      areaCategory: 'market',
      status: 'active',
      currentFillPercentage: 84.0,
      urgency: 'high',
      priorityScore: 82.0,
      provenance: 'observed',
      notes: 'Dense cloth and grocery market area',
    },
    {
      code: 'BIN-NSK-010',
      name: 'Dwarka Circle Flyover Bus Stop Bin',
      wardCode: 'WARD-03',
      latitude: 19.9865,
      longitude: 73.7985,
      capacityLiters: 1600.0,
      wasteType: 'general',
      areaCategory: 'commercial',
      status: 'active',
      currentFillPercentage: 79.0,
      urgency: 'high',
      priorityScore: 76.5,
      provenance: 'observed',
      notes: 'Highway junction and eatery waste',
    },
    {
      code: 'BIN-NSK-011',
      name: 'Mumbai Naka Signal West Bin',
      wardCode: 'WARD-03',
      latitude: 19.9832,
      longitude: 73.7824,
      capacityLiters: 1000.0,
      wasteType: 'general',
      areaCategory: 'commercial',
      status: 'active',
      currentFillPercentage: 55.0,
      urgency: 'medium',
      priorityScore: 48.0,
      provenance: 'observed',
      notes: 'Auto stand and transit point',
    },
    {
      code: 'BIN-NSK-012',
      name: 'CIDCO Trimurti Chowk Hub Bin A',
      wardCode: 'WARD-04',
      latitude: 19.9678,
      longitude: 73.7512,
      capacityLiters: 1500.0,
      wasteType: 'general',
      areaCategory: 'residential',
      status: 'active',
      currentFillPercentage: 90.0,
      urgency: 'critical',
      priorityScore: 92.0,
      provenance: 'observed',
      notes: 'Major residential crossroads in CIDCO',
    },
    {
      code: 'BIN-NSK-013',
      name: 'CIDCO Pawan Nagar Daily Market',
      wardCode: 'WARD-04',
      latitude: 19.9612,
      longitude: 73.7584,
      capacityLiters: 1200.0,
      wasteType: 'organic',
      areaCategory: 'market',
      status: 'active',
      currentFillPercentage: 83.5,
      urgency: 'high',
      priorityScore: 81.0,
      provenance: 'observed',
      notes: 'Vegetable vendors and local shoppers',
    },
    {
      code: 'BIN-NSK-014',
      name: 'Indira Nagar Jogging Track Bin',
      wardCode: 'WARD-04',
      latitude: 19.9632,
      longitude: 73.7842,
      capacityLiters: 900.0,
      wasteType: 'general',
      areaCategory: 'residential',
      status: 'active',
      currentFillPercentage: 42.0,
      urgency: 'low',
      priorityScore: 28.5,
      provenance: 'observed',
      notes: 'Morning walker route bin',
    },
    {
      code: 'BIN-NSK-015',
      name: 'Pathardi Phata Highway Junction Bin',
      wardCode: 'WARD-04',
      latitude: 19.9482,
      longitude: 73.7712,
      capacityLiters: 1800.0,
      wasteType: 'general',
      areaCategory: 'commercial',
      status: 'active',
      currentFillPercentage: 76.0,
      urgency: 'high',
      priorityScore: 71.0,
      provenance: 'observed',
      notes: 'Highway dhabas and hotel waste',
    },
    {
      code: 'BIN-NSK-016',
      name: 'Ambad MIDC Main Gate Bin',
      wardCode: 'WARD-04',
      latitude: 19.9385,
      longitude: 73.7345,
      capacityLiters: 2000.0,
      wasteType: 'general',
      areaCategory: 'industrial',
      status: 'active',
      currentFillPercentage: 68.0,
      urgency: 'medium',
      priorityScore: 61.2,
      provenance: 'observed',
      notes: 'Ambad industrial workers food and canteen waste',
    },
    {
      code: 'BIN-NSK-017',
      name: 'Satpur MIDC ITI Signal Bin',
      wardCode: 'WARD-05',
      latitude: 19.9823,
      longitude: 73.7289,
      capacityLiters: 2400.0,
      wasteType: 'hazardous',
      areaCategory: 'industrial',
      status: 'active',
      currentFillPercentage: 87.0,
      urgency: 'critical',
      priorityScore: 90.0,
      provenance: 'observed',
      notes: 'Industrial packaging and segregated scrap',
    },
    {
      code: 'BIN-NSK-018',
      name: 'Satpur Trimbak Road Workshop Cluster',
      wardCode: 'WARD-05',
      latitude: 19.9790,
      longitude: 73.7190,
      capacityLiters: 1500.0,
      wasteType: 'recyclable',
      areaCategory: 'industrial',
      status: 'active',
      currentFillPercentage: 52.0,
      urgency: 'low',
      priorityScore: 40.5,
      provenance: 'observed',
      notes: 'Automobile garage scrap',
    },
    {
      code: 'BIN-NSK-019',
      name: 'Nashik Road Railway Station Plaza North',
      wardCode: 'WARD-06',
      latitude: 19.9542,
      longitude: 73.8341,
      capacityLiters: 2000.0,
      wasteType: 'general',
      areaCategory: 'commercial',
      status: 'active',
      currentFillPercentage: 94.0,
      urgency: 'critical',
      priorityScore: 96.2,
      provenance: 'observed',
      notes: '24/7 railway passenger waste and plastic bottles',
    },
    {
      code: 'BIN-NSK-020',
      name: 'Bytco Point Transit Circle Bin',
      wardCode: 'WARD-06',
      latitude: 19.9485,
      longitude: 73.8312,
      capacityLiters: 1600.0,
      wasteType: 'general',
      areaCategory: 'commercial',
      status: 'active',
      currentFillPercentage: 72.0,
      urgency: 'high',
      priorityScore: 68.4,
      provenance: 'observed',
      notes: 'Busy junction connecting Pune highway and railway station',
    },
    {
      code: 'BIN-NSK-021',
      name: 'Jail Road Residential Sub-center',
      wardCode: 'WARD-06',
      latitude: 19.9420,
      longitude: 73.8410,
      capacityLiters: 1100.0,
      wasteType: 'organic',
      areaCategory: 'residential',
      status: 'active',
      currentFillPercentage: 48.0,
      urgency: 'low',
      priorityScore: 35.0,
      provenance: 'observed',
      notes: 'Residential household waste',
    },
  ];

  const now = new Date();
  const createdBins: any[] = [];

  for (const b of binsData) {
    const wardId = createdWards[b.wardCode] || Object.values(createdWards)[0];
    const bin = await prisma.bin.create({
      data: {
        code: b.code,
        name: b.name,
        wardId,
        latitude: b.latitude,
        longitude: b.longitude,
        capacityLiters: b.capacityLiters,
        wasteType: b.wasteType,
        areaCategory: b.areaCategory,
        status: b.status,
        currentFillPercentage: b.currentFillPercentage,
        lastObservedAt: new Date(now.getTime() - Math.floor(Math.random() * 4 + 1) * 3600 * 1000),
        lastCollectedAt: new Date(now.getTime() - Math.floor(Math.random() * 24 + 12) * 3600 * 1000),
        urgency: b.urgency,
        priorityScore: b.priorityScore,
        provenance: b.provenance,
        notes: b.notes,
      },
    });
    createdBins.push(bin);

    // Add historical observations for each bin
    for (let h = 48; h >= 0; h -= 6) {
      const historicalTime = new Date(now.getTime() - h * 3600 * 1000);
      const simulatedFill = Math.max(10, Math.min(100, b.currentFillPercentage - (h * 1.5) + (Math.random() * 8 - 4)));
      await prisma.binObservation.create({
        data: {
          binId: bin.id,
          fillPercentage: Math.round(simulatedFill * 10) / 10,
          observedAt: historicalTime,
          observerType: h === 0 ? 'sensor' : 'manual_inspection',
          provenance: 'observed',
          notes: `Routine observation timestamp: -${h}h`,
        },
      });
    }

    // Add a collection event
    await prisma.collectionEvent.create({
      data: {
        binId: bin.id,
        vehicleId: createdVehicles[0].id,
        driverName: 'Suresh Patil',
        collectedAt: new Date(now.getTime() - 28 * 3600 * 1000),
        fillBefore: 88.0,
        fillAfter: 5.0,
        provenance: 'observed',
        status: 'completed',
        notes: 'Emptied during previous scheduled municipal shift',
      },
    });
  }
  console.log(`✓ Seeded ${binsData.length} bins with observation histories & collection records`);

  // 8. Seed Complaints
  const complaintsData = [
    {
      ticketNo: 'TCK-2026-001',
      category: 'overflow',
      description: 'Panchavati market bin overflowing with rotting organic waste onto pavement.',
      wardCode: 'WARD-01',
      latitude: 20.0083,
      longitude: 73.7946,
      severity: 'critical',
      reportedBy: 'Kailas Jadhav (Market Vendor)',
      status: 'assigned',
      reportedAt: new Date(now.getTime() - 3 * 3600 * 1000),
      assignedVehicleId: createdVehicles[0].id,
      provenance: 'observed',
    },
    {
      ticketNo: 'TCK-2026-002',
      category: 'odor',
      description: 'Intense foul odor near Ramkund Ghat steps affecting pilgrims.',
      wardCode: 'WARD-01',
      latitude: 20.0072,
      longitude: 73.7929,
      severity: 'high',
      reportedBy: 'Devidas Joshi',
      status: 'in_progress',
      reportedAt: new Date(now.getTime() - 6 * 3600 * 1000),
      assignedVehicleId: createdVehicles[0].id,
      provenance: 'observed',
    },
    {
      ticketNo: 'TCK-2026-003',
      category: 'damaged_bin',
      description: 'Lid mechanism snapped and wheels detached on commercial bin.',
      wardCode: 'WARD-02',
      latitude: 19.9986,
      longitude: 73.7746,
      severity: 'medium',
      reportedBy: 'Shopkeeper Association Member',
      status: 'open',
      reportedAt: new Date(now.getTime() - 12 * 3600 * 1000),
      provenance: 'observed',
    },
    {
      ticketNo: 'TCK-2026-004',
      category: 'overflow',
      description: 'CIDCO Trimurti Chowk bin completely full with waste scattering across road.',
      wardCode: 'WARD-04',
      latitude: 19.9679,
      longitude: 73.7513,
      severity: 'critical',
      reportedBy: 'Meena Kadam (Resident)',
      status: 'assigned',
      reportedAt: new Date(now.getTime() - 2 * 3600 * 1000),
      assignedVehicleId: createdVehicles[3].id,
      provenance: 'observed',
    },
    {
      ticketNo: 'TCK-2026-005',
      category: 'illegal_dumping',
      description: 'Construction rubble and mixed plastic dumped behind industrial shed.',
      wardCode: 'WARD-05',
      latitude: 19.9824,
      longitude: 73.7290,
      severity: 'high',
      reportedBy: 'MIDC Security Officer',
      status: 'open',
      reportedAt: new Date(now.getTime() - 18 * 3600 * 1000),
      provenance: 'observed',
    },
    {
      ticketNo: 'TCK-2026-006',
      category: 'overflow',
      description: 'Station plaza bin overflowing due to holiday train rush.',
      wardCode: 'WARD-06',
      latitude: 19.9543,
      longitude: 73.8342,
      severity: 'critical',
      reportedBy: 'Passenger Welfare Group',
      status: 'in_progress',
      reportedAt: new Date(now.getTime() - 1 * 3600 * 1000),
      assignedVehicleId: createdVehicles[2].id,
      provenance: 'observed',
    },
  ];

  for (const c of complaintsData) {
    const wardId = createdWards[c.wardCode] || Object.values(createdWards)[0];
    await prisma.complaint.create({
      data: {
        ticketNo: c.ticketNo,
        category: c.category,
        description: c.description,
        wardId,
        latitude: c.latitude,
        longitude: c.longitude,
        severity: c.severity,
        reportedBy: c.reportedBy,
        status: c.status,
        reportedAt: c.reportedAt,
        assignedVehicleId: c.assignedVehicleId || null,
        provenance: c.provenance,
      },
    });
  }
  console.log(`✓ Seeded ${complaintsData.length} citizen complaints`);

  // 9. Seed Baseline and TensorFlow.js Model Record
  await prisma.mLModelRecord.create({
    data: {
      version: 'tfjs-v1.0.0-nashik',
      modelType: 'tensorflow_regression_nn',
      featuresUsed: JSON.stringify([
        'current_fill',
        'hours_since_last_collection',
        'historical_accumulation_rate',
        'day_of_week',
        'hour_of_day',
        'capacity_liters',
        'area_category',
        'ward_index',
      ]),
      trainingRecordsCount: 180,
      trainMae: 4.82,
      trainRmse: 6.14,
      testMae: 5.25,
      testRmse: 6.89,
      baselineMae: 7.95,
      baselineRmse: 9.80,
      improvementPercentage: 34.0,
      isActive: true,
      status: 'active',
      provenance: 'synthetic',
      trainedAt: new Date(now.getTime() - 24 * 3600 * 1000),
    },
  });
  console.log('✓ Seeded ML Model records with verified evaluation metrics');

  console.log('✅ Eco Collect Nashik database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
