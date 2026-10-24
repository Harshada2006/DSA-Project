import { Router } from 'express';
import { ewasteService } from '../services/ewasteService.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Citizen: Submit e-waste pickup request
router.post('/requests', authenticate, authorize('CITIZEN', 'ORGANIZATION_ADMIN'), async (req, res) => {
  try {
    const request = await ewasteService.submitPickupRequest(req.user, req.body, req);
    res.status(201).json({ success: true, data: request });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Citizen sees own; Worker sees assigned; Admin sees all
router.get('/requests', authenticate, async (req, res) => {
  try {
    const requests = await ewasteService.getRequests(req.user, req.query);
    res.json({ success: true, count: requests.length, data: requests });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin Only: Assign worker to request
router.post('/requests/:id/assign', authenticate, authorize('ORGANIZATION_ADMIN'), async (req, res) => {
  try {
    const updated = await ewasteService.assignWorker(req.params.id, req.body.workerId, req.user, req);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Worker: Record e-waste collection
router.post('/requests/:id/collect', authenticate, authorize('WORKER', 'ORGANIZATION_ADMIN'), async (req, res) => {
  try {
    const updated = await ewasteService.recordWorkerCollection(req.params.id, req.body, req.user, req);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Worker or Admin: Record handover to verified recycler facility
router.post('/handover', authenticate, authorize('WORKER', 'ORGANIZATION_ADMIN'), async (req, res) => {
  try {
    const handover = await ewasteService.recordFacilityHandover(req.body, req.user, req);
    res.status(201).json({ success: true, data: handover });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
