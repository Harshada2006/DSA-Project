import { prisma } from '../database/client.js';
import { logAuditEvent } from '../middleware/auth.js';

export class EWasteService {
  /**
   * Submit citizen e-waste pickup request
   */
  async submitPickupRequest(citizenUser, data, req) {
    const {
      citizenName,
      citizenEmail,
      contactPhone,
      pickupAddress,
      wardId,
      latitude,
      longitude,
      itemsDescription,
      approximateQuantity,
      estimatedWeightKg,
      preferredPickupDate,
    } = data;

    if (!itemsDescription || !pickupAddress || !contactPhone) {
      throw new Error('Items description, pickup address, and contact phone are required for e-waste pickup.');
    }

    const count = await prisma.eWasteRequest.count();
    const ticketNo = `EW-2026-${String(count + 101).padStart(4, '0')}`;

    const request = await prisma.eWasteRequest.create({
      data: {
        ticketNo,
        citizenId: citizenUser?.id || null,
        citizenName: citizenName || citizenUser?.name || 'Nashik Resident',
        citizenEmail: citizenEmail || citizenUser?.email || '',
        contactPhone: contactPhone.trim(),
        pickupAddress: pickupAddress.trim(),
        wardId: wardId || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        itemsDescription: itemsDescription.trim(),
        approximateQuantity: approximateQuantity || 'Standard electronics batch',
        estimatedWeightKg: estimatedWeightKg ? parseFloat(estimatedWeightKg) : null,
        preferredPickupDate: preferredPickupDate ? new Date(preferredPickupDate) : null,
        status: 'submitted',
      },
    });

    await logAuditEvent({
      userId: citizenUser?.id,
      action: 'EWASTE_REQUEST_SUBMITTED',
      resource: 'EWasteRequest',
      resourceId: request.id,
      details: { ticketNo, itemsDescription },
      req,
    });

    return request;
  }

  /**
   * List e-waste pickup requests with role scoping
   */
  async getRequests(user, filters = {}) {
    const where = {};

    if (user.role === 'CITIZEN') {
      where.citizenId = user.id;
    } else if (user.role === 'WORKER') {
      where.assignedWorkerId = user.id;
    }

    if (filters.status) where.status = filters.status;

    return await prisma.eWasteRequest.findMany({
      where,
      include: {
        citizen: { select: { id: true, name: true, email: true } },
        assignedWorker: { select: { id: true, name: true, email: true } },
        handovers: {
          include: { facility: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Assign worker to e-waste request (Admin only)
   */
  async assignWorker(requestId, workerId, adminUser, req) {
    const request = await prisma.eWasteRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new Error('E-waste request not found.');

    const worker = await prisma.user.findFirst({
      where: { id: workerId, role: 'WORKER' },
    });
    if (!worker) throw new Error('Valid worker not found.');

    const updated = await prisma.eWasteRequest.update({
      where: { id: requestId },
      data: {
        assignedWorkerId: workerId,
        status: 'assigned',
      },
      include: { assignedWorker: { select: { id: true, name: true } } },
    });

    await logAuditEvent({
      userId: adminUser.id,
      action: 'EWASTE_WORKER_ASSIGNED',
      resource: 'EWasteRequest',
      resourceId: requestId,
      details: { workerId, workerName: worker.name },
      req,
    });

    return updated;
  }

  /**
   * Record e-waste collection completion (Worker)
   */
  async recordWorkerCollection(requestId, collectionData, workerUser, req) {
    const request = await prisma.eWasteRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new Error('E-waste request not found.');

    if (workerUser.role === 'WORKER' && request.assignedWorkerId !== workerUser.id) {
      throw new Error('Access denied: You can only update e-waste tasks assigned to you.');
    }

    const { measuredWeightKg, resolutionNotes, status = 'collected' } = collectionData;

    const updated = await prisma.eWasteRequest.update({
      where: { id: requestId },
      data: {
        status,
        collectionDate: new Date(),
        estimatedWeightKg: measuredWeightKg ? parseFloat(measuredWeightKg) : request.estimatedWeightKg,
        resolutionNotes: resolutionNotes || `Collected by ${workerUser.name}`,
      },
    });

    await logAuditEvent({
      userId: workerUser.id,
      action: 'EWASTE_COLLECTION_RECORDED',
      resource: 'EWasteRequest',
      resourceId: requestId,
      details: { measuredWeightKg, status },
      req,
    });

    return updated;
  }

  /**
   * Record handover to verified recycler facility (Worker or Admin)
   */
  async recordFacilityHandover(handoverData, user, req) {
    const {
      facilityId,
      ewasteRequestId,
      measuredWeightKg,
      receiptNumber,
      notes,
    } = handoverData;

    if (!facilityId || !measuredWeightKg) {
      throw new Error('Authorized destination facility and measured weight (kg) are required.');
    }

    const facility = await prisma.facility.findUnique({ where: { id: facilityId } });
    if (!facility) throw new Error('Target destination facility not found.');

    if (facility.verificationStatus !== 'verified') {
      throw new Error('Waste cannot be transferred to an unverified or pending facility.');
    }

    const handover = await prisma.handoverRecord.create({
      data: {
        facilityId,
        ewasteRequestId: ewasteRequestId || null,
        recordedByWorkerId: user.id,
        materialCategory: 'e_waste',
        measuredWeightKg: parseFloat(measuredWeightKg),
        receiptNumber: receiptNumber || null,
        notes: notes || null,
        handoverDate: new Date(),
        provenance: 'observed',
      },
      include: { facility: true },
    });

    // Update e-waste request status if applicable
    if (ewasteRequestId) {
      await prisma.eWasteRequest.update({
        where: { id: ewasteRequestId },
        data: {
          status: 'delivered_to_recycler',
          assignedFacilityId: facilityId,
          resolutionNotes: `Delivered and verified at ${facility.name}. Receipt: ${receiptNumber || 'N/A'}`,
        },
      });
    }

    await logAuditEvent({
      userId: user.id,
      action: 'EWASTE_FACILITY_HANDOVER_RECORDED',
      resource: 'HandoverRecord',
      resourceId: handover.id,
      details: { facilityName: facility.name, weightKg: measuredWeightKg },
      req,
    });

    return handover;
  }
}

export const ewasteService = new EWasteService();
