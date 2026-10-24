import { Router } from 'express';
import { complaintService } from '../services/complaintService.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Citizen: Submit complaint
router.post('/', authenticate, authorize('CITIZEN', 'ORGANIZATION_ADMIN'), async (req, res) => {
  try {
    const complaint = await complaintService.submitComplaint(req.user, req.body, req);
    res.status(201).json({ success: true, data: complaint });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Citizen: View own complaints; Admin: View all complaints
router.get('/', authenticate, async (req, res) => {
  try {
    const complaints = await complaintService.getComplaints(req.user, req.query);
    res.json({ success: true, count: complaints.length, data: complaints });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get complaint details (timeline, status)
router.get('/:id', authenticate, async (req, res) => {
  try {
    const complaint = await complaintService.getComplaintDetails(req.params.id, req.user);
    res.json({ success: true, data: complaint });
  } catch (err) {
    res.status(404).json({ success: false, error: err.message });
  }
});

// Admin or Worker: Update complaint status & notes
router.patch('/:id/status', authenticate, authorize('ORGANIZATION_ADMIN', 'WORKER'), async (req, res) => {
  try {
    const updated = await complaintService.updateComplaintStatus(req.params.id, req.body, req.user, req);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
