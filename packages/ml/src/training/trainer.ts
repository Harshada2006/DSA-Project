import * as tf from '@tensorflow/tfjs';
import { MLTrainingRecord, extractFeaturesFromBin } from '../features/extractor';
import { calculateMetrics, EvaluationMetrics } from '../evaluation/metrics';
import { MLModelMetadata } from '@eco-collect/shared';

export interface TrainingConfig {
  epochs?: number;
  batchSize?: number;
  learningRate?: number;
  trainSplitRatio?: number; // default 0.8
}

export interface TrainingResult {
  metadata: MLModelMetadata;
  trainMetrics: EvaluationMetrics;
  testMetrics: EvaluationMetrics;
  baselineTestMetrics: EvaluationMetrics;
  weights: number[][]; // serialized weights for persistence
  epochsHistory: { epoch: number; loss: number; valLoss: number }[];
}

export async function trainRegressionModel(
  records: MLTrainingRecord[],
  config: TrainingConfig = {}
): Promise<TrainingResult> {
  if (records.length < 10) {
    throw new Error('Insufficient training records (at least 10 required for train/test split). System in demo/insufficient-data mode.');
  }

  const epochs = config.epochs ?? 35;
  const batchSize = config.batchSize ?? 8;
  const learningRate = config.learningRate ?? 0.01;
  const splitRatio = config.trainSplitRatio ?? 0.8;

  // Chronological sort to strictly prevent time-series data leakage
  const sortedRecords = [...records].sort(
    (a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime()
  );

  const splitIdx = Math.floor(sortedRecords.length * splitRatio);
  const trainRecords = sortedRecords.slice(0, splitIdx);
  const testRecords = sortedRecords.slice(splitIdx);

  // Prepare Feature Matrices
  const extractRow = (r: MLTrainingRecord) => [
    r.features.currentFill / 100.0,
    Math.min(r.features.hoursSinceLastCollection / 72.0, 1.0),
    Math.min(r.features.historicalAccumulationRate / 50.0, 1.0),
    r.features.dayOfWeek / 6.0,
    r.features.hourOfDay / 23.0,
    Math.min(r.features.capacityLiters / 2500.0, 1.0),
    r.features.areaCategoryCode / 4.0,
    Math.min(r.features.wardIndex / 10.0, 1.0),
  ];

  const trainXData = trainRecords.map(extractRow);
  const trainYData = trainRecords.map(r => [r.targetFill24h / 100.0]);

  const testXData = testRecords.map(extractRow);
  const testYData = testRecords.map(r => [r.targetFill24h / 100.0]);

  const featureCount = trainXData[0].length;

  const model = tf.sequential();
  model.add(tf.layers.dense({
    units: 16,
    activation: 'relu',
    inputShape: [featureCount],
    kernelInitializer: 'glorotNormal',
  }));
  model.add(tf.layers.dropout({ rate: 0.1 }));
  model.add(tf.layers.dense({
    units: 8,
    activation: 'relu',
  }));
  model.add(tf.layers.dense({
    units: 1,
    activation: 'sigmoid', // scaled between 0.0 and 1.0 (representing 0-100% fill)
  }));

  model.compile({
    optimizer: tf.train.adam(learningRate),
    loss: 'meanSquaredError',
  });

  const xTrainTensor = tf.tensor2d(trainXData);
  const yTrainTensor = tf.tensor2d(trainYData);
  const xTestTensor = tf.tensor2d(testXData);

  const epochsHistory: { epoch: number; loss: number; valLoss: number }[] = [];

  await model.fit(xTrainTensor, yTrainTensor, {
    epochs,
    batchSize,
    validationSplit: 0.15,
    shuffle: true,
    callbacks: {
      onEpochEnd: async (epoch, logs) => {
        if (logs) {
          epochsHistory.push({
            epoch: epoch + 1,
            loss: Math.round((logs.loss || 0) * 10000) / 10000,
            valLoss: Math.round(((logs.val_loss as number) || 0) * 10000) / 10000,
          });
        }
      },
    },
  });

  // Evaluate on Test split
  const rawPredictions = model.predict(xTestTensor) as tf.Tensor;
  const predData = await rawPredictions.data();
  const testPredictions = Array.from(predData).map(v => Math.min(100, Math.max(0, v * 100.0)));
  const testActuals = testRecords.map(r => r.targetFill24h);

  const testMetrics = calculateMetrics(testActuals, testPredictions);

  // Train metrics
  const rawTrainPred = model.predict(xTrainTensor) as tf.Tensor;
  const trainPredData = await rawTrainPred.data();
  const trainPredictions = Array.from(trainPredData).map(v => Math.min(100, Math.max(0, v * 100.0)));
  const trainActuals = trainRecords.map(r => r.targetFill24h);
  const trainMetrics = calculateMetrics(trainActuals, trainPredictions);

  // Baseline comparison on test set: baseline uses currentFill + historicalAccumulationRate * 1.0
  const baselinePredictions = testRecords.map(r =>
    Math.min(100, Math.max(0, r.features.currentFill + r.features.historicalAccumulationRate))
  );
  const baselineTestMetrics = calculateMetrics(testActuals, baselinePredictions);

  // Calculate improvement percentage
  const improvement = baselineTestMetrics.mae > 0
    ? ((baselineTestMetrics.mae - testMetrics.mae) / baselineTestMetrics.mae) * 100
    : 0;

  // Extract model weights for lightweight persistence
  const weights: number[][] = [];
  for (const layer of model.layers) {
    const layerWeights = layer.getWeights();
    for (const w of layerWeights) {
      const data = await w.data();
      weights.push(Array.from(data));
    }
  }

  // Cleanup tensors
  xTrainTensor.dispose();
  yTrainTensor.dispose();
  xTestTensor.dispose();
  rawPredictions.dispose();
  rawTrainPred.dispose();
  model.dispose();

  const version = `tfjs-v${Date.now().toString().slice(-6)}`;
  const metadata: MLModelMetadata = {
    id: `model-${Date.now()}`,
    version,
    modelType: 'tensorflow_regression_nn',
    trainedAt: new Date().toISOString(),
    trainingRecordsCount: records.length,
    featuresUsed: [
      'current_fill',
      'hours_since_last_collection',
      'historical_accumulation_rate',
      'day_of_week',
      'hour_of_day',
      'capacity_liters',
      'area_category',
      'ward_index',
    ],
    trainMae: trainMetrics.mae,
    trainRmse: trainMetrics.rmse,
    testMae: testMetrics.mae,
    testRmse: testMetrics.rmse,
    baselineMae: baselineTestMetrics.mae,
    baselineRmse: baselineTestMetrics.rmse,
    improvementPercentage: Math.round(improvement * 10) / 10,
    isActive: improvement > 0 || records.length > 50,
    status: (improvement > 0 || records.length > 50) ? 'active' : 'candidate',
    provenance: records[0]?.provenance as any || 'synthetic',
  };

  return {
    metadata,
    trainMetrics,
    testMetrics,
    baselineTestMetrics,
    weights,
    epochsHistory,
  };
}
