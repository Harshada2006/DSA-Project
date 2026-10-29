import { prisma } from '../database/client.js';
import { logAuditEvent } from '../middleware/auth.js';

export class EWasteService {
  /* ============================================================
   * MODULE 1: Citizen E-Waste Pickup Booking & Validation
   * Accepts resident e-waste pickup requests with contact & location
   * ============================================================ */
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
        citizenEmail: (citizenUser?.email || '').trim().toLowerCase(),
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
      category: request.itemsDescription,
      address: request.pickupAddress,
      preferredDate: request.preferredPickupDate ? request.preferredPickupDate.toISOString().split('T')[0] : null,
    };
  }

  /* ============================================================
   * MODULE: E-Waste Requests Retrieval & Role Scoping
   * Citizens see their requests; Workers see assigned; Admin sees all
   * ============================================================ */
  async getRequests(user, filters = {}) {
    const where = {};

    if (user.role === 'CITIZEN') {
      const emailLower = (user.email || '').toLowerCase();
      where.OR = [
        { citizenId: user.id },
        { citizenEmail: emailLower },
        { citizenEmail: user.email },
      ];
    } else if (user.role === 'WORKER') {
      // Worker sees assigned or open collectable requests
      where.OR = [
        { assignedWorkerId: user.id },
        { status: 'assigned' },
      ];
    }

    if (filters.status) where.status = filters.status;

    const list = await prisma.eWasteRequest.findMany({
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

    // Normalize field aliases so frontend never encounters undefined properties
    return list.map((r) => ({
      ...r,
      trackingNumber: r.ticketNo,
      category: r.itemsDescription || 'Electronic Waste',
      address: r.pickupAddress,
      description: r.itemsDescription,
      preferredDate: r.preferredPickupDate ? r.preferredPickupDate.toISOString().split('T')[0] : null,
    }));
  }

  /* ============================================================
   * MODULE 3: Municipal Worker Assignment & Dispatch
   * Assigns field worker and compactor van to pickup task
   * ============================================================ */
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

  /* ============================================================
   * MODULE 4: Field Doorstep Collection Verification
   * Worker confirms pickup, measured weight, and updates status
   * ============================================================ */
  async recordWorkerCollection(requestId, collectionData = {}, workerUser, req) {
    const request = await prisma.eWasteRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new Error('E-waste request not found.');

    if (workerUser.role === 'WORKER' && request.assignedWorkerId && request.assignedWorkerId !== workerUser.id) {
      throw new Error('Access denied: You can only update e-waste tasks assigned to you.');
    }

    const currentStatus = (request.status || '').toLowerCase();
    if (currentStatus === 'delivered_to_recycler') {
      throw new Error('This e-waste request has already been handed over to a verified recycler.');
    }

    const rawWeight = collectionData.measuredWeightKg ?? collectionData.actualWeightKg ?? collectionData.weightKg;
    const notes = collectionData.resolutionNotes ?? collectionData.notes;

    const updated = await prisma.eWasteRequest.update({
      where: { id: requestId },
      data: {
        status: 'collected',
        collectionDate: new Date(),
        assignedWorkerId: workerUser.id,
        estimatedWeightKg: rawWeight !== undefined && rawWeight !== null ? parseFloat(rawWeight) : request.estimatedWeightKg,
        resolutionNotes: notes || `Collected by ${workerUser.name}. Ready for recycler handover.`,
      },
    });

    await logAuditEvent({
      userId: workerUser.id,
      action: 'EWASTE_COLLECTION_RECORDED',
      resource: 'EWasteRequest',
      resourceId: requestId,
      details: { measuredWeightKg: rawWeight, status: 'collected' },
      req,
    });

    return updated;
  }

  /* ============================================================
   * MODULE 5: Authorized Recycler Facility Handover & Manifest
   * Logs chain-of-custody transfer to verified recycling facility
   * ============================================================ */
  async recordFacilityHandover(handoverData, user, req) {
    const {
      facilityId,
      ewasteRequestId,
      notes,
    } = handoverData;

    const rawWeight = handoverData.measuredWeightKg ?? handoverData.weightKg ?? handoverData.actualWeightKg;
    const rawReceipt = handoverData.receiptNumber ?? handoverData.manifestNumber ?? handoverData.certificateNumber;

    if (!facilityId) {
      throw new Error('Destination facility is required.');
    }

    const weight = parseFloat(rawWeight);
    if (isNaN(weight) || weight <= 0) {
      throw new Error('Destination facility and valid measured weight (kg) are required.');
    }

    const facility = await prisma.facility.findUnique({ where: { id: facilityId } });
    if (!facility) throw new Error('Destination facility not found.');

    // Validate that facility is eligible for e-waste
    if (facility.facilityType === 'scrap_dealer') {
      throw new Error('General scrap dealers cannot be selected as authorized e-waste destinations.');
    }

    let targetRequest = null;
    if (ewasteRequestId) {
      targetRequest = await prisma.eWasteRequest.findUnique({ where: { id: ewasteRequestId } });
      if (!targetRequest) throw new Error('Referenced e-waste request not found.');
      const reqStatus = (targetRequest.status || '').toLowerCase();
      if (reqStatus === 'delivered_to_recycler') {
        throw new Error('This e-waste request has already been delivered to a verified recycler.');
      }
    }

    const workerId = user?.id || (await prisma.user.findFirst({ where: { role: 'worker' } }))?.id || 'worker-system';

    // Execute handover and status update in a transaction
    const [handover] = await prisma.$transaction([
      prisma.handoverRecord.create({
        data: {
          facilityId,
          ewasteRequestId: ewasteRequestId || null,
          recordedByWorkerId: workerId,
          materialCategory: 'e_waste',
          measuredWeightKg: weight,
          receiptNumber: rawReceipt ? String(rawReceipt).trim() : null,
          notes: notes ? String(notes).trim() : null,
          handoverDate: new Date(),
          provenance: 'observed',
        },
        include: { facility: true },
      }),
      ...(ewasteRequestId
        ? [
            prisma.eWasteRequest.update({
              where: { id: ewasteRequestId },
              data: {
                status: 'delivered_to_recycler',
                assignedFacilityId: facilityId,
                resolutionNotes: `Delivered to ${facility.name}. Receipt/Manifest: ${rawReceipt || 'Confirmed by crew'}.`,
              },
            }),
          ]
        : []),
    ]);

    if (user?.id) {
      await logAuditEvent({
        userId: user.id,
        action: 'EWASTE_FACILITY_HANDOVER_RECORDED',
        resource: 'HandoverRecord',
        resourceId: handover.id,
        details: { facilityName: facility.name, weightKg: weight, ewasteRequestId },
        req,
      });
    }

    return handover;
  }
}

export const ewasteService = new EWasteService();
