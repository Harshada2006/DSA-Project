import { Router } from 'express';
import { facilityService } from '../services/facilityService.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Public / Authenticated: List verified facilities
router.get('/', async (req, res) => {
  try {
    const facilities = await facilityService.getFacilities(req.query);
    res.json({ success: true, count: facilities.length, data: facilities });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get facility details
router.get('/:id', async (req, res) => {
  try {
    const facility = await facilityService.getFacilityById(req.params.id);
    res.json({ success: true, data: facility });
  } catch (err) {
    res.status(404).json({ success: false, error: err.message });
  }
});

// Admin Only: Add facility
router.post('/', authenticate, authorize('ORGANIZATION_ADMIN'), async (req, res) => {
  try {
    const facility = await facilityService.createFacility(req.body);
    res.status(201).json({ success: true, data: facility });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Admin Only: Update facility verification status
router.patch('/:id/verification', authenticate, authorize('ORGANIZATION_ADMIN'), async (req, res) => {
  try {
    const { status, notes } = req.body;
    const updated = await facilityService.updateVerificationStatus(req.params.id, status, notes);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
