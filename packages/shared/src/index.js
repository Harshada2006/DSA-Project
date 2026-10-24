import { z } from 'zod';

export const CreateBinSchema = z.object({
  code: z.string().min(2).max(30),
  name: z.string().min(2).max(100),
  wardId: z.string().min(1),
  latitude: z.number().min(19.0).max(21.0).default(20.005),
  longitude: z.number().min(73.0).max(75.0).default(73.785),
  capacityLiters: z.number().positive().max(5000).default(1200),
  wasteType: z.string().min(1).default('general'),
  areaCategory: z.string().min(1).default('residential'),
  status: z.enum(['active', 'maintenance', 'full', 'archived']).default('active'),
  notes: z.string().optional().nullable(),
  provenance: z.enum(['observed', 'imported', 'inferred', 'predicted', 'synthetic']).default('observed'),
});

export const UpdateBinSchema = CreateBinSchema.partial();

export const CreateObservationSchema = z.object({
  binId: z.string().min(1),
  fillPercentage: z.number().min(0).max(100),
  observedAt: z.string().optional(),
  observerType: z.string().default('manual_inspection'),
  notes: z.string().optional().nullable(),
  provenance: z.enum(['observed', 'imported', 'inferred', 'predicted', 'synthetic']).default('observed'),
});

export const CreateComplaintSchema = z.object({
  category: z.string().min(1),
  description: z.string().min(3).max(1000),
  wardId: z.string().min(1),
  binId: z.string().optional().nullable(),
  latitude: z.number().min(19.0).max(21.0).optional().default(20.005),
  longitude: z.number().min(73.0).max(75.0).optional().default(73.785),
  photoUrl: z.string().optional().nullable(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  reportedBy: z.string().min(1).default('Nashik Resident'),
});

export const CreateCollectionSchema = z.object({
  binId: z.string().min(1),
  vehicleId: z.string().optional().nullable(),
  driverName: z.string().optional().default('Nashik Sanitation Staff'),
  fillBefore: z.number().min(0).max(100),
  fillAfter: z.number().min(0).max(100).default(0),
  status: z.enum(['completed', 'partial', 'skipped']).default('completed'),
  notes: z.string().optional().nullable(),
  provenance: z.enum(['observed', 'imported', 'inferred', 'predicted', 'synthetic']).default('observed'),
});

export const OptimizeRouteSchema = z.object({
  startingDepotId: z.string().optional().default('depot-panchavati'),
  vehicleId: z.string().optional().nullable(),
  binIds: z.array(z.string()).min(1),
  maxStops: z.number().positive().optional(),
  capacityLimitKg: z.number().positive().optional(),
  objective: z.enum(['distance', 'time']).default('distance'),
});
