import { Router, Request, Response } from 'express';
import { dsaService } from '../services/dsaService';
import { prisma } from '../database/client';
import { OptimizeRouteSchema } from '@eco-collect/shared';

const router = Router();

// Priority Queue - Ranked Collection Tasks
router.get('/prioritized', async (req: Request, res: Response) => {
  try {
    const { wardId, urgency, limit } = req.query;
    const result = await dsaService.getPrioritizedTasks({
      wardId: wardId as string,
      urgency: urgency as string,
      limit: limit ? parseInt(limit as string, 10) : 0,
    });
    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Route Optimization - Dijkstra + Multi-stop heuristic
router.post('/optimize', async (req: Request, res: Response) => {
  try {
    const parsed = OptimizeRouteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.format() });
    }

    // Default Nashik Central Depot if not custom
    const depot = {
      id: 'depot-panchavati',
      name: 'Central Municipal Solid Waste Depot (Panchavati)',
      latitude: 20.0210,
      longitude: 73.8015,
    };

    const route = await dsaService.optimizeRoute({
      startingDepot: depot,
      vehicleId: parsed.data.vehicleId,
      binIds: parsed.data.binIds,
      maxStops: parsed.data.maxStops,
      capacityLimitKg: parsed.data.capacityLimitKg,
      objective: parsed.data.objective,
    });

    return res.status(201).json({ success: true, data: route });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// List Planned Routes
router.get('/routes', async (req: Request, res: Response) => {
  try {
    const routes = await prisma.route.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        vehicle: { select: { id: true, registrationNo: true, driverName: true } },
        stops: { orderBy: { stopOrder: 'asc' } },
      },
    });

    const formatted = routes.map(r => ({
      id: r.id,
      vehicleId: r.vehicleId,
      vehicleReg: r.vehicle.registrationNo,
      depotName: r.depotName,
      totalDistanceKm: r.totalDistanceKm,
      totalDurationMinutes: r.totalDurationMinutes,
      algorithmUsed: r.algorithmUsed,
      timeComplexity: r.timeComplexity,
      status: r.status,
      pathCoordinates: JSON.parse(r.pathGeoJson || '[]'),
      stops: r.stops,
      createdAt: r.createdAt.toISOString(),
    }));

    return res.json({ success: true, data: formatted });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// C++ Engine Health
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const health = await dsaService.getEngineHealth();
    return res.json({ success: health.success, data: health });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
