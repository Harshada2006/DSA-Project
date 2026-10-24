import { prisma } from '../database/client.js';

export class ScheduleEventService {
  /**
   * Get collection schedules (Public & Admin)
   */
  async getSchedules(wardId) {
    const where = { isActive: true };
    if (wardId) where.wardId = wardId;

    return await prisma.collectionSchedule.findMany({
      where,
      include: {
        ward: { select: { id: true, name: true, code: true } },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async createSchedule(data) {
    return await prisma.collectionSchedule.create({
      data: {
        wardId: data.wardId,
        shiftName: data.shiftName,
        startTime: data.startTime,
        endTime: data.endTime,
        daysOfWeek: data.daysOfWeek,
        frequency: data.frequency || 'Daily',
        wasteType: data.wasteType || 'general',
        notes: data.notes || null,
        isActive: true,
      },
      include: { ward: true },
    });
  }

  /**
   * Get festival events (Public & Admin)
   */
  async getEvents() {
    return await prisma.festivalEvent.findMany({
      orderBy: { startDate: 'asc' },
    });
  }

  async createEvent(data) {
    return await prisma.festivalEvent.create({
      data: {
        eventName: data.eventName.trim(),
        affectedLocation: data.affectedLocation.trim(),
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        expectedActivityLevel: data.expectedActivityLevel || 'high',
        wasteCategoriesAffected: data.wasteCategoriesAffected || 'organic, general',
        demandMultiplier: parseFloat(data.demandMultiplier) || 1.5,
        additionalCollectionRequirements: data.additionalCollectionRequirements || null,
        isPlanningAssumption: true,
        notes: data.notes || 'Civic planning assumption; empirical multiplier applied during date range.',
      },
    });
  }
}

export const scheduleEventService = new ScheduleEventService();
