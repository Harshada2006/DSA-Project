import { Router, Request, Response } from 'express';
import { binService } from '../services/binService';
import { CreateBinSchema, CreateObservationSchema, CreateCollectionSchema } from '@eco-collect/shared';

const router = Router();

// List Bins
router.get('/', async (req: Request, res: Response) => {
  try {
    const { wardId, status, urgency, wasteType, search, provenance, page, limit } = req.query;
    const result = await binService.listBins({
      wardId: wardId as string,
      status: status as string,
      urgency: urgency as string,
      wasteType: wasteType as string,
      search: search as string,
      provenance: provenance as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 50,
    });
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Get Bin by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const bin = await binService.getBinById(req.params.id);
    if (!bin) return res.status(404).json({ success: false, error: 'Bin not found.' });
    return res.json({ success: true, data: bin });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Create Bin
router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = CreateBinSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.format() });
    }
    const bin = await binService.createBin(parsed.data);
    return res.status(201).json({ success: true, data: bin });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// Update Bin
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const updated = await binService.updateBin(req.params.id, req.body);
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// Archive Bin
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const archived = await binService.archiveBin(req.params.id);
    return res.json({ success: true, data: archived });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// Get Observations for a specific Bin
router.get('/:id/observations', async (req: Request, res: Response) => {
  try {
    const bin = await binService.getBinById(req.params.id);
    if (!bin) return res.status(404).json({ success: false, error: 'Bin not found.' });
    return res.json({ success: true, data: bin.observations });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
