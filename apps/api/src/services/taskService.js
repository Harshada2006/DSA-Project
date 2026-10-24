import { prisma } from '../database/client.js';
import { logAuditEvent } from '../middleware/auth.js';

export class TaskService {
  /**
   * Get tasks with role-aware scoping
   */
  async getTasks(user, filters = {}) {
    const where = {};

    // Workers only see their assigned tasks
    if (user.role === 'WORKER') {
      where.assignedWorkerId = user.id;
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

    if (workerUser.role === 'WORKER' && task.assignedWorkerId !== workerUser.id) {
      throw new Error('Access denied: You can only update tasks assigned to your worker profile.');
    }

    return await prisma.collectionTask.update({
      where: { id: taskId },
      data: {
        status: 'started',
        startedAt: new Date(),
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

    if (workerUser.role === 'WORKER' && task.assignedWorkerId !== workerUser.id) {
      throw new Error('Access denied: You can only record collections for your assigned tasks.');
    }

    const {
      observedFillAfter = 0.0,
      collectedWeightKg = 0.0,
      notes = '',
      photoEvidenceUrl = null,
      gpsLat = null,
      gpsLng = null,
    } = collectionData;

    const now = new Date();
    const fillBefore = task.bin.currentFillPercentage;
    const fillAfter = Math.max(0.0, Math.min(100.0, parseFloat(observedFillAfter)));

    const [updatedTask] = await prisma.$transaction([
      prisma.collectionTask.update({
        where: { id: taskId },
        data: {
          status: 'collected',
          completedAt: now,
          observedFill: fillAfter,
          collectedWeightKg: parseFloat(collectedWeightKg) || null,
          notes: notes || null,
          photoEvidenceUrl: photoEvidenceUrl || null,
          workerGpsLat: gpsLat ? parseFloat(gpsLat) : null,
          workerGpsLng: gpsLng ? parseFloat(gpsLng) : null,
        },
      }),
      prisma.collectionEvent.create({
        data: {
          binId: task.binId,
          driverName: workerUser.name,
          fillBefore,
          fillAfter,
          status: 'completed',
          notes: notes || `Collected by ${workerUser.name}. Measured: ${collectedWeightKg || 0} kg`,
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
    ]);

    await logAuditEvent({
      userId: workerUser.id,
      action: 'COLLECTION_RECORDED',
      resource: 'CollectionTask',
      resourceId: taskId,
      details: { binId: task.binId, collectedWeightKg },
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
}

export const taskService = new TaskService();
