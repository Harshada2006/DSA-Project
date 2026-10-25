import { prisma } from '../database/client.js';
import { logAuditEvent } from '../middleware/auth.js';

export class IssueService {
  /**
   * Report an operational issue (Worker or Admin)
   */
  async reportIssue(user, issueData, req) {
    const {
      issueType,
      taskId,
      binId,
      roadEdgeId,
      roadName,
      locationText,
      latitude,
      longitude,
      description,
      photoUrl,
    } = issueData;

    if (!issueType) {
      throw new Error('Issue type is required.');
    }

    const count = await prisma.operationalIssue.count();
    const ticketNo = `ISS-2026-${String(count + 101).padStart(4, '0')}`;

    let lat = latitude ? parseFloat(latitude) : null;
    let lng = longitude ? parseFloat(longitude) : null;

    // If taskId is provided, pull coordinates from task's bin
    if (taskId && (!lat || !lng)) {
      const task = await prisma.collectionTask.findUnique({
        where: { id: taskId },
        include: { bin: true },
      });
      if (task?.bin) {
        lat = task.bin.latitude;
        lng = task.bin.longitude;
      }
    }

    const issue = await prisma.operationalIssue.create({
      data: {
        ticketNo,
        issueType,
        workerId: user?.id || null,
        taskId: taskId || null,
        binId: binId || null,
        roadEdgeId: roadEdgeId || null,
        locationText: locationText || roadName || (lat && lng ? `Near Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}` : 'Nashik Municipal Area'),
        latitude: lat,
        longitude: lng,
        description: description?.trim() || `Operational issue: ${issueType.replace(/_/g, ' ')}`,
        photoUrl: photoUrl || null,
        status: issueType === 'blocked_road' ? 'active_roadblock' : 'reported',
      },
      include: {
        worker: { select: { id: true, name: true, email: true } },
        task: { include: { bin: true } },
      },
    });

    // If road is reported blocked, mark relevant road edge as blocked
    if (issueType === 'blocked_road') {
      let edgeToBlock = null;
      if (roadEdgeId) {
        edgeToBlock = await prisma.roadEdge.findUnique({ where: { id: roadEdgeId } });
      } else if (roadName) {
        edgeToBlock = await prisma.roadEdge.findFirst({
          where: { roadName: { contains: roadName } },
        });
      } else if (lat && lng) {
        // Find nearest edge or node
        edgeToBlock = await prisma.roadEdge.findFirst();
      }

      if (edgeToBlock) {
        await prisma.roadEdge.update({
          where: { id: edgeToBlock.id },
          data: {
            isBlocked: true,
            blockedReason: description || 'Reported blocked road',
            blockedAt: new Date(),
          },
        });
        await prisma.operationalIssue.update({
          where: { id: issue.id },
          data: { roadEdgeId: edgeToBlock.id },
        });
      }
    }

    await logAuditEvent({
      userId: user?.id,
      action: 'OPERATIONAL_ISSUE_REPORTED',
      resource: 'OperationalIssue',
      resourceId: issue.id,
      details: { ticketNo, issueType },
      req,
    });

    return issue;
  }

  /**
   * Get all issues with role scoping
   */
  async getIssues(user, filters = {}) {
    const where = {};

    if (user.role === 'WORKER') {
      // Workers see their own reported issues or active roadblocks
      where.OR = [
        { workerId: user.id },
        { issueType: 'blocked_road' },
      ];
    }

    if (filters.issueType) where.issueType = filters.issueType;
    if (filters.status) where.status = filters.status;

    return await prisma.operationalIssue.findMany({
      where,
      include: {
        worker: { select: { id: true, name: true, email: true } },
        task: { include: { bin: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get all currently active roadblocks
   */
  async getActiveRoadblocks() {
    const blockedEdges = await prisma.roadEdge.findMany({
      where: { isBlocked: true },
    });

    const activeReports = await prisma.operationalIssue.findMany({
      where: {
        issueType: 'blocked_road',
        status: { in: ['reported', 'active_roadblock', 'investigating'] },
      },
      include: {
        worker: { select: { id: true, name: true } },
      },
    });

    return {
      blockedEdges,
      activeReports,
      count: blockedEdges.length + activeReports.length,
    };
  }

  /**
   * Mark a road edge blocked or unblocked (Admin or Worker)
   */
  async toggleRoadblock(edgeId, isBlocked, reason, user, req) {
    const edge = await prisma.roadEdge.findUnique({ where: { id: edgeId } });
    if (!edge) throw new Error('Road edge not found.');

    const updated = await prisma.roadEdge.update({
      where: { id: edgeId },
      data: {
        isBlocked: !!isBlocked,
        blockedReason: isBlocked ? (reason || 'Road closure active') : null,
        blockedAt: isBlocked ? new Date() : null,
      },
    });

    await logAuditEvent({
      userId: user?.id,
      action: isBlocked ? 'ROADBLOCK_ACTIVATED' : 'ROADBLOCK_CLEARED',
      resource: 'RoadEdge',
      resourceId: edgeId,
      details: { roadName: edge.roadName, isBlocked },
      req,
    });

    return updated;
  }

  /**
   * Update issue status / resolution (Admin)
   */
  async updateIssueStatus(id, updateData, adminUser, req) {
    const { status, resolutionNotes } = updateData;

    const issue = await prisma.operationalIssue.findUnique({ where: { id } });
    if (!issue) throw new Error('Issue not found.');

    const updated = await prisma.operationalIssue.update({
      where: { id },
      data: {
        status: status || issue.status,
        resolutionNotes: resolutionNotes || issue.resolutionNotes,
        resolvedAt: status === 'resolved' ? new Date() : issue.resolvedAt,
      },
    });

    // If resolving a blocked road, also unblock the associated roadEdge
    if (status === 'resolved' && issue.roadEdgeId) {
      await prisma.roadEdge.update({
        where: { id: issue.roadEdgeId },
        data: {
          isBlocked: false,
          blockedReason: null,
          blockedAt: null,
        },
      }).catch(() => {});
    }

    await logAuditEvent({
      userId: adminUser.id,
      action: 'OPERATIONAL_ISSUE_RESOLVED',
      resource: 'OperationalIssue',
      resourceId: id,
      details: { status, resolutionNotes },
      req,
    });

    return updated;
  }
}

export const issueService = new IssueService();
