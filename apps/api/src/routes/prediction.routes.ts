import { Router, Request, Response } from 'express';
import { predictionService } from '../services/predictionService';
import { TrainModelSchema } from '@eco-collect/shared';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const binId = req.query.binId as string | undefined;
    const predictions = await predictionService.predictBins(binId);
    return res.json({ success: true, data: predictions });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/run', async (req: Request, res: Response) => {
  try {
    const { binId } = req.body;
    const predictions = await predictionService.predictBins(binId);
    return res.json({ success: true, data: predictions });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/models', async (_req: Request, res: Response) => {
  try {
    const models = await predictionService.listModels();
    return res.json({ success: true, data: models });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/models/train', async (req: Request, res: Response) => {
  try {
    const parsed = TrainModelSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.format() });
    }
    const metadata = await predictionService.trainModel({
      epochs: parsed.data.epochs,
      learningRate: parsed.data.learningRate,
      trainSplitRatio: parsed.data.trainTestSplitRatio,
    });
    return res.status(201).json({ success: true, data: metadata });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/models/:id/promote', async (req: Request, res: Response) => {
  try {
    const promoted = await predictionService.promoteModel(req.params.id);
    return res.json({ success: true, data: promoted });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
