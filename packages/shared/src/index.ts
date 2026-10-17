import { z } from 'zod';

export type ProvenanceType = 'observed' | 'imported' | 'inferred' | 'predicted' | 'synthetic';
export type WasteType = 'organic' | 'recyclable' | 'hazardous' | 'general' | 'electronic';
export type BinStatus = 'active' | 'maintenance' | 'full' | 'archived';
export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';
export type ComplaintStatus = 'open' | 'assigned' | 'in_progress' | 'resolved' | 'rejected';
export type ComplaintSeverity = 'low' | 'medium' | 'high' | 'critical';
export type VehicleStatus = 'idle' | 'en_route' | 'collecting' | 'maintenance' | 'off_duty';
export type TrackingMode = 'simulated' | 'real_gps';
export type AreaCategory = 'residential' | 'commercial' | 'market' | 'industrial' | 'pilgrimage';

export interface Ward {
  id: string;
  name: string;
  code: string;
  zone: string;
  areaSqKm: number;
  populationEstimated: number;
  censusYear: number;
  coordinates: [number, number]; // [lat, lng] center
  boundaryGeoJson?: any;
  binCount?: number;
  createdAt?: string;
}

export interface Bin {
  id: string;
  code: string;
  name: string;
  wardId: string;
  wardName?: string;
  latitude: number;
  longitude: number;
  capacityLiters: number;
  wasteType: WasteType;
  areaCategory: AreaCategory;
  status: BinStatus;
  currentFillPercentage: number;
  lastObservedAt: string | null;
  lastCollectedAt: string | null;
  urgency: UrgencyLevel;
  predictedFillPercentage?: number | null;
  timeToThresholdHours?: number | null;
  thresholdCrossingTime?: string | null;
  priorityScore: number;
  provenance: ProvenanceType;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Observation {
  id: string;
  binId: string;
  fillPercentage: number;
  observedAt: string;
  observerType: 'sensor' | 'manual_inspection' | 'citizen_report' | 'synthetic_generator';
  provenance: ProvenanceType;
  notes?: string | null;
  createdAt?: string;
}

export interface CollectionEvent {
  id: string;
  binId: string;
  binCode?: string;
  binName?: string;
  vehicleId: string;
  vehicleReg?: string;
  driverName: string;
  collectedAt: string;
  fillBefore: number;
  fillAfter: number;
  provenance: ProvenanceType;
  status: 'completed' | 'partial' | 'skipped';
  notes?: string | null;
  createdAt?: string;
}

export interface Complaint {
  id: string;
  ticketNo: string;
  category: 'overflow' | 'odor' | 'damaged_bin' | 'illegal_dumping' | 'missed_collection';
  description: string;
  wardId: string;
  wardName?: string;
  latitude: number;
  longitude: number;
  photoUrl?: string | null;
  status: ComplaintStatus;
  severity: ComplaintSeverity;
  reportedBy: string;
  assignedVehicleId?: string | null;
  resolutionNotes?: string | null;
  reportedAt: string;
  resolvedAt?: string | null;
  provenance: ProvenanceType;
}

export interface Vehicle {
  id: string;
  registrationNo: string;
  vehicleType: 'compactor_truck' | 'tipper_truck' | 'e_rickshaw' | 'mini_truck';
  capacityKg: number;
  currentLoadKg: number;
  driverName: string;
  driverPhone?: string;
  status: VehicleStatus;
  trackingMode: TrackingMode;
  currentLatitude: number;
  currentLongitude: number;
  lastGpsUpdate: string;
  assignedRouteId?: string | null;
  notes?: string | null;
  provenance: ProvenanceType;
}

export interface RoadNode {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  wardId?: string;
}

export interface RoadEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  distanceMeters: number;
  travelTimeSeconds: number;
  roadName: string;
  oneWay: boolean;
}

export interface PriorityTask {
  binId: string;
  binCode: string;
  binName: string;
  wardId: string;
  wardName: string;
  latitude: number;
  longitude: number;
  priorityScore: number;
  urgency: UrgencyLevel;
  currentFill: number;
  predictedFill: number;
  timeToThresholdHours: number;
  complaintCount: number;
  hoursSinceLastCollection: number;
  dataFreshnessHours: number;
  formulaBreakdown: {
    thresholdProximityComponent: number;
    predictedUrgencyComponent: number;
    complaintSeverityComponent: number;
    overdueTimeComponent: number;
    freshnessDiscount: number;
  };
  suggestedAction: string;
  provenance: ProvenanceType;
}

export interface RouteOptimizationRequest {
  startingDepot: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
  };
  vehicleId: string;
  binIds: string[];
  maxStops?: number;
  capacityLimitKg?: number;
  objective: 'distance' | 'time';
}

export interface RouteStop {
  stopOrder: number;
  type: 'depot' | 'bin';
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  demandKg?: number;
  cumulativeDistanceMeters: number;
  cumulativeTimeMinutes: number;
  estimatedArrival?: string;
}

export interface RouteOptimizationResponse {
  routeId: string;
  vehicleId: string;
  vehicleReg: string;
  orderedStops: RouteStop[];
  pathCoordinates: [number, number][]; // [lat, lng]
  totalDistanceKm: number;
  totalDurationMinutes: number;
  algorithmUsed: string;
  timeComplexity: string;
  unreachableBinIds: string[];
  constraintsSatisfied: boolean;
  computedAt: string;
}

export interface PredictionResult {
  binId: string;
  binCode: string;
  binName: string;
  wardName: string;
  currentFill: number;
  predictedFill24h: number;
  predictedFill48h: number;
  timeToThresholdHours: number;
  thresholdCrossingTime: string;
  urgencyCategory: UrgencyLevel;
  modelVersion: string;
  modelType: 'baseline_linear_rate' | 'tensorflow_regression';
  confidenceScore: number;
  uncertaintyMargin: number;
  edgeCaseEncountered?: string | null;
  provenance: ProvenanceType;
  predictionTimestamp: string;
}

export interface MLModelMetadata {
  id: string;
  version: string;
  modelType: string;
  trainedAt: string;
  trainingRecordsCount: number;
  featuresUsed: string[];
  trainMae: number;
  trainRmse: number;
  testMae: number;
  testRmse: number;
  baselineMae: number;
  baselineRmse: number;
  improvementPercentage: number;
  isActive: boolean;
  status: 'active' | 'candidate' | 'archived';
  provenance: ProvenanceType;
}

export interface DashboardSummary {
  totalRegisteredBins: number;
  binsNearThreshold: number;
  highPriorityBins: number;
  openComplaints: number;
  completedCollectionsToday: number;
  activeVehiclesCount: {
    total: number;
    simulated: number;
    realGps: number;
  };
  collectionActivityTrend: {
    date: string;
    count: number;
    volumeTons: number;
  }[];
  predictedVsObservedFullness: {
    binCode: string;
    observed: number;
    predicted: number;
    timestamp: string;
  }[];
  wasteAccumulationTrend: {
    day: string;
    organic: number;
    recyclable: number;
    general: number;
  }[];
  wardSummaries: {
    wardId: string;
    wardName: string;
    binCount: number;
    averageFillPercentage: number;
    criticalBinsCount: number;
    openComplaintsCount: number;
  }[];
  recentComplaints: Complaint[];
  recentCollections: CollectionEvent[];
  upcomingTasks: PriorityTask[];
  dataSourceDistribution: Record<ProvenanceType, number>;
}

// Zod Schemas for API validation
export const CreateBinSchema = z.object({
  code: z.string().min(2).max(30),
  name: z.string().min(2).max(100),
  wardId: z.string().uuid().or(z.string().min(1)),
  latitude: z.number().min(19.8).max(20.2), // Nashik bounding box
  longitude: z.number().min(73.6).max(74.0),
  capacityLiters: z.number().positive().max(5000),
  wasteType: z.enum(['organic', 'recyclable', 'hazardous', 'general', 'electronic']),
  areaCategory: z.enum(['residential', 'commercial', 'market', 'industrial', 'pilgrimage']),
  status: z.enum(['active', 'maintenance', 'full', 'archived']).default('active'),
  notes: z.string().optional().nullable(),
  provenance: z.enum(['observed', 'imported', 'inferred', 'predicted', 'synthetic']).default('observed'),
});

export const UpdateBinSchema = CreateBinSchema.partial();

export const CreateObservationSchema = z.object({
  binId: z.string().min(1),
  fillPercentage: z.number().min(0).max(100),
  observedAt: z.string().datetime().optional(),
  observerType: z.enum(['sensor', 'manual_inspection', 'citizen_report', 'synthetic_generator']).default('manual_inspection'),
  notes: z.string().optional().nullable(),
  provenance: z.enum(['observed', 'imported', 'inferred', 'predicted', 'synthetic']).default('observed'),
});

export const CreateComplaintSchema = z.object({
  category: z.enum(['overflow', 'odor', 'damaged_bin', 'illegal_dumping', 'missed_collection']),
  description: z.string().min(5).max(1000),
  wardId: z.string().min(1),
  latitude: z.number().min(19.8).max(20.2),
  longitude: z.number().min(73.6).max(74.0),
  photoUrl: z.string().url().optional().nullable(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  reportedBy: z.string().min(2).max(100),
});

export const CreateCollectionSchema = z.object({
  binId: z.string().min(1),
  vehicleId: z.string().min(1),
  driverName: z.string().min(2),
  fillBefore: z.number().min(0).max(100),
  fillAfter: z.number().min(0).max(100).default(0),
  status: z.enum(['completed', 'partial', 'skipped']).default('completed'),
  notes: z.string().optional().nullable(),
  provenance: z.enum(['observed', 'imported', 'inferred', 'predicted', 'synthetic']).default('observed'),
});

export const UpdateVehicleLocationSchema = z.object({
  latitude: z.number().min(19.8).max(20.2),
  longitude: z.number().min(73.6).max(74.0),
  timestamp: z.string().datetime().optional(),
  mode: z.enum(['simulated', 'real_gps']),
  speedKmph: z.number().min(0).max(150).optional(),
});

export const OptimizeRouteSchema = z.object({
  startingDepotId: z.string().min(1),
  vehicleId: z.string().min(1),
  binIds: z.array(z.string()).min(1),
  maxStops: z.number().positive().optional(),
  capacityLimitKg: z.number().positive().optional(),
  objective: z.enum(['distance', 'time']).default('distance'),
});

export const TrainModelSchema = z.object({
  features: z.array(z.string()).min(1),
  epochs: z.number().min(5).max(200).default(30),
  learningRate: z.number().min(0.0001).max(0.1).default(0.01),
  trainTestSplitRatio: z.number().min(0.5).max(0.9).default(0.8),
  description: z.string().optional(),
});
