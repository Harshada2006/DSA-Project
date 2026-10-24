import { prisma } from '../database/client.js';
import { logAuditEvent } from '../middleware/auth.js';

export class ComplaintService {
  /**
   * Submit citizen complaint
   */
  async submitComplaint(citizenUser, complaintData, req) {
    const {
      category,
      description,
      wardId,
      binId,
      addressText,
      latitude,
      longitude,
      photoUrl,
      severity,
    } = complaintData;

    if (!category || !description || !wardId) {
      throw new Error('Complaint category, description, and municipal ward are required.');
    }

    // Generate unique complaint ticket: CMP-2026-XXXX
    const count = await prisma.complaint.count();
    const ticketNo = `CMP-2026-${String(count + 1001).padStart(5, '0')}`;

    const complaint = await prisma.complaint.create({
      data: {
        ticketNo,
        citizenId: citizenUser?.id || null,
        category,
        description: description.trim(),
        wardId,
        binId: binId || null,
        addressText: addressText || null,
        latitude: parseFloat(latitude) || 20.005,
        longitude: parseFloat(longitude) || 73.785,
        photoUrl: photoUrl || null,
        severity: severity || 'medium',
        status: 'submitted',
        reportedBy: citizenUser?.name || 'Nashik Resident',
        provenance: 'observed',
        updates: {
          create: {
            previousStatus: 'none',
            newStatus: 'submitted',
            publicComment: 'Complaint registered successfully in the EcoNexus civic system.',
            internalNotes: 'Automated initial intake record created.',
            updatedBy: citizenUser?.name || 'Citizen Intake',
          },
        },
      },
      include: {
        ward: true,
        bin: true,
        updates: true,
      },
    });

    await logAuditEvent({
      userId: citizenUser?.id,
      action: 'COMPLAINT_SUBMITTED',
      resource: 'Complaint',
      resourceId: complaint.id,
      details: { ticketNo, category },
      req,
    });

    return complaint;
  }

  /**
   * List complaints with role-based scoping
   */
  async getComplaints(user, filters = {}) {
    const where = {};

    // Citizens can ONLY view their own private complaints
    if (user.role === 'CITIZEN') {
      where.citizenId = user.id;
    }

    if (filters.status) where.status = filters.status;
    if (filters.wardId) where.wardId = filters.wardId;
    if (filters.severity) where.severity = filters.severity;
    if (filters.search) {
      where.OR = [
        { ticketNo: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }

    return await prisma.complaint.findMany({
      where,
      include: {
        ward: { select: { id: true, name: true, code: true } },
        bin: { select: { id: true, code: true, name: true } },
      },
      orderBy: { reportedAt: 'desc' },
    });
  }

  /**
   * Get complaint details with role-aware privacy protection
   */
  async getComplaintDetails(complaintId, user) {
    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
      include: {
        ward: true,
        bin: true,
        updates: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!complaint) throw new Error('Complaint record not found.');

    // Enforce citizen ownership check
    if (user.role === 'CITIZEN' && complaint.citizenId !== user.id) {
      throw new Error('Access denied: You do not have permission to view this complaint.');
    }

    // Mask internal notes for citizen users
    if (user.role === 'CITIZEN') {
      const sanitizedUpdates = complaint.updates.map((u) => ({
        id: u.id,
        previousStatus: u.previousStatus,
        newStatus: u.newStatus,
        publicComment: u.publicComment,
        updatedBy: u.updatedBy,
        createdAt: u.createdAt,
      }));
      return { ...complaint, updates: sanitizedUpdates };
    }

    return complaint;
  }

  /**
   * Update complaint status and log timeline update (Admin / Worker)
   */
  async updateComplaintStatus(complaintId, updateData, user, req) {
    const { status, publicComment, internalNotes, resolutionNotes } = updateData;

    const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
    if (!complaint) throw new Error('Complaint not found.');

    const previousStatus = complaint.status;
    const now = new Date();

    const updated = await prisma.$transaction([
      prisma.complaint.update({
        where: { id: complaintId },
        data: {
          status: status || previousStatus,
          resolutionNotes: resolutionNotes || complaint.resolutionNotes,
          resolvedAt: status === 'resolved' ? now : complaint.resolvedAt,
          updatedAt: now,
        },
      }),
      prisma.complaintUpdate.create({
        data: {
          complaintId,
          previousStatus,
          newStatus: status || previousStatus,
          publicComment: publicComment || `Status updated to ${status} by municipal staff.`,
          internalNotes: internalNotes || null,
          updatedBy: user.name,
        },
      }),
    ]);

    await logAuditEvent({
      userId: user.id,
      action: 'COMPLAINT_STATUS_UPDATED',
      resource: 'Complaint',
      resourceId: complaintId,
      details: { previousStatus, newStatus: status },
      req,
    });

    return updated[0];
  }
}

export const complaintService = new ComplaintService();
