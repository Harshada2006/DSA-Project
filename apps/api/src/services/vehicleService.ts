import { prisma } from '../database/client';
import { Vehicle } from '@eco-collect/shared';

// In-memory simulation state
interface SimulationState {
  isRunning: boolean;
  intervalId?: NodeJS.Timeout;
  stepIndex: Record<string, number>;
}

const simState: SimulationState = {
  isRunning: false,
  stepIndex: {},
};

// Nashik route waypoints for vehicle demonstration simulation
const SIMULATED_ROUTES: Record<string, [number, number][]> = {
  // Panchavati to Central Bus Stand loop
  'MH-15-EG-4401': [
    [20.0082, 73.7945],
    [20.0071, 73.7928],
    [20.0050, 73.7910],
    [20.0000, 73.7870],
    [19.9972, 73.7845],
    [19.9928, 73.7891],
    [19.9980, 73.7920],
    [20.0082, 73.7945],
  ],
  // College Road to Canada Corner loop
  'MH-15-AB-8822': [
    [19.9985, 73.7745],
    [20.0010, 73.7680],
    [20.0032, 73.7621],
    [20.0100, 73.7630],
    [20.0185, 73.7654],
    [20.0100, 73.7710],
    [19.9985, 73.7745],
  ],
  // Nashik Road Station to Bytco Point loop
  'MH-15-GH-1209': [
    [19.9542, 73.8341],
    [19.9510, 73.8325],
    [19.9485, 73.8312],
    [19.9450, 73.8360],
    [19.9420, 73.8410],
    [19.9490, 73.8380],
    [19.9542, 73.8341],
  ],
  // CIDCO Trimurti Chowk loop
  'MH-15-EV-0056': [
    [19.9678, 73.7512],
    [19.9650, 73.7540],
    [19.9612, 73.7584],
    [19.9550, 73.7620],
    [19.9482, 73.7712],
    [19.9600, 73.7650],
    [19.9678, 73.7512],
  ],
};

export class VehicleService {
  async listVehicles(): Promise<Vehicle[]> {
    const vehicles = await prisma.vehicle.findMany({
      orderBy: { registrationNo: 'asc' },
    });

    return vehicles.map(v => ({
      id: v.id,
      registrationNo: v.registrationNo,
      vehicleType: v.vehicleType as any,
      capacityKg: v.capacityKg,
      currentLoadKg: v.currentLoadKg,
      driverName: v.driverName,
      driverPhone: v.driverPhone || undefined,
      status: v.status as any,
      trackingMode: v.trackingMode as any,
      currentLatitude: v.currentLatitude,
      currentLongitude: v.currentLongitude,
      lastGpsUpdate: v.lastGpsUpdate.toISOString(),
      assignedRouteId: v.assignedRouteId,
      notes: v.notes,
      provenance: v.provenance as any,
    }));
  }

  async getVehicle(id: string): Promise<Vehicle | null> {
    const v = await prisma.vehicle.findUnique({ where: { id } });
    if (!v) return null;
    return {
      id: v.id,
      registrationNo: v.registrationNo,
      vehicleType: v.vehicleType as any,
      capacityKg: v.capacityKg,
      currentLoadKg: v.currentLoadKg,
      driverName: v.driverName,
      driverPhone: v.driverPhone || undefined,
      status: v.status as any,
      trackingMode: v.trackingMode as any,
      currentLatitude: v.currentLatitude,
      currentLongitude: v.currentLongitude,
      lastGpsUpdate: v.lastGpsUpdate.toISOString(),
      assignedRouteId: v.assignedRouteId,
      notes: v.notes,
      provenance: v.provenance as any,
    };
  }

  /**
   * Update vehicle location from Real GPS feed or manual input
   */
  async updateLocation(
    vehicleId: string,
    data: {
      latitude: number;
      longitude: number;
      timestamp?: string;
      mode: 'simulated' | 'real_gps';
      speedKmph?: number;
    }
  ) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new Error('Vehicle not found.');

    const updateTime = data.timestamp ? new Date(data.timestamp) : new Date();

    const updated = await prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        currentLatitude: data.latitude,
        currentLongitude: data.longitude,
        lastGpsUpdate: updateTime,
        trackingMode: data.mode,
        provenance: data.mode === 'real_gps' ? 'observed' : 'synthetic',
      },
    });

    await prisma.vehicleLocationUpdate.create({
      data: {
        vehicleId,
        latitude: data.latitude,
        longitude: data.longitude,
        speedKmph: data.speedKmph || 0.0,
        mode: data.mode,
        recordedAt: updateTime,
      },
    });

    return updated;
  }

  /**
   * Toggle or start/stop the demonstration GPS simulation
   */
  async toggleSimulation(start?: boolean): Promise<{ isRunning: boolean; message: string }> {
    const shouldRun = start !== undefined ? start : !simState.isRunning;

    if (shouldRun && !simState.isRunning) {
      simState.isRunning = true;
      console.log('▶ Started demonstration GPS simulation loop for Nashik vehicles');

      // Tick simulation every 4 seconds
      simState.intervalId = setInterval(async () => {
        try {
          const vehicles = await prisma.vehicle.findMany({
            where: { trackingMode: 'simulated' },
          });

          for (const v of vehicles) {
            const path = SIMULATED_ROUTES[v.registrationNo];
            if (!path || path.length === 0) continue;

            const curIdx = simState.stepIndex[v.registrationNo] || 0;
            const nextIdx = (curIdx + 1) % path.length;
            simState.stepIndex[v.registrationNo] = nextIdx;

            const [nextLat, nextLng] = path[nextIdx];

            await prisma.vehicle.update({
              where: { id: v.id },
              data: {
                currentLatitude: nextLat,
                currentLongitude: nextLng,
                lastGpsUpdate: new Date(),
                provenance: 'synthetic',
              },
            });
          }
        } catch (err: any) {
          console.error('Simulation tick error:', err.message);
        }
      }, 4000);

      return { isRunning: true, message: 'GPS demonstration simulation active. Vehicle positions updating every 4s.' };
    } else if (!shouldRun && simState.isRunning) {
      simState.isRunning = false;
      if (simState.intervalId) clearInterval(simState.intervalId);
      console.log('⏹ Stopped demonstration GPS simulation loop');
      return { isRunning: false, message: 'GPS simulation paused.' };
    }

    return { isRunning: simState.isRunning, message: `Simulation is currently ${simState.isRunning ? 'active' : 'idle'}.` };
  }

  getSimulationStatus() {
    return { isRunning: simState.isRunning };
  }
}

export const vehicleService = new VehicleService();
