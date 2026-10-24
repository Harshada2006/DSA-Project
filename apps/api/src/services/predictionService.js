import { prisma } from '../database/client.js';

export class PredictionService {
  /**
   * Calculate sensor-free fullness estimate for a bin
   */
  async predictBinFullness(binId) {
    const bin = await prisma.bin.findUnique({
      where: { id: binId },
      include: {
        ward: true,
        observations: {
          orderBy: { observedAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!bin) throw new Error('Bin not found');

    const now = new Date();

    // Check if any active festival/event affects this bin or area
    const activeEvents = await prisma.festivalEvent.findMany({
      where: {
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });

    let demandMultiplier = 1.0;
    let eventNameApplied = null;
    if (activeEvents.length > 0) {
      // Find event matching ward or citywide
      const matchingEvent = activeEvents.find(
        (e) => e.affectedLocation.includes(bin.ward.name) || e.affectedLocation.includes('All Nashik') || e.affectedLocation.includes(bin.areaCategory)
      ) || activeEvents[0];

      if (matchingEvent) {
        demandMultiplier = matchingEvent.demandMultiplier;
        eventNameApplied = matchingEvent.eventName;
      }
    }

    // Default hourly rate per area category (% per hour)
    let baseHourlyRate = 0.75; // Residential: ~18% per day
    if (bin.areaCategory === 'market') baseHourlyRate = 1.8; // Market: ~43% per day
    else if (bin.areaCategory === 'pilgrimage') baseHourlyRate = 1.5; // Pilgrimage: ~36% per day
    else if (bin.areaCategory === 'commercial') baseHourlyRate = 1.2; // Commercial: ~29% per day
    else if (bin.areaCategory === 'industrial') baseHourlyRate = 0.5;

    // Apply event planning assumption multiplier
    const effectiveHourlyRate = baseHourlyRate * demandMultiplier;

    // Check observation availability
    const lastObservation = bin.observations[0];
    if (!lastObservation) {
      return {
        binId: bin.id,
        binCode: bin.code,
        binName: bin.name,
        wardName: bin.ward.name,
        currentFillPercentage: bin.currentFillPercentage,
        estimatedCurrentFullness: bin.currentFillPercentage,
        lastObservedFullness: null,
        observationAgeHours: null,
        observationDisplay: 'No recorded observations (Insufficient data)',
        confidenceLevel: 'Unknown',
        confidenceScore: 0.1,
        predictionMethod: 'Baseline Area Default Rate',
        eventMultiplierApplied: demandMultiplier,
        activeEventName: eventNameApplied,
        isPlanningAssumption: activeEvents.length > 0,
        explanation: 'Insufficient historical observation data. Showing baseline estimate.',
      };
    }

    const elapsedHours = Math.max(0, (now.getTime() - new Date(lastObservation.observedAt).getTime()) / (1000 * 3600));

    // Linear rate prediction: min(100, lastObserved + rate * elapsedHours)
    const predictedFill = Math.min(100.0, Math.max(0.0, lastObservation.fillPercentage + (effectiveHourlyRate * elapsedHours)));

    // Confidence calculation: decays as observation becomes stale
    let confidenceLevel = 'High';
    let confidenceScore = 0.95;
    if (elapsedHours > 72) {
      confidenceLevel = 'Low';
      confidenceScore = 0.35;
    } else if (elapsedHours > 24) {
      confidenceLevel = 'Medium';
      confidenceScore = 0.65;
    }

    // Human-friendly observation display string
    const ageRounded = Math.round(elapsedHours * 10) / 10;
    let ageString = `${ageRounded} hours ago`;
    if (ageRounded < 1.0) ageString = `${Math.round(ageRounded * 60)} minutes ago`;
    else if (ageRounded >= 24) ageString = `${Math.round(ageRounded / 24)} days ago`;

    const observationDisplay = `Last observed: ${lastObservation.fillPercentage}%, ${ageString}`;
    const estimatedDisplay = `Estimated current fullness: ${Math.round(predictedFill)}%`;

    return {
      binId: bin.id,
      binCode: bin.code,
      binName: bin.name,
      wardName: bin.ward.name,
      areaCategory: bin.areaCategory,
      lastObservedFullness: lastObservation.fillPercentage,
      lastObservationTimestamp: lastObservation.observedAt,
      observationAgeHours: ageRounded,
      observationDisplay,
      estimatedCurrentFullness: Math.round(predictedFill * 10) / 10,
      estimatedDisplay,
      predictedFill24h: Math.min(100.0, Math.round((predictedFill + effectiveHourlyRate * 24) * 10) / 10),
      confidenceLevel,
      confidenceScore,
      effectiveHourlyRate: Math.round(effectiveHourlyRate * 100) / 100,
      eventMultiplierApplied: demandMultiplier,
      activeEventName: eventNameApplied,
      predictionMethod: 'Rate-Based Heuristic with Observation Decay & Event Multiplier',
      explanation: `${estimatedDisplay} (${observationDisplay}, Confidence: ${confidenceLevel}${eventNameApplied ? `, adjusted for ${eventNameApplied}` : ''}). Estimate only; no physical sensors assumed.`,
    };
  }

  /**
   * Get fullness predictions across all registered bins
   */
  async getAllPredictions(wardId) {
    const where = { status: { in: ['active', 'full'] } };
    if (wardId) where.wardId = wardId;

    const bins = await prisma.bin.findMany({
      where,
      select: { id: true },
    });

    const predictions = await Promise.all(bins.map((b) => this.predictBinFullness(b.id)));
    return predictions;
  }
}

export const predictionService = new PredictionService();
