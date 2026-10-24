import { Router } from 'express';
import { prisma } from '../database/client.js';

const router = Router();

// Get all Nashik wards
router.get('/', async (_req, res) => {
  try {
    const wards = await prisma.ward.findMany({
      include: {
        _count: {
          select: { bins: true, complaints: true },
        },
      },
      orderBy: { code: 'asc' },
    });
    res.json({ success: true, count: wards.length, data: wards });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
