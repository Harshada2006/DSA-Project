import { prisma } from '../database/client.js';
import { logAuditEvent } from '../middleware/auth.js';

function calculateInternalSeverity(category, ward) {
  const cat = String(category || '').toLowerCase();
  const wardName = String(ward?.name || '').toLowerCase();

  // Sensitive zones or severe hazards receive higher internal priority
  if (wardName.includes('panchavati') || wardName.includes('ramkund') || cat.includes('hazardous') || cat.includes('dumping')) {
    return 'critical';
  }
  if (cat.includes('overflow') || cat.includes('damaged')) {
    return 'high';
  }
  return 'medium';
}

export class ComplaintService {
  /**
   * Submit citizen complaint without forcing manual urgency or bin selection.
   * Description and exact coords are optional.
   */
  async submitComplaint(citizenUser, complaintData, req) {
    const {
      title,
      category,
      description,
      wardId,
      addressText,
      landmark,
      latitude,
      longitude,
      photoUrl,
    } = complaintData;

    if (!category) {
      throw new Error('Complaint category is required.');
    }

    // Resolve Ward
    let ward = null;
    if (wardId) {
      ward = await prisma.ward.findUnique({ where: { id: wardId } });
    }
    if (!ward) {
      ward = await prisma.ward.findFirst();
    }
    if (!ward) {
      throw new Error('Municipal ward or area must be specified.');
    }

    const effectiveTitle = title?.trim() || `${category.replace(/_/g, ' ').toUpperCase()} Grievance`;
    const effectiveDesc = description?.trim() || `Reported ${category.replace(/_/g, ' ')} in ${ward.name}.`;
    const calculatedSeverity = calculateInternalSeverity(category, ward);

    // Resolve coordinates (fallback to ward center if exact coords not provided)
    const lat = latitude !== undefined && latitude !== null && !isNaN(parseFloat(latitude))
      ? parseFloat(latitude)
      : ward.latitude;
    const lng = longitude !== undefined && longitude !== null && !isNaN(parseFloat(longitude))
      ? parseFloat(longitude)
      : ward.longitude;

    // Generate unique complaint ticket: CMP-2026-XXXX
    const count = await prisma.complaint.count();
    const ticketNo = `CMP-2026-${String(count + 1001).padStart(5, '0')}`;

    const locationString = addressText || landmark || `${ward.name}, Nashik`;

    const complaint = await prisma.complaint.create({
      data: {
        ticketNo,
        citizenId: citizenUser?.id || null,
        category,
        description: effectiveDesc,
        wardId: ward.id,
        addressText: locationString,
        latitude: lat,
        longitude: lng,
        photoUrl: photoUrl || null,
        severity: calculatedSeverity,
        status: 'submitted',
        reportedBy: citizenUser?.name || 'Nashik Resident',
        provenance: 'observed',
        updates: {
          create: {
            previousStatus: 'none',
            newStatus: 'submitted',
            publicComment: `Complaint registered under ticket #${ticketNo}. Assigned to NMC ${ward.name} sanitary inspection.`,
            internalNotes: `Initial intake. Calculated internal urgency: ${calculatedSeverity}.`,
            updatedBy: citizenUser?.name || 'Citizen Portal',
          },
        },
      },
      include: {
        ward: true,
        updates: true,
      },
    });

    await logAuditEvent({
      userId: citizenUser?.id,
      action: 'COMPLAINT_SUBMITTED',
      resource: 'Complaint',
      resourceId: complaint.id,
      details: { ticketNo, category, ward: ward.name },
      req,
    });

    return complaint;
  }

  /**
   * List complaints with role-based scoping
   */
  async getComplaints(user, filters = {}) {
    const where = {};

    // Citizens can ONLY view their own complaints
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
        { addressText: { contains: filters.search } },
      ];
    }

    return await prisma.complaint.findMany({
      where,
      include: {
        ward: { select: { id: true, name: true, code: true } },
        bin: { select: { id: true, code: true, name: true } },
        citizen: { select: { id: true, name: true, email: true } },
        updates: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get single complaint details
   */
  async getComplaint(id, user) {
    const complaint = await prisma.complaint.findUnique({
      where: { id },
      include: {
        ward: true,
        bin: true,
        citizen: { select: { id: true, name: true, email: true } },
        updates: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!complaint) throw new Error('Complaint ticket not found.');

    if (user.role === 'CITIZEN' && complaint.citizenId !== user.id) {
      throw new Error('Access denied: You do not have permission to view this complaint.');
    }

    return complaint;
  }

  async getComplaintDetails(id, user) {
    return this.getComplaint(id, user);
  }

  /**
   * Update complaint status (Admin / Field Inspector)
   */
  async updateComplaintStatus(id, updateData, adminUser, req) {
    const { status, publicComment, internalNotes, assignedVehicleId } = updateData;

    const existing = await prisma.complaint.findUnique({ where: { id } });
    if (!existing) throw new Error('Complaint not found.');

    const updated = await prisma.complaint.update({
      where: { id },
      data: {
        status: status || existing.status,
        assignedVehicleId: assignedVehicleId || existing.assignedVehicleId,
        resolvedAt: status === 'resolved' ? new Date() : existing.resolvedAt,
        resolutionNotes: publicComment || existing.resolutionNotes,
        updates: {
          create: {
            previousStatus: existing.status,
            newStatus: status || existing.status,
            publicComment: publicComment || `Status updated to ${status}.`,
            internalNotes: internalNotes || null,
            updatedBy: adminUser.name,
          },
        },
      },
      include: {
        ward: true,
        updates: true,
      },
    });

    await logAuditEvent({
      userId: adminUser.id,
      action: 'COMPLAINT_STATUS_UPDATED',
      resource: 'Complaint',
      resourceId: id,
      details: { previousStatus: existing.status, newStatus: status },
      req,
    });

    return updated;
  }
}

export const complaintService = new ComplaintService();
