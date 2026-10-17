import { Router, Request, Response } from 'express';
import { dashboardService } from '../services/dashboardService';

const router = Router();

router.get('/summary', async (req: Request, res: Response) => {
  try {
    const wardId = req.query.wardId as string | undefined;
    const summary = await dashboardService.getSummary({ wardId });
    return res.json({ success: true, data: summary });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
