export function calculateBaselineFill(lastObserved, hourlyRate, elapsedHours) {
  return Math.min(100.0, Math.max(0.0, lastObserved + hourlyRate * elapsedHours));
}

export function calculateConfidence(elapsedHours) {
  if (elapsedHours > 72) return { level: 'Low', score: 0.35 };
  if (elapsedHours > 24) return { level: 'Medium', score: 0.65 };
  return { level: 'High', score: 0.95 };
}
