import { extractFeatures, FEATURE_NAMES } from '../features/featureExtractor.js';

/**
 * Solve linear system A * x = b via Gauss-Jordan elimination with partial pivoting.
 */
function solveLinearSystem(A, b) {
  const n = A.length;
  // Create augmented matrix
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    // Find pivot
    let maxRow = col;
    let maxVal = Math.abs(M[col][col]);
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > maxVal) {
        maxVal = Math.abs(M[row][col]);
        maxRow = row;
      }
    }

    if (maxVal < 1e-12) {
      // Singular or near-singular matrix; apply tiny jitter to diagonal
      M[col][col] += 1e-6;
    } else if (maxRow !== col) {
      const temp = M[col];
      M[col] = M[maxRow];
      M[maxRow] = temp;
    }

    // Normalize pivot row
    const pivot = M[col][col];
    for (let j = col; j <= n; j++) {
      M[col][j] /= pivot;
    }

    // Eliminate other rows
    for (let row = 0; row < n; row++) {
      if (row !== col) {
        const factor = M[row][col];
        if (Math.abs(factor) > 1e-12) {
          for (let j = col; j <= n; j++) {
            M[row][j] -= factor * M[col][j];
          }
        }
      }
    }
  }

  return M.map((row) => row[n]);
}

/**
 * Train a Ridge Linear Regression model using Normal Equation:
 * w = (X^T * X + lambda * I)^(-1) * X^T * y
 */
export function trainRidgeRegression(featuresList, targets, lambda = 0.05) {
  const numSamples = featuresList.length;
  const numFeatures = featuresList[0].length;

  // Compute X^T * X (numFeatures x numFeatures)
  const XtX = Array.from({ length: numFeatures }, () => new Float64Array(numFeatures));
  const Xty = new Float64Array(numFeatures);

  for (let s = 0; s < numSamples; s++) {
    const x = featuresList[s];
    const y = targets[s];
    for (let i = 0; i < numFeatures; i++) {
      Xty[i] += x[i] * y;
      for (let j = 0; j < numFeatures; j++) {
        XtX[i][j] += x[i] * x[j];
      }
    }
  }

  // Add L2 Ridge penalty (do not penalize bias intercept at index 0)
  for (let i = 1; i < numFeatures; i++) {
    XtX[i][i] += lambda * numSamples;
  }

  // Convert to standard 2D array for solver
  const A = XtX.map((row) => Array.from(row));
  const b = Array.from(Xty);

  const weights = solveLinearSystem(A, b);
  return weights;
}

/**
 * Predict fill percentage given feature vector and weights.
 */
export function predictFillWithWeights(features, weights) {
  let sum = 0.0;
  for (let i = 0; i < features.length; i++) {
    sum += features[i] * (weights[i] || 0.0);
  }
  return Math.max(0.0, Math.min(100.0, sum));
}

/**
 * Chronological train/test split of records.
 * Sorts by Observation_Date strictly to prevent future-data contamination.
 */
export function chronologicalSplit(records, trainRatio = 0.8) {
  // Filter valid records
  const valid = records.filter(
    (r) =>
      r &&
      r.Observation_Date &&
      !isNaN(parseFloat(r.Fill_Level_Percent)) &&
      !isNaN(parseFloat(r.Next_Day_Fill_Level_Percent))
  );

  // Chronological sort
  valid.sort((a, b) => new Date(a.Observation_Date).getTime() - new Date(b.Observation_Date).getTime());

  const splitIdx = Math.floor(valid.length * trainRatio);
  const trainRecords = valid.slice(0, splitIdx);
  const testRecords = valid.slice(splitIdx);

  return { trainRecords, testRecords };
}
