import { prisma } from '../database/client.js';

export class FacilityService {
  async getFacilities(filters = {}) {
    const where = {};
    if (filters.facilityType) where.facilityType = filters.facilityType;
    if (filters.verificationStatus) where.verificationStatus = filters.verificationStatus;

    return await prisma.facility.findMany({
      where,
      include: {
        handovers: {
          take: 5,
          orderBy: { handoverDate: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getFacilityById(id) {
    const facility = await prisma.facility.findUnique({
      where: { id },
      include: {
        handovers: {
          orderBy: { handoverDate: 'desc' },
          take: 10,
        },
      },
    });
    if (!facility) throw new Error('Facility record not found.');
    return facility;
  }

  async createFacility(data) {
    return await prisma.facility.create({
      data: {
        name: data.name.trim(),
        facilityType: data.facilityType || 'verified_ewaste_recycler',
        address: data.address.trim(),
        latitude: parseFloat(data.latitude) || 19.9975,
        longitude: parseFloat(data.longitude) || 73.7898,
        acceptedWasteCategories: typeof data.acceptedWasteCategories === 'string'
          ? data.acceptedWasteCategories
          : JSON.stringify(data.acceptedWasteCategories || ['electronic']),
        authorizationNumber: data.authorizationNumber || null,
        authorizationValidUntil: data.authorizationValidUntil ? new Date(data.authorizationValidUntil) : null,
        verificationStatus: data.verificationStatus || 'verified',
        sourceOrganization: data.sourceOrganization || 'Maharashtra Pollution Control Board (MPCB)',
        sourceUrl: data.sourceUrl || null,
        contactPerson: data.contactPerson || null,
        contactPhone: data.contactPhone || null,
        provenance: data.provenance || 'imported',
      },
    });
  }

  async updateVerificationStatus(id, status, notes) {
    return await prisma.facility.update({
      where: { id },
      data: {
        verificationStatus: status,
        updatedAt: new Date(),
      },
    });
  }
}

export const facilityService = new FacilityService();
