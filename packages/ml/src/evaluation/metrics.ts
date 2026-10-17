export interface EvaluationMetrics {
  mae: number;
  rmse: number;
  sampleCount: number;
  r2Score?: number;
}

export function calculateMetrics(actuals: number[], predictions: number[]): EvaluationMetrics {
  if (actuals.length === 0 || actuals.length !== predictions.length) {
    return { mae: 0, rmse: 0, sampleCount: 0 };
  }

  const n = actuals.length;
  let absErrorSum = 0;
  let squaredErrorSum = 0;
  let actualSum = 0;

  for (let i = 0; i < n; i++) {
    const error = predictions[i] - actuals[i];
    absErrorSum += Math.abs(error);
    squaredErrorSum += error * error;
    actualSum += actuals[i];
  }

  const mae = absErrorSum / n;
  const mse = squaredErrorSum / n;
  const rmse = Math.sqrt(mse);

  // Calculate R2 Score
  const meanActual = actualSum / n;
  let totalSumOfSquares = 0;
  for (let i = 0; i < n; i++) {
    totalSumOfSquares += Math.pow(actuals[i] - meanActual, 2);
  }

  const r2Score = totalSumOfSquares > 0.0001
    ? 1 - (squaredErrorSum / totalSumOfSquares)
    : 0;

  return {
    mae: Math.round(mae * 100) / 100,
    rmse: Math.round(rmse * 100) / 100,
    sampleCount: n,
    r2Score: Math.round(r2Score * 100) / 100,
  };
}
