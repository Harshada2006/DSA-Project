import { prisma } from '../database/client.js';
import { logAuditEvent } from '../middleware/auth.js';

export class EWasteService {
  /**
   * Submit citizen e-waste pickup request.
   * Simple form with non-essential fields optional.
   */
  async submitPickupRequest(citizenUser, data, req) {
    const {
      category,
      approximateQuantity,
      itemCount,
      weightKg,
      pickupAddress,
      address,
      preferredPickupDate,
      preferredDate,
      preferredTimeSlot,
      description,
      itemsDescription,
      photoUrl,
      contactPhone,
      latitude,
      longitude,
    } = data;

    const effectiveDesc = description?.trim() || itemsDescription?.trim() || `${category || 'Electronic waste'} pickup`;
    const effectiveAddress = (pickupAddress || address)?.trim();

    if (!effectiveAddress) {
      throw new Error('Pickup address is required to arrange doorstep e-waste collection.');
    }

    const effectiveQuantity =
      approximateQuantity?.trim() ||
      (itemCount ? `${itemCount} items` : null) ||
      (weightKg ? `${weightKg} kg` : null) ||
      'Standard electronics batch';

    const effectiveDate = preferredPickupDate || preferredDate;
    const phone = contactPhone?.trim() || citizenUser?.workerProfile?.phone || citizenUser?.phone || 'Not provided';

    const count = await prisma.eWasteRequest.count();
    const ticketNo = `EW-2026-${String(count + 101).padStart(4, '0')}`;

    const request = await prisma.eWasteRequest.create({
      data: {
        ticketNo,
        citizenId: citizenUser?.id || null,
        citizenName: citizenUser?.name || 'Nashik Resident',
        citizenEmail: citizenUser?.email || '',
        contactPhone: phone,
        pickupAddress: effectiveAddress,
        itemsDescription: effectiveDesc,
        approximateQuantity: effectiveQuantity,
        preferredPickupDate: effectiveDate ? new Date(effectiveDate) : null,
        status: 'submitted',
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
      },
    });

    await logAuditEvent({
      userId: citizenUser?.id,
      action: 'EWASTE_REQUEST_SUBMITTED',
      resource: 'EWasteRequest',
      resourceId: request.id,
      details: { ticketNo, effectiveDesc },
      req,
    });

    return {
      ...request,
      trackingNumber: request.ticketNo,
      preferredDate: request.preferredPickupDate ? request.preferredPickupDate.toISOString().split('T')[0] : null,
    };
  }

  /**
   * List e-waste pickup requests with role scoping
   */
  async getRequests(user, filters = {}) {
    const where = {};

    if (user.role === 'CITIZEN') {
      where.citizenId = user.id;
    } else if (user.role === 'WORKER') {
      // Worker sees assigned or open collectable requests
      where.OR = [
        { assignedWorkerId: user.id },
        { status: 'assigned' },
      ];
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

    if (workerUser.role === 'WORKER' && request.assignedWorkerId && request.assignedWorkerId !== workerUser.id) {
      throw new Error('Access denied: You can only update e-waste tasks assigned to you.');
    }

    const { measuredWeightKg, resolutionNotes } = collectionData;

    const updated = await prisma.eWasteRequest.update({
      where: { id: requestId },
      data: {
        status: 'collected',
        collectionDate: new Date(),
        assignedWorkerId: workerUser.id,
        estimatedWeightKg: measuredWeightKg ? parseFloat(measuredWeightKg) : request.estimatedWeightKg,
        resolutionNotes: resolutionNotes || `Collected by ${workerUser.name}. Ready for recycler handover.`,
      },
    });

    await logAuditEvent({
      userId: workerUser.id,
      action: 'EWASTE_COLLECTION_RECORDED',
      resource: 'EWasteRequest',
      resourceId: requestId,
      details: { measuredWeightKg, status: 'collected' },
      req,
    });

    return updated;
  }

  /**
   * Record handover to destination facility (Worker or Admin)
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
      throw new Error('Destination facility and measured weight (kg) are required.');
    }

    const facility = await prisma.facility.findUnique({ where: { id: facilityId } });
    if (!facility) throw new Error('Destination facility not found.');

    // Validate that facility is eligible for e-waste
    if (facility.facilityType === 'scrap_dealer') {
      throw new Error('General scrap dealers cannot be selected as authorized e-waste destinations.');
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

    // Update e-waste request status to completed / delivered
    if (ewasteRequestId) {
      await prisma.eWasteRequest.update({
        where: { id: ewasteRequestId },
        data: {
          status: 'delivered_to_recycler',
          assignedFacilityId: facilityId,
          resolutionNotes: `Delivered to ${facility.name}. Receipt: ${receiptNumber || 'Confirmed by crew'}.`,
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
