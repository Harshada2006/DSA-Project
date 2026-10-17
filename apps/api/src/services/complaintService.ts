import { prisma } from '../database/client';
import { Complaint, CreateComplaintSchema } from '@eco-collect/shared';
import { z } from 'zod';

export class ComplaintService {
  async listComplaints(options: {
    wardId?: string;
    status?: string;
    severity?: string;
    category?: string;
    search?: string;
  } = {}): Promise<Complaint[]> {
    const where: any = {};
    if (options.wardId) where.wardId = options.wardId;
    if (options.status) where.status = options.status;
    if (options.severity) where.severity = options.severity;
    if (options.category) where.category = options.category;
    if (options.search) {
      where.OR = [
        { ticketNo: { contains: options.search } },
        { description: { contains: options.search } },
      ];
    }

    const complaints = await prisma.complaint.findMany({
      where,
      orderBy: { reportedAt: 'desc' },
      include: {
        ward: { select: { id: true, name: true, code: true } },
      },
    });

    return complaints.map(c => ({
      id: c.id,
      ticketNo: c.ticketNo,
      category: c.category as any,
      description: c.description,
      wardId: c.wardId,
      wardName: c.ward.name,
      latitude: c.latitude,
      longitude: c.longitude,
      photoUrl: c.photoUrl,
      status: c.status as any,
      severity: c.severity as any,
      reportedBy: c.reportedBy,
      assignedVehicleId: c.assignedVehicleId,
      resolutionNotes: c.resolutionNotes,
      reportedAt: c.reportedAt.toISOString(),
      resolvedAt: c.resolvedAt?.toISOString() || null,
      provenance: c.provenance as any,
    }));
  }

  async createComplaint(data: z.infer<typeof CreateComplaintSchema>): Promise<Complaint> {
    const ticketNo = `TCK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const created = await prisma.complaint.create({
      data: {
        ticketNo,
        category: data.category,
        description: data.description,
        wardId: data.wardId,
        latitude: data.latitude,
        longitude: data.longitude,
        photoUrl: data.photoUrl || null,
        severity: data.severity || 'medium',
        reportedBy: data.reportedBy,
        status: 'open',
        provenance: 'observed',
      },
      include: { ward: true },
    });

    return {
      id: created.id,
      ticketNo: created.ticketNo,
      category: created.category as any,
      description: created.description,
      wardId: created.wardId,
      wardName: created.ward.name,
      latitude: created.latitude,
      longitude: created.longitude,
      photoUrl: created.photoUrl,
      status: created.status as any,
      severity: created.severity as any,
      reportedBy: created.reportedBy,
      assignedVehicleId: created.assignedVehicleId,
      resolutionNotes: created.resolutionNotes,
      reportedAt: created.reportedAt.toISOString(),
      resolvedAt: null,
      provenance: created.provenance as any,
    };
  }

  async updateComplaint(
    id: string,
    data: {
      status?: 'open' | 'assigned' | 'in_progress' | 'resolved' | 'rejected';
      assignedVehicleId?: string | null;
      resolutionNotes?: string;
    }
  ) {
    const updateData: any = {};
    if (data.status) {
      updateData.status = data.status;
      if (data.status === 'resolved') {
        updateData.resolvedAt = new Date();
      }
    }
    if (data.assignedVehicleId !== undefined) {
      updateData.assignedVehicleId = data.assignedVehicleId;
    }
    if (data.resolutionNotes) {
      updateData.resolutionNotes = data.resolutionNotes;
    }

    return await prisma.complaint.update({
      where: { id },
      data: updateData,
      include: { ward: true },
    });
  }
}

export const complaintService = new ComplaintService();
