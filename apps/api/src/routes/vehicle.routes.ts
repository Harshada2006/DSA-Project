import { Router, Request, Response } from 'express';
import { vehicleService } from '../services/vehicleService';
import { UpdateVehicleLocationSchema } from '@eco-collect/shared';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const vehicles = await vehicleService.listVehicles();
    return res.json({ success: true, data: vehicles });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const vehicle = await vehicleService.getVehicle(req.params.id);
    if (!vehicle) return res.status(404).json({ success: false, error: 'Vehicle not found.' });
    return res.json({ success: true, data: vehicle });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:id/location', async (req: Request, res: Response) => {
  try {
    const parsed = UpdateVehicleLocationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.format() });
    }
    const updated = await vehicleService.updateLocation(req.params.id, parsed.data);
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/simulation/toggle', async (req: Request, res: Response) => {
  try {
    const { start } = req.body;
    const result = await vehicleService.toggleSimulation(start);
    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/simulation/status', async (_req: Request, res: Response) => {
  return res.json({ success: true, data: vehicleService.getSimulationStatus() });
});

export default router;
