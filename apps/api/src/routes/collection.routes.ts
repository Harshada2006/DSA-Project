import { Router, Request, Response } from 'express';
import { binService } from '../services/binService';
import { CreateCollectionSchema } from '@eco-collect/shared';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const collections = await binService.listCollections(limit);
    return res.json({ success: true, data: collections });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = CreateCollectionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.format() });
    }
    const result = await binService.recordCollection(parsed.data);
    return res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
