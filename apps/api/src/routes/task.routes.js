import { Router } from 'express';
import { taskService } from '../services/taskService.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Worker sees assigned tasks; Admin sees all tasks
router.get('/', authenticate, authorize('ORGANIZATION_ADMIN', 'WORKER'), async (req, res) => {
  try {
    const tasks = await taskService.getTasks(req.user, req.query);
    res.json({ success: true, count: tasks.length, data: tasks });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin Only: Create task
router.post('/', authenticate, authorize('ORGANIZATION_ADMIN'), async (req, res) => {
  try {
    const task = await taskService.createTask(req.user, req.body, req);
    res.status(201).json({ success: true, data: task });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Worker: Start task
router.post('/:id/start', authenticate, authorize('WORKER', 'ORGANIZATION_ADMIN'), async (req, res) => {
  try {
    const task = await taskService.startTask(req.params.id, req.user);
    res.json({ success: true, data: task });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Worker: Record collection
router.post('/:id/collect', authenticate, authorize('WORKER', 'ORGANIZATION_ADMIN'), async (req, res) => {
  try {
    const task = await taskService.recordCollection(req.params.id, req.body, req.user, req);
    res.json({ success: true, data: task });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Worker: Report missed or blocked task
router.post('/:id/missed', authenticate, authorize('WORKER', 'ORGANIZATION_ADMIN'), async (req, res) => {
  try {
    const task = await taskService.reportMissedTask(req.params.id, req.body, req.user, req);
    res.json({ success: true, data: task });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
