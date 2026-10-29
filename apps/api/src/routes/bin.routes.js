import { Router } from 'express';
import { binService } from '../services/binService.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Public / Authenticated: List Bins with filtering
router.get('/', async (req, res) => {
  try {
    const bins = await binService.getBins(req.query);
    res.json({ success: true, count: bins.length, data: bins });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Public / Authenticated: Get Bin details & prediction
router.get('/:id', async (req, res) => {
  try {
    const bin = await binService.getBinById(req.params.id);
    res.json({ success: true, data: bin });
  } catch (err) {
    res.status(404).json({ success: false, error: err.message });
  }
});

// Public / Authenticated: Get Bin historical timeseries and observations
router.get('/:id/history', async (req, res) => {
  try {
    const history = await binService.getBinHistory(req.params.id, req.query);
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(404).json({ success: false, error: err.message });
  }
});

// Admin Only: Create new bin
router.post('/', authenticate, authorize('ORGANIZATION_ADMIN'), async (req, res) => {
  try {
    const bin = await binService.createBin(req.body);
    res.status(201).json({ success: true, data: bin });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Admin Only: Update bin
router.patch('/:id', authenticate, authorize('ORGANIZATION_ADMIN'), async (req, res) => {
  try {
    const bin = await binService.updateBin(req.params.id, req.body);
    res.json({ success: true, data: bin });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Admin or Worker: Record physical observation
router.post('/:id/observations', authenticate, authorize('ORGANIZATION_ADMIN', 'WORKER'), async (req, res) => {
  try {
    const observation = await binService.recordObservation(req.params.id, req.body, req.user);
    res.status(201).json({ success: true, data: observation });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
