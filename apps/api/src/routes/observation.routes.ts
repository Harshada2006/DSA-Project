import { Router, Request, Response } from 'express';
import { binService } from '../services/binService';
import { CreateObservationSchema } from '@eco-collect/shared';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = CreateObservationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.format() });
    }
    const result = await binService.recordObservation(parsed.data);
    return res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
