import { Router } from 'express';
import { dsaService } from '../services/dsaService.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Health check of compiled C++ executable
router.get('/dsa/health', async (_req, res) => {
  const result = await dsaService.getEngineHealth();
  res.json({ success: result.success, data: result.data || result });
});

// C++ Max-Heap 4-Factor Priority Ranking
router.post('/dsa/prioritize', authenticate, authorize('ORGANIZATION_ADMIN', 'WORKER'), async (req, res) => {
  try {
    const result = await dsaService.getPrioritizedTasks(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// C++ Dijkstra Shortest Path
router.post('/dsa/shortest-path', authenticate, authorize('ORGANIZATION_ADMIN', 'WORKER'), async (req, res) => {
  try {
    const { sourceId, targetId, useTime } = req.body;
    if (!sourceId || !targetId) {
      return res.status(400).json({ success: false, error: 'sourceId and targetId are required.' });
    }
    const result = await dsaService.getShortestPath(sourceId, targetId, useTime);
    res.json({ success: result.reachable !== false, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// C++ Route Optimizer (Multi-Stop Nearest-Next-Stop Heuristic + Dijkstra)
router.post('/dsa/optimize-route', authenticate, authorize('ORGANIZATION_ADMIN', 'WORKER'), async (req, res) => {
  try {
    const result = await dsaService.getOptimizedRoute(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
