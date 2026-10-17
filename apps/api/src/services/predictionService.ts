import { prisma } from '../database/client';
import { Bin, PredictionResult, MLModelMetadata } from '@eco-collect/shared';
import {
  computeBaselinePrediction,
  trainRegressionModel,
  predictBinFill,
  MLTrainingRecord,
  TrainingResult,
} from '@eco-collect/ml';

export class PredictionService {
  /**
   * Run predictions for all active bins or a single bin
   */
  async predictBins(binId?: string): Promise<PredictionResult[]> {
    const where: any = { status: { in: ['active', 'full'] } };
    if (binId) where.id = binId;

    const bins = await prisma.bin.findMany({
      where,
      include: {
        ward: true,
        observations: {
          orderBy: { observedAt: 'desc' },
          take: 5,
        },
      },
    });

    // Check for active trained ML model
    const activeModelRecord = await prisma.mLModelRecord.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    let activeModel: TrainingResult | null = null;
    if (activeModelRecord) {
      let weights: number[][] = [];
      try {
        if (activeModelRecord.weightsJson) {
          weights = JSON.parse(activeModelRecord.weightsJson);
        }
      } catch (_) {}

      const meta: MLModelMetadata = {
        id: activeModelRecord.id,
        version: activeModelRecord.version,
        modelType: activeModelRecord.modelType,
        trainedAt: activeModelRecord.trainedAt.toISOString(),
        trainingRecordsCount: activeModelRecord.trainingRecordsCount,
        featuresUsed: JSON.parse(activeModelRecord.featuresUsed),
        trainMae: activeModelRecord.trainMae,
        trainRmse: activeModelRecord.trainRmse,
        testMae: activeModelRecord.testMae,
        testRmse: activeModelRecord.testRmse,
        baselineMae: activeModelRecord.baselineMae,
        baselineRmse: activeModelRecord.baselineRmse,
        improvementPercentage: activeModelRecord.improvementPercentage,
        isActive: activeModelRecord.isActive,
        status: activeModelRecord.status as any,
        provenance: activeModelRecord.provenance as any,
      };

      activeModel = {
        metadata: meta,
        trainMetrics: { mae: meta.trainMae, rmse: meta.trainRmse, sampleCount: meta.trainingRecordsCount },
        testMetrics: { mae: meta.testMae, rmse: meta.testRmse, sampleCount: Math.round(meta.trainingRecordsCount * 0.2) },
        baselineTestMetrics: { mae: meta.baselineMae, rmse: meta.baselineRmse, sampleCount: Math.round(meta.trainingRecordsCount * 0.2) },
        weights,
        epochsHistory: [],
      };
    }

    const results: PredictionResult[] = [];

    for (const bin of bins) {
      const sharedBin: Bin = {
        id: bin.id,
        code: bin.code,
        name: bin.name,
        wardId: bin.wardId,
        wardName: bin.ward.name,
        latitude: bin.latitude,
        longitude: bin.longitude,
        capacityLiters: bin.capacityLiters,
        wasteType: bin.wasteType as any,
        areaCategory: bin.areaCategory as any,
        status: bin.status as any,
        currentFillPercentage: bin.currentFillPercentage,
        lastObservedAt: bin.lastObservedAt?.toISOString() || null,
        lastCollectedAt: bin.lastCollectedAt?.toISOString() || null,
        urgency: bin.urgency as any,
        priorityScore: bin.priorityScore,
        provenance: bin.provenance as any,
        notes: bin.notes,
        createdAt: bin.createdAt.toISOString(),
        updatedAt: bin.updatedAt.toISOString(),
      };

      const obsFormatted = bin.observations.map(o => ({
        fillPercentage: o.fillPercentage,
        observedAt: o.observedAt.toISOString(),
      }));

      const prediction = predictBinFill(sharedBin, {
        activeModel,
        recentObservations: obsFormatted,
      });

      results.push(prediction);
    }

    return results;
  }

  /**
   * Train a new TensorFlow.js regression model from observation sequences
   */
  async trainModel(options: {
    epochs?: number;
    learningRate?: number;
    trainSplitRatio?: number;
  } = {}): Promise<MLModelMetadata> {
    // 1. Gather observation pairs across all bins
    const bins = await prisma.bin.findMany({
      include: {
        observations: {
          orderBy: { observedAt: 'asc' },
        },
      },
    });

    const trainingRecords: MLTrainingRecord[] = [];

    for (let bIdx = 0; bIdx < bins.length; bIdx++) {
      const bin = bins[bIdx];
      const obs = bin.observations;
      if (obs.length < 2) continue;

      for (let i = 0; i < obs.length - 1; i++) {
        const cur = obs[i];
        const next = obs[i + 1];

        const curDate = new Date(cur.observedAt);
        const nextDate = new Date(next.observedAt);
        const deltaHours = (nextDate.getTime() - curDate.getTime()) / (1000 * 3600);

        if (deltaHours >= 2 && deltaHours <= 36) {
          // Project to 24h target
          const deltaFill = next.fillPercentage - cur.fillPercentage;
          const rateHourly = deltaFill / deltaHours;
          const target24h = Math.min(100, Math.max(0, cur.fillPercentage + rateHourly * 24.0));

          trainingRecords.push({
            id: `rec-${bin.id}-${i}`,
            binId: bin.id,
            features: {
              currentFill: cur.fillPercentage,
              hoursSinceLastCollection: 24.0,
              historicalAccumulationRate: Math.max(5.0, rateHourly * 24.0),
              dayOfWeek: curDate.getDay(),
              hourOfDay: curDate.getHours(),
              capacityLiters: bin.capacityLiters,
              areaCategoryCode: bIdx % 5,
              wardIndex: bIdx % 6,
            },
            targetFill24h: Math.round(target24h * 10) / 10,
            observedAt: cur.observedAt.toISOString(),
            provenance: cur.provenance,
          });
        }
      }
    }

    if (trainingRecords.length < 10) {
      throw new Error(`Insufficient training records (${trainingRecords.length} found, minimum 10 required). System running in demo/insufficient-data mode.`);
    }

    // 2. Train model using TensorFlow.js
    const result = await trainRegressionModel(trainingRecords, {
      epochs: options.epochs || 30,
      learningRate: options.learningRate || 0.01,
      trainSplitRatio: options.trainSplitRatio || 0.8,
    });

    // 3. Store record in database
    const saved = await prisma.mLModelRecord.create({
      data: {
        version: result.metadata.version,
        modelType: result.metadata.modelType,
        featuresUsed: JSON.stringify(result.metadata.featuresUsed),
        trainingRecordsCount: result.metadata.trainingRecordsCount,
        trainMae: result.metadata.trainMae,
        trainRmse: result.metadata.trainRmse,
        testMae: result.metadata.testMae,
        testRmse: result.metadata.testRmse,
        baselineMae: result.metadata.baselineMae,
        baselineRmse: result.metadata.baselineRmse,
        improvementPercentage: result.metadata.improvementPercentage,
        weightsJson: JSON.stringify(result.weights),
        isActive: false, // New model starts as candidate until promoted
        status: 'candidate',
        provenance: result.metadata.provenance,
        trainedAt: new Date(result.metadata.trainedAt),
      },
    });

    return {
      ...result.metadata,
      id: saved.id,
      isActive: saved.isActive,
      status: saved.status as any,
    };
  }

  /**
   * Promote a candidate model to active
   */
  async promoteModel(modelId: string): Promise<MLModelMetadata> {
    const candidate = await prisma.mLModelRecord.findUnique({
      where: { id: modelId },
    });

    if (!candidate) {
      throw new Error(`Model with ID "${modelId}" not found.`);
    }

    // Set other models to archived
    await prisma.mLModelRecord.updateMany({
      where: { isActive: true },
      data: { isActive: false, status: 'archived' },
    });

    // Activate selected model
    const promoted = await prisma.mLModelRecord.update({
      where: { id: modelId },
      data: { isActive: true, status: 'active' },
    });

    return {
      id: promoted.id,
      version: promoted.version,
      modelType: promoted.modelType,
      featuresUsed: JSON.parse(promoted.featuresUsed),
      trainingRecordsCount: promoted.trainingRecordsCount,
      trainMae: promoted.trainMae,
      trainRmse: promoted.trainRmse,
      testMae: promoted.testMae,
      testRmse: promoted.testRmse,
      baselineMae: promoted.baselineMae,
      baselineRmse: promoted.baselineRmse,
      improvementPercentage: promoted.improvementPercentage,
      isActive: promoted.isActive,
      status: promoted.status as any,
      provenance: promoted.provenance as any,
      trainedAt: promoted.trainedAt.toISOString(),
    };
  }

  /**
   * List all trained models
   */
  async listModels(): Promise<MLModelMetadata[]> {
    const records = await prisma.mLModelRecord.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return records.map(r => ({
      id: r.id,
      version: r.version,
      modelType: r.modelType,
      featuresUsed: JSON.parse(r.featuresUsed),
      trainingRecordsCount: r.trainingRecordsCount,
      trainMae: r.trainMae,
      trainRmse: r.trainRmse,
      testMae: r.testMae,
      testRmse: r.testRmse,
      baselineMae: r.baselineMae,
      baselineRmse: r.baselineRmse,
      improvementPercentage: r.improvementPercentage,
      isActive: r.isActive,
      status: r.status as any,
      provenance: r.provenance as any,
      trainedAt: r.trainedAt.toISOString(),
    }));
  }
}

export const predictionService = new PredictionService();
