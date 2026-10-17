import { Router, Request, Response } from 'express';
import { complaintService } from '../services/complaintService';
import { CreateComplaintSchema } from '@eco-collect/shared';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { wardId, status, severity, category, search } = req.query;
    const complaints = await complaintService.listComplaints({
      wardId: wardId as string,
      status: status as string,
      severity: severity as string,
      category: category as string,
      search: search as string,
    });
    return res.json({ success: true, data: complaints });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = CreateComplaintSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.format() });
    }
    const complaint = await complaintService.createComplaint(parsed.data);
    return res.status(201).json({ success: true, data: complaint });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const updated = await complaintService.updateComplaint(req.params.id, req.body);
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
