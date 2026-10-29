import { prisma } from '../database/client.js';
import { logAuditEvent } from '../middleware/auth.js';
import { dsaService } from './dsaService.js';

function findNearestRoadNode(nodes, lat, lng) {
  let closest = null;
  let minDist = Infinity;
  for (const n of nodes) {
    const d = Math.hypot(n.latitude - lat, n.longitude - lng);
    if (d < minDist) {
      minDist = d;
      closest = n;
    }
  }
  return closest || nodes[0];
}

export class TaskService {
  /**
   * Get tasks with role-aware scoping
   */
  async getTasks(user, filters = {}) {
    const where = {};

    // Workers see their assigned tasks or unassigned pending tasks
    if (user.role === 'WORKER') {
      where.OR = [
        { assignedWorkerId: user.id },
        { assignedWorkerId: null, status: 'pending' },
      ];
    } else if (filters.workerId) {
      where.assignedWorkerId = filters.workerId;
    }

    if (filters.status) where.status = filters.status;
    if (filters.priority) where.taskPriority = filters.priority;

    return await prisma.collectionTask.findMany({
      where,
      include: {
        bin: {
          include: { ward: true },
        },
        assignedWorker: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [
        { taskPriority: 'asc' }, // critical/high at top
        { scheduledDate: 'desc' },
      ],
    });
  }

  /**
   * Create and assign a collection task (Admin only)
   */
  async createTask(adminUser, taskData, req) {
    const { binId, assignedWorkerId, taskPriority, priorityScore, notes } = taskData;

    const bin = await prisma.bin.findUnique({ where: { id: binId } });
    if (!bin) throw new Error('Target bin not found.');

    const task = await prisma.collectionTask.create({
      data: {
        binId,
        assignedWorkerId: assignedWorkerId || null,
        taskPriority: taskPriority || bin.urgency || 'normal',
        priorityScore: priorityScore || bin.priorityScore || 0.0,
        status: assignedWorkerId ? 'assigned' : 'pending',
        notes: notes || null,
        scheduledDate: new Date(),
      },
      include: {
        bin: { include: { ward: true } },
        assignedWorker: { select: { id: true, name: true } },
      },
    });

    await logAuditEvent({
      userId: adminUser.id,
      action: 'COLLECTION_TASK_CREATED',
      resource: 'CollectionTask',
      resourceId: task.id,
      details: { binId, assignedWorkerId },
      req,
    });

    return task;
  }

  /**
   * Start task (Worker)
   */
  async startTask(taskId, workerUser) {
    const task = await prisma.collectionTask.findUnique({ where: { id: taskId } });
    if (!task) throw new Error('Task not found.');

    if (workerUser.role === 'WORKER' && task.assignedWorkerId && task.assignedWorkerId !== workerUser.id) {
      throw new Error('Access denied: You can only update tasks assigned to your worker profile.');
    }

    return await prisma.collectionTask.update({
      where: { id: taskId },
      data: {
        status: 'started',
        startedAt: new Date(),
        assignedWorkerId: task.assignedWorkerId || workerUser.id,
      },
      include: { bin: true },
    });
  }

  /**
   * Record collection event (Worker)
   */
  async recordCollection(taskId, collectionData, workerUser, req) {
    const task = await prisma.collectionTask.findUnique({
      where: { id: taskId },
      include: { bin: true },
    });

    if (!task) throw new Error('Task not found.');

    if (task.status === 'collected') {
      throw new Error('Task has already been completed and collected.');
    }

    if (workerUser.role === 'WORKER' && task.assignedWorkerId && task.assignedWorkerId !== workerUser.id) {
      throw new Error('Access denied: You can only record collections for your assigned tasks.');
    }

    const {
      observedFillAfter = 0.0,
      collectedWeightKg,
      weightKg,
      notes = '',
      photoEvidenceUrl = null,
      gpsLat = null,
      latitude = null,
      gpsLng = null,
      longitude = null,
    } = collectionData;

    const now = new Date();
    const fillBefore = task.bin.currentFillPercentage;
    const fillAfter = Math.max(0.0, Math.min(100.0, parseFloat(observedFillAfter)));
    const actualWeight = parseFloat(collectedWeightKg ?? weightKg) || Math.round(((fillBefore - fillAfter) / 100.0) * (task.bin.capacityLiters * 0.35)) || 50;
    const finalGpsLat = (gpsLat ?? latitude) ? parseFloat(gpsLat ?? latitude) : null;
    const finalGpsLng = (gpsLng ?? longitude) ? parseFloat(gpsLng ?? longitude) : null;

    const [updatedTask] = await prisma.$transaction([
      prisma.collectionTask.update({
        where: { id: taskId },
        data: {
          status: 'collected',
          completedAt: now,
          assignedWorkerId: task.assignedWorkerId || workerUser.id,
          observedFill: fillAfter,
          collectedWeightKg: actualWeight,
          notes: notes || null,
          photoEvidenceUrl: photoEvidenceUrl || null,
          workerGpsLat: finalGpsLat,
          workerGpsLng: finalGpsLng,
        },
      }),
      prisma.collectionEvent.create({
        data: {
          binId: task.binId,
          driverName: workerUser.name,
          fillBefore,
          fillAfter,
          status: 'completed',
          notes: notes || `Collected by ${workerUser.name}. Measured: ${actualWeight} kg`,
          collectedAt: now,
          provenance: 'observed',
        },
      }),
      prisma.bin.update({
        where: { id: task.binId },
        data: {
          currentFillPercentage: fillAfter,
          lastCollectedAt: now,
          lastObservedAt: now,
          status: 'active',
          urgency: 'normal',
        },
      }),
      prisma.binObservation.create({
        data: {
          binId: task.binId,
          fillPercentage: fillAfter,
          observedAt: now,
          observerType: 'manual_inspection',
          provenance: 'observed',
          notes: `Post-collection observation by ${workerUser.name}.`,
        },
      }),
    ]);

    // Update vehicle load tracking
    const vehicle = await prisma.vehicle.findFirst({ where: { registrationNo: 'MH-15-EM-4012' } });
    if (vehicle) {
      const newLoad = Math.min(vehicle.capacityKg, vehicle.currentLoadKg + actualWeight);
      const isFull = newLoad >= vehicle.capacityKg * 0.9;
      await prisma.vehicle.update({
        where: { id: vehicle.id },
        data: {
          currentLoadKg: newLoad,
          status: isFull ? 'full' : vehicle.status,
          currentLatitude: task.bin.latitude,
          currentLongitude: task.bin.longitude,
          lastGpsUpdate: now,
        },
      });
    }

    await logAuditEvent({
      userId: workerUser.id,
      action: 'COLLECTION_RECORDED',
      resource: 'CollectionTask',
      resourceId: taskId,
      details: { binId: task.binId, collectedWeightKg: actualWeight },
      req,
    });

    return updatedTask;
  }

  /**
   * Report missed or blocked task
   */
  async reportMissedTask(taskId, reportData, workerUser, req) {
    const task = await prisma.collectionTask.findUnique({ where: { id: taskId } });
    if (!task) throw new Error('Task not found.');

    if (workerUser.role === 'WORKER' && task.assignedWorkerId !== workerUser.id) {
      throw new Error('Access denied: You can only report on tasks assigned to you.');
    }

    const { status = 'missed', reason, notes, photoEvidenceUrl } = reportData;

    const updatedTask = await prisma.collectionTask.update({
      where: { id: taskId },
      data: {
        status: status === 'blocked' ? 'blocked' : 'missed',
        missedReason: reason || 'Inaccessible or road blocked',
        notes: notes || null,
        photoEvidenceUrl: photoEvidenceUrl || null,
        completedAt: new Date(),
      },
    });

    await logAuditEvent({
      userId: workerUser.id,
      action: 'TASK_REPORTED_MISSED',
      resource: 'CollectionTask',
      resourceId: taskId,
      details: { reason, status },
      req,
    });

    return updatedTask;
  }

  /**
   * Get vehicle capacity & load status for worker's vehicle
   */
  async getVehicleStatus(workerUser) {
    let vehicle = await prisma.vehicle.findFirst({
      where: { registrationNo: 'MH-15-EM-4012' },
    });
    if (!vehicle) {
      vehicle = await prisma.vehicle.findFirst();
    }
    if (!vehicle) {
      vehicle = await prisma.vehicle.create({
        data: {
          registrationNo: 'MH-15-EM-4012',
          driverName: workerUser?.name || 'Municipal Driver',
          capacityKg: 3500.0,
          currentLoadKg: 0.0,
          status: 'idle',
        },
      });
    }

    const dumpingFacility = await prisma.facility.findFirst({
      where: { facilityType: 'general_waste_facility' },
    }) || {
      id: 'nwmpl-pathardi',
      name: 'NWMPL Integrated Solid Waste Processing Facility',
      address: 'Pathardi Shivar, Nashik',
      latitude: 19.9482,
      longitude: 73.7651,
    };

    const loadPercentage = Math.round((vehicle.currentLoadKg / vehicle.capacityKg) * 100);
    const isFull = vehicle.currentLoadKg >= vehicle.capacityKg * 0.9;

    return {
      vehicle: {
        id: vehicle.id,
        registrationNo: vehicle.registrationNo,
        vehicleType: vehicle.vehicleType,
        capacityKg: vehicle.capacityKg,
        currentLoadKg: vehicle.currentLoadKg,
        loadPercentage,
        isFull,
        status: isFull ? 'full' : vehicle.status,
      },
      dumpingFacility: {
        id: dumpingFacility.id,
        name: dumpingFacility.name,
        address: dumpingFacility.address || 'Pathardi Shivar, Nashik',
        latitude: dumpingFacility.latitude,
        longitude: dumpingFacility.longitude,
        nodeId: 'N-PAT',
      },
    };
  }

  /**
   * Confirm truck unloading at designated municipal dumping facility
   */
  async recordTruckUnload(vehicleId, workerUser, req) {
    let vehicle = null;
    if (vehicleId) {
      vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    }
    if (!vehicle) {
      vehicle = await prisma.vehicle.findFirst({
        where: { registrationNo: 'MH-15-EM-4012' },
      });
    }
    if (!vehicle) throw new Error('Vehicle record not found.');

    const previousLoad = vehicle.currentLoadKg;

    const updatedVehicle = await prisma.vehicle.update({
      where: { id: vehicle.id },
      data: {
        currentLoadKg: 0.0,
        status: 'idle',
      },
    });

    await logAuditEvent({
      userId: workerUser.id,
      action: 'VEHICLE_UNLOADED_AT_DUMPING_FACILITY',
      resource: 'Vehicle',
      resourceId: vehicle.id,
      details: {
        facility: 'NWMPL Integrated Solid Waste Processing Facility (Pathardi Shivar)',
        unloadedWeightKg: previousLoad,
      },
      req,
    });

    return {
      success: true,
      message: `Truck ${vehicle.registrationNo} successfully unloaded (${previousLoad} kg emptied). Available capacity reset to 100%.`,
      vehicle: {
        id: updatedVehicle.id,
        registrationNo: updatedVehicle.registrationNo,
        capacityKg: updatedVehicle.capacityKg,
        currentLoadKg: 0.0,
        loadPercentage: 0,
        isFull: false,
        status: 'idle',
      },
    };
  }

  /**
   * Shortest-path road routing to dumping facility
   */
  async getRouteToDumpingFacility(options = {}) {
    const { avoidBlocked = true } = options;
    const nodes = await prisma.roadNode.findMany();
    if (nodes.length === 0) throw new Error('Road network nodes unavailable.');

    // Starting node: CBS Central Bus Stand or provided source
    const sourceNodeId = options.sourceNodeId || 'N-CBS';
    const targetNodeId = 'N-PAT'; // Pathardi Phata Highway Hub / NWMPL

    const route = await dsaService.getShortestPath(sourceNodeId, targetNodeId, false, avoidBlocked);

    const dumpingFacility = await prisma.facility.findFirst({
      where: { facilityType: 'general_waste_facility' },
    }) || {
      name: 'NWMPL Integrated Solid Waste Processing Facility',
      address: 'Pathardi Shivar, Nashik',
      latitude: 19.9482,
      longitude: 73.7651,
    };

    return {
      ...route,
      destinationFacility: {
        name: dumpingFacility.name,
        address: dumpingFacility.address,
        latitude: dumpingFacility.latitude,
        longitude: dumpingFacility.longitude,
      },
      sourceNode: nodes.find((n) => n.id === sourceNodeId),
      targetNode: nodes.find((n) => n.id === targetNodeId),
      roadRestrictionsAvoided: avoidBlocked,
      disclaimer: 'Calculated over verified Nashik road network graph using Dijkstra algorithm.',
    };
  }

  /**
   * Shortest-path road routing to assigned collection bin
   */
  async getRouteToBin(binId, options = {}) {
    const bin = await prisma.bin.findUnique({ where: { id: binId } });
    if (!bin) throw new Error('Target bin not found.');

    const nodes = await prisma.roadNode.findMany();
    if (nodes.length === 0) throw new Error('Road network nodes unavailable.');

    // Map bin coordinates to nearest road node
    const targetNode = findNearestRoadNode(nodes, bin.latitude, bin.longitude);
    const sourceNodeId = options.sourceNodeId || 'N-DEP'; // Depot or vehicle location

    const route = await dsaService.getShortestPath(sourceNodeId, targetNode.id, false, options.avoidBlocked !== false);

    return {
      ...route,
      bin: {
        id: bin.id,
        code: bin.code,
        name: bin.name,
        latitude: bin.latitude,
        longitude: bin.longitude,
      },
      sourceNode: nodes.find((n) => n.id === sourceNodeId),
      targetNode,
      roadRestrictionsAvoided: options.avoidBlocked !== false,
      disclaimer: 'Calculated over verified Nashik road network graph using Dijkstra algorithm.',
    };
  }
}

export const taskService = new TaskService();
