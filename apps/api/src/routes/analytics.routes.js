import { Router } from 'express';
import { analyticsService } from '../services/analyticsService.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Admin Dashboard Summary Metrics
router.get('/dashboard', authenticate, authorize('ORGANIZATION_ADMIN'), async (_req, res) => {
  try {
    const summary = await analyticsService.getDashboardSummary();
    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Export CSV reports
router.get('/export', authenticate, authorize('ORGANIZATION_ADMIN'), async (req, res) => {
  try {
    const type = req.query.type || 'bins';
    const csvContent = await analyticsService.exportReportCsv(type);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="econexus_${type}_report_${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
