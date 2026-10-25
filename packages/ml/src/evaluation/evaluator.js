/**
 * Evaluates regression and classification performance of the ML model vs baseline.
 * Reports actual calculated metrics (MAE, RMSE, Precision, Recall, F1).
 */

export function calculateMAE(actuals, predictions) {
  if (actuals.length === 0) return 0.0;
  let sum = 0.0;
  for (let i = 0; i < actuals.length; i++) {
    sum += Math.abs(actuals[i] - predictions[i]);
  }
  return sum / actuals.length;
}

export function calculateRMSE(actuals, predictions) {
  if (actuals.length === 0) return 0.0;
  let sumSq = 0.0;
  for (let i = 0; i < actuals.length; i++) {
    const diff = actuals[i] - predictions[i];
    sumSq += diff * diff;
  }
  return Math.sqrt(sumSq / actuals.length);
}

export function calculateClassificationMetrics(actualsBinary, predictionsBinary) {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;

  for (let i = 0; i < actualsBinary.length; i++) {
    const a = actualsBinary[i] ? 1 : 0;
    const p = predictionsBinary[i] ? 1 : 0;
    if (p === 1 && a === 1) tp++;
    else if (p === 1 && a === 0) fp++;
    else if (p === 0 && a === 1) fn++;
    else tn++;
  }

  const precision = tp + fp > 0 ? tp / (tp + fp) : 0.0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0.0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0.0;
  const accuracy = actualsBinary.length > 0 ? (tp + tn) / actualsBinary.length : 0.0;

  return {
    tp,
    fp,
    fn,
    tn,
    precision: Math.round(precision * 1000) / 1000,
    recall: Math.round(recall * 1000) / 1000,
    f1Score: Math.round(f1 * 1000) / 1000,
    accuracy: Math.round(accuracy * 1000) / 1000,
  };
}

/**
 * Full model evaluation suite on test dataset.
 */
export function evaluateModel(testFeatures, testActuals, weights, baselinePredictions) {
  const predictions = testFeatures.map((feats) => {
    let sum = 0.0;
    for (let i = 0; i < feats.length; i++) {
      sum += feats[i] * (weights[i] || 0.0);
    }
    return Math.max(0.0, Math.min(100.0, sum));
  });

  const testMae = calculateMAE(testActuals, predictions);
  const testRmse = calculateRMSE(testActuals, predictions);

  const baselineMae = calculateMAE(testActuals, baselinePredictions);
  const baselineRmse = calculateRMSE(testActuals, baselinePredictions);

  const improvementPercentage = baselineMae > 0 ? ((baselineMae - testMae) / baselineMae) * 100.0 : 0.0;

  // Overflow risk classification (>= 80% threshold)
  const actualsOverflow = testActuals.map((y) => (y >= 80.0 ? 1 : 0));
  const modelOverflow = predictions.map((y) => (y >= 80.0 ? 1 : 0));
  const baselineOverflow = baselinePredictions.map((y) => (y >= 80.0 ? 1 : 0));

  const modelClassification = calculateClassificationMetrics(actualsOverflow, modelOverflow);
  const baselineClassification = calculateClassificationMetrics(actualsOverflow, baselineOverflow);

  return {
    metrics: {
      testMae: Math.round(testMae * 100) / 100,
      testRmse: Math.round(testRmse * 100) / 100,
      baselineMae: Math.round(baselineMae * 100) / 100,
      baselineRmse: Math.round(baselineRmse * 100) / 100,
      improvementPercentage: Math.round(improvementPercentage * 10) / 10,
    },
    classification: {
      model: modelClassification,
      baseline: baselineClassification,
    },
  };
}
