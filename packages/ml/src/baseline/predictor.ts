import { Bin, PredictionResult, UrgencyLevel } from '@eco-collect/shared';

export interface BaselinePredictionOptions {
  thresholdPercentage?: number; // default 80%
  defaultDailyFillIncrease?: number; // fallback e.g. 15%
}

export function computeBaselinePrediction(
  bin: Bin,
  recentObservations: { fillPercentage: number; observedAt: string }[] = [],
  options: BaselinePredictionOptions = {}
): PredictionResult {
  const threshold = options.thresholdPercentage ?? 80;
  const defaultDailyRate = options.defaultDailyFillIncrease ?? 18.0;
  const now = new Date();

  let edgeCase: string | null = null;
  let estimatedDailyRate = defaultDailyRate;
  let confidence = 0.85;

  const currentFill = bin.currentFillPercentage ?? 0;

  // Edge case 1: Already at or above collection threshold
  if (currentFill >= threshold) {
    edgeCase = 'Bin currently exceeds collection threshold';
    return {
      binId: bin.id,
      binCode: bin.code,
      binName: bin.name,
      wardName: bin.wardName || 'Nashik Ward',
      currentFill,
      predictedFill24h: Math.min(100, currentFill + 10),
      predictedFill48h: Math.min(100, currentFill + 20),
      timeToThresholdHours: 0,
      thresholdCrossingTime: now.toISOString(),
      urgencyCategory: 'critical',
      modelVersion: 'baseline-linear-v1.0',
      modelType: 'baseline_linear_rate',
      confidenceScore: 0.95,
      uncertaintyMargin: 2.0,
      edgeCaseEncountered: edgeCase,
      provenance: bin.provenance,
      predictionTimestamp: now.toISOString(),
    };
  }

  // Edge case 2: Compute accumulation rate from observations if available
  if (recentObservations.length >= 2) {
    const sorted = [...recentObservations].sort(
      (a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime()
    );
    const oldest = sorted[0];
    const newest = sorted[sorted.length - 1];
    const hoursSpan = (new Date(newest.observedAt).getTime() - new Date(oldest.observedAt).getTime()) / (1000 * 3600);

    if (hoursSpan >= 2) {
      const deltaFill = newest.fillPercentage - oldest.fillPercentage;
      const hourlyRate = deltaFill / hoursSpan;
      const derivedDailyRate = hourlyRate * 24;

      // Edge case 3: Non-positive or erratic accumulation rate
      if (derivedDailyRate <= 1.0) {
        edgeCase = 'Zero or non-positive accumulation detected; applying category baseline rate';
        estimatedDailyRate = getAreaPriorRate(bin.areaCategory);
        confidence = 0.55;
      } else if (derivedDailyRate > 80.0) {
        edgeCase = 'Anomalously high accumulation rate; capping at plausible maximum';
        estimatedDailyRate = 60.0;
        confidence = 0.65;
      } else {
        estimatedDailyRate = derivedDailyRate;
        confidence = Math.min(0.9, 0.6 + (recentObservations.length * 0.05));
      }
    } else {
      edgeCase = 'Observation time window too narrow; applying prior accumulation rate';
      estimatedDailyRate = getAreaPriorRate(bin.areaCategory);
      confidence = 0.6;
    }
  } else {
    // Edge case 4: Missing observations
    edgeCase = 'Insufficient observation history; using area type heuristic rate';
    estimatedDailyRate = getAreaPriorRate(bin.areaCategory);
    confidence = 0.45;
  }

  // Edge case 5: Stale observation check
  if (bin.lastObservedAt) {
    const hoursSinceLastObservation = (now.getTime() - new Date(bin.lastObservedAt).getTime()) / (1000 * 3600);
    if (hoursSinceLastObservation > 48) {
      edgeCase = edgeCase 
        ? `${edgeCase} | Stale observation (${Math.round(hoursSinceLastObservation)}h old)`
        : `Observation is stale (${Math.round(hoursSinceLastObservation)}h old)`;
      confidence *= 0.7;
    }
  }

  // Linear formula: time_to_threshold = (threshold_fill - current_fill) / (daily_rate / 24)
  const hourlyRate = estimatedDailyRate / 24.0;
  const remainingFillToThreshold = Math.max(0, threshold - currentFill);
  const timeToThresholdHours = remainingFillToThreshold / hourlyRate;

  const thresholdDate = new Date(now.getTime() + timeToThresholdHours * 3600 * 1000);

  const predictedFill24h = Math.min(100, Math.max(0, currentFill + estimatedDailyRate));
  const predictedFill48h = Math.min(100, Math.max(0, currentFill + estimatedDailyRate * 2));

  let urgency: UrgencyLevel = 'low';
  if (timeToThresholdHours <= 6 || currentFill >= 75) {
    urgency = 'critical';
  } else if (timeToThresholdHours <= 18 || currentFill >= 60) {
    urgency = 'high';
  } else if (timeToThresholdHours <= 36 || currentFill >= 40) {
    urgency = 'medium';
  }

  return {
    binId: bin.id,
    binCode: bin.code,
    binName: bin.name,
    wardName: bin.wardName || 'Nashik Ward',
    currentFill,
    predictedFill24h: Math.round(predictedFill24h * 10) / 10,
    predictedFill48h: Math.round(predictedFill48h * 10) / 10,
    timeToThresholdHours: Math.round(timeToThresholdHours * 10) / 10,
    thresholdCrossingTime: thresholdDate.toISOString(),
    urgencyCategory: urgency,
    modelVersion: 'baseline-linear-v1.0',
    modelType: 'baseline_linear_rate',
    confidenceScore: Math.round(confidence * 100) / 100,
    uncertaintyMargin: Math.round((1 - confidence) * 20 * 10) / 10,
    edgeCaseEncountered: edgeCase,
    provenance: bin.provenance,
    predictionTimestamp: now.toISOString(),
  };
}

function getAreaPriorRate(areaCategory?: string): number {
  switch (areaCategory) {
    case 'market':
      return 35.0; // Nashik vegetable/flower markets fill rapidly
    case 'commercial':
      return 26.0;
    case 'pilgrimage':
      return 30.0; // Godavari Ghat / Ramkund area during festivals
    case 'industrial':
      return 20.0;
    case 'residential':
    default:
      return 15.0;
  }
}
