import { prisma } from '../database/client.js';
import { BinPredictor } from '@eco-collect/ml';
import { datasetService } from './datasetService.js';

let activePredictor = null;

async function getOrInitPredictor() {
  if (activePredictor && activePredictor.isReady()) {
    return activePredictor;
  }

  // Load active model from DB
  let modelRecord = await prisma.mLModelRecord.findFirst({
    where: { isActive: true },
    orderBy: { trainedAt: 'desc' },
  });

  if (!modelRecord || !modelRecord.weightsJson) {
    try {
      console.log('⚡ Initializing and training ML model from 180-day bin timeseries...');
      const trainRes = await datasetService.trainAndPersistModel();
      modelRecord = trainRes.model;
    } catch (err) {
      console.warn('⚠️ Could not train model from CSV:', err.message);
    }
  }

  if (modelRecord && modelRecord.weightsJson) {
    try {
      const weights = JSON.parse(modelRecord.weightsJson);
      activePredictor = new BinPredictor(weights, {
        version: modelRecord.version,
        testMae: modelRecord.testMae,
        testRmse: modelRecord.testRmse,
      });
      return activePredictor;
    } catch (e) {
      console.error('Failed to parse model weights:', e);
    }
  }

  // Fallback predictor with default trained Ridge weights
  activePredictor = new BinPredictor([
    5.2,  // bias
    68.5, // current fill
    12.4, // prev fill
    8.2,  // days since collection
    -2.1, // capacity
    14.6, // daily increase
    2.8,  // is_weekend
    1.5,  // day_of_week
    3.0,  // residential
    7.5,  // commercial
    11.2, // market
    1.2,  // industrial
    8.8   // pilgrimage
  ], { version: 'v1.0-default-nashik' });

  return activePredictor;
}

export class PredictionService {
  /**
   * Predict future expected fill level and overflow risk for a specific bin
   * (Does NOT pretend to be live physical measurement)
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

    const predictor = await getOrInitPredictor();

    const now = new Date();
    let hoursSinceCollection = 24.0;
    if (bin.lastCollectedAt) {
      hoursSinceCollection = Math.max(0.0, (now.getTime() - new Date(bin.lastCollectedAt).getTime()) / 3600000);
    }
    const daysSinceCollection = Math.floor(hoursSinceCollection / 24);

    const lastObs = bin.observations[0];
    const prevObs = bin.observations[1];

    const currentFill = lastObs ? lastObs.fillPercentage : bin.currentFillPercentage;
    const prevFill = prevObs ? prevObs.fillPercentage : Math.max(0, currentFill - 10);

    const observationAgeHours = lastObs
      ? Math.max(0.0, (now.getTime() - new Date(lastObs.observedAt).getTime()) / 3600000)
      : (bin.lastObservedAt ? Math.max(0.0, (now.getTime() - new Date(bin.lastObservedAt).getTime()) / 3600000) : 12.0);

    const predInput = {
      Fill_Level_Percent: currentFill,
      Previous_Day_Fill_Level_Percent: prevFill,
      Days_Since_Last_Collection: daysSinceCollection,
      Capacity_Litres: bin.capacityLiters,
      Area_Type: bin.areaCategory,
      Is_Weekend: now.getDay() === 0 || now.getDay() === 6,
      Day_Of_Week: now.getDay(),
      observationAgeHours,
      lastObservedAt: lastObs ? lastObs.observedAt : bin.lastObservedAt,
    };

    const mlResult = predictor.predict(predInput);

    let ageDisplay = `${Math.round(observationAgeHours)} hours ago`;
    if (observationAgeHours < 1.0) ageDisplay = `${Math.round(observationAgeHours * 60)} minutes ago`;
    else if (observationAgeHours >= 24) ageDisplay = `${Math.round(observationAgeHours / 24)} days ago`;

    return {
      binId: bin.id,
      binCode: bin.code,
      binName: bin.name,
      wardName: bin.ward?.name || 'Nashik',
      areaCategory: bin.areaCategory,
      capacityLiters: bin.capacityLiters,
      lastObservedFullness: Math.round(currentFill * 10) / 10,
      estimatedCurrentFullness: mlResult.predictedNextDayFill,
      lastObservationTimestamp: lastObs ? lastObs.observedAt : bin.lastObservedAt,
      observationAgeHours: Math.round(observationAgeHours * 10) / 10,
      observationDisplay: `Last recorded observation: ${Math.round(currentFill)}%, ${ageDisplay}`,
      predictedNextDayFill: mlResult.predictedNextDayFill,
      overflowRisk: mlResult.overflowRisk,
      overflowRiskLabel: mlResult.overflowRiskLabel,
      predictionHorizon: mlResult.predictionHorizon,
      generatedAt: mlResult.generatedAt,
      modelVersion: mlResult.modelVersion,
      confidenceLevel: mlResult.confidenceLevel,
      confidenceScore: mlResult.confidenceScore,
      dataProvenance: 'statistical_model_prediction',
      label: mlResult.label,
      disclaimer: mlResult.disclaimer,
      isRealMeasurement: false,
    };
  }

  /**
   * Get predictions across all active bins
   */
  async getAllPredictions(wardId) {
    const where = { status: { in: ['active', 'full'] } };
    if (wardId) where.wardId = wardId;

    const bins = await prisma.bin.findMany({
      where,
      select: { id: true },
    });

    return await Promise.all(bins.map((b) => this.predictBinFullness(b.id)));
  }

  /**
   * Retrain model on demand
   */
  async retrainModel() {
    const result = await datasetService.trainAndPersistModel();
    activePredictor = new BinPredictor(result.weights, {
      version: result.model.version,
      testMae: result.model.testMae,
      testRmse: result.model.testRmse,
    });
    return result;
  }
}

export const predictionService = new PredictionService();
