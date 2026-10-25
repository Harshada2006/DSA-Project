import { extractFeatures } from '../features/featureExtractor.js';
import { predictFillWithWeights } from '../training/trainer.js';

export class BinPredictor {
  constructor(weights, modelMetadata = {}) {
    this.weights = weights || null;
    this.metadata = modelMetadata;
  }

  setWeights(weights, metadata = {}) {
    this.weights = weights;
    this.metadata = metadata;
  }

  isReady() {
    return Array.isArray(this.weights) && this.weights.length > 0;
  }

  /**
   * Predict next-day expected fill level and overflow risk for a given bin state.
   */
  predict(binState) {
    if (!this.isReady()) {
      return {
        status: 'insufficient_model_data',
        message: 'Prediction model not yet trained or weights unavailable.',
        predictedNextDayFill: null,
        overflowRisk: false,
        confidenceLevel: 'Low',
        confidenceScore: 0.1,
      };
    }

    const features = extractFeatures(binState);
    const predictedFill = predictFillWithWeights(features, this.weights);
    const isOverflow = predictedFill >= 80.0;

    // Confidence decays if observation is old
    const observationAgeHours = binState.observationAgeHours !== undefined
      ? binState.observationAgeHours
      : (binState.lastObservedAt ? (Date.now() - new Date(binState.lastObservedAt).getTime()) / 3600000 : 0);

    let confidenceLevel = 'High';
    let confidenceScore = 0.92;
    if (observationAgeHours > 72) {
      confidenceLevel = 'Low';
      confidenceScore = 0.35;
    } else if (observationAgeHours > 24) {
      confidenceLevel = 'Medium';
      confidenceScore = 0.68;
    }

    const roundedFill = Math.round(predictedFill * 10) / 10;

    return {
      status: 'success',
      predictedNextDayFill: roundedFill,
      overflowRisk: isOverflow,
      overflowRiskLabel: isOverflow ? 'HIGH RISK (Expected >= 80%)' : 'NORMAL (Expected < 80%)',
      predictionHorizon: 'Expected fill level tomorrow (24h horizon)',
      generatedAt: new Date().toISOString(),
      modelVersion: this.metadata.version || 'v1.0-ridge-nashik',
      confidenceLevel,
      confidenceScore,
      dataProvenance: 'synthetic_simulation_trained',
      label: 'Estimated Prediction (Not a Physical Sensor Measurement)',
      disclaimer: 'Expected future fill estimated from historical accumulation models. Does not physically measure current bin volume.',
    };
  }
}
