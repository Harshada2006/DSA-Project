import { Router } from 'express';
import { issueService } from '../services/issueService.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Submit operational issue (Worker or Admin)
router.post('/', authenticate, authorize('WORKER', 'ORGANIZATION_ADMIN'), async (req, res) => {
  try {
    const issue = await issueService.reportIssue(req.user, req.body, req);
    res.status(201).json({ success: true, data: issue });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// List issues or active roadblocks if accessed via /roadblocks
router.get('/', authenticate, authorize('WORKER', 'ORGANIZATION_ADMIN'), async (req, res) => {
  try {
    if (req.baseUrl.endsWith('/roadblocks')) {
      const roadblocks = await issueService.getActiveRoadblocks();
      return res.json({ success: true, data: roadblocks });
    }
    const issues = await issueService.getIssues(req.user, req.query);
    res.json({ success: true, count: issues.length, data: issues });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get active roadblocks
router.get('/roadblocks', authenticate, authorize('WORKER', 'ORGANIZATION_ADMIN'), async (_req, res) => {
  try {
    const roadblocks = await issueService.getActiveRoadblocks();
    res.json({ success: true, data: roadblocks });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Toggle road edge roadblock (Admin or Worker)
router.post('/roadblocks/toggle', authenticate, authorize('WORKER', 'ORGANIZATION_ADMIN'), async (req, res) => {
  try {
    const { edgeId, isBlocked, reason } = req.body;
    if (!edgeId) {
      return res.status(400).json({ success: false, error: 'edgeId is required.' });
    }
    const updated = await issueService.toggleRoadblock(edgeId, isBlocked, reason, req.user, req);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Update issue status / resolution (Admin)
router.patch('/:id/status', authenticate, authorize('ORGANIZATION_ADMIN'), async (req, res) => {
  try {
    const updated = await issueService.updateIssueStatus(req.params.id, req.body, req.user, req);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
