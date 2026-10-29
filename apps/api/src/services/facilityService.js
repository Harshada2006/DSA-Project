import { prisma } from '../database/client.js';

export class FacilityService {
  async getFacilities(filters = {}) {
    const where = {};
    if (filters.facilityType) {
      const ft = filters.facilityType.toLowerCase();
      if (ft === 'recycler' || ft === 'verified_ewaste_recycler') {
        where.facilityType = { in: ['verified_ewaste_recycler', 'ewaste_refurbisher'] };
      } else {
        where.facilityType = filters.facilityType;
      }
    }
    if (filters.verificationStatus) {
      where.verificationStatus = filters.verificationStatus;
    }
    if (filters.wasteType) {
      where.acceptedWasteCategories = { contains: filters.wasteType };
    }
    if (filters.excludeScrapDealers === 'true' || filters.verifiedRecyclerOnly === 'true') {
      where.facilityType = { in: ['verified_ewaste_recycler', 'ewaste_refurbisher'] };
      where.verificationStatus = 'verified';
    }

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
    if (!data || !data.name || !data.name.trim()) {
      throw new Error('Facility name is required.');
    }

    const rawAddress = data.address || data.facilityAddress || data.businessAddress;
    if (!rawAddress || typeof rawAddress !== 'string' || !rawAddress.trim()) {
      throw new Error('Facility address is required.');
    }

    return await prisma.facility.create({
      data: {
        name: data.name.trim(),
        facilityType: data.facilityType || 'verified_ewaste_recycler',
        address: rawAddress.trim(),
        latitude: parseFloat(data.latitude) || 19.9975,
        longitude: parseFloat(data.longitude) || 73.7898,
        acceptedWasteCategories: typeof data.acceptedWasteCategories === 'string'
          ? data.acceptedWasteCategories
          : JSON.stringify(data.acceptedWasteCategories || ['electronic']),
        authorizationNumber: data.authorizationNumber || null,
        authorizationValidUntil: data.authorizationValidUntil ? new Date(data.authorizationValidUntil) : null,
        verificationStatus: data.verificationStatus || 'unverified',
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
