import { Router } from 'express';
import { scheduleEventService } from '../services/scheduleEventService.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Public: Get collection schedules
router.get('/schedules', async (req, res) => {
  try {
    const schedules = await scheduleEventService.getSchedules(req.query.wardId);
    res.json({ success: true, count: schedules.length, data: schedules });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin Only: Create collection schedule
router.post('/schedules', authenticate, authorize('ORGANIZATION_ADMIN'), async (req, res) => {
  try {
    const schedule = await scheduleEventService.createSchedule(req.body);
    res.status(201).json({ success: true, data: schedule });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Public: Get festival and special events
router.get('/events', async (_req, res) => {
  try {
    const events = await scheduleEventService.getEvents();
    res.json({ success: true, count: events.length, data: events });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin Only: Add festival event
router.post('/events', authenticate, authorize('ORGANIZATION_ADMIN'), async (req, res) => {
  try {
    const event = await scheduleEventService.createEvent(req.body);
    res.status(201).json({ success: true, data: event });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
