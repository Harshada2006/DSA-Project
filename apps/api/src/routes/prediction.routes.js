import { Router } from 'express';
import { predictionService } from '../services/predictionService.js';

const router = Router();

// Fullness predictions for all bins
router.get('/', async (req, res) => {
  try {
    const predictions = await predictionService.getAllPredictions(req.query.wardId);
    res.json({ success: true, count: predictions.length, data: predictions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Single bin prediction
router.get('/:binId', async (req, res) => {
  try {
    const prediction = await predictionService.predictBinFullness(req.params.binId);
    res.json({ success: true, data: prediction });
  } catch (err) {
    res.status(404).json({ success: false, error: err.message });
  }
});

export default router;
