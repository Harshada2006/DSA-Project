import { Router, Request, Response } from 'express';
import { prisma } from '../database/client';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const wards = await prisma.ward.findMany({
      orderBy: { code: 'asc' },
      include: {
        _count: { select: { bins: true, complaints: true } },
      },
    });

    const formatted = wards.map(w => ({
      id: w.id,
      name: w.name,
      code: w.code,
      zone: w.zone,
      areaSqKm: w.areaSqKm,
      populationEstimated: w.populationEstimated,
      censusYear: w.censusYear,
      coordinates: [w.latitude, w.longitude] as [number, number],
      boundaryGeoJson: w.boundaryGeoJson ? JSON.parse(w.boundaryGeoJson) : null,
      binCount: w._count.bins,
      complaintCount: w._count.complaints,
      createdAt: w.createdAt.toISOString(),
    }));

    return res.json({ success: true, data: formatted });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const ward = await prisma.ward.findUnique({
      where: { id: req.params.id },
      include: {
        bins: true,
        complaints: true,
      },
    });

    if (!ward) return res.status(404).json({ success: false, error: 'Ward not found.' });

    return res.json({
      success: true,
      data: {
        ...ward,
        coordinates: [ward.latitude, ward.longitude],
        boundaryGeoJson: ward.boundaryGeoJson ? JSON.parse(ward.boundaryGeoJson) : null,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
