/**
 * Feature engineering and extraction pipeline for EcoNexus Waste Accumulation Prediction.
 * Strictly enforces NO target leakage: next_day_fill_level_percent and overflow_risk_next_day
 * are NEVER included in the feature vectors.
 */

export const AREA_TYPES = ['residential', 'commercial', 'market', 'industrial', 'pilgrimage'];
export const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function normalizeAreaType(raw) {
  if (!raw) return 'residential';
  const str = String(raw).toLowerCase().trim();
  for (const a of AREA_TYPES) {
    if (str.includes(a)) return a;
  }
  return 'residential';
}

export function parseDayOfWeek(raw) {
  if (typeof raw === 'number') return Math.max(0, Math.min(6, Math.floor(raw)));
  if (!raw) return 0;
  const str = String(raw).toLowerCase().trim();
  const idx = DAY_NAMES.indexOf(str);
  return idx >= 0 ? idx : 0;
}

/**
 * Extract feature vector from a single bin state or record.
 * Feature vector indices:
 * 0: bias term (1.0)
 * 1: current / last observed fill level (normalized 0-1)
 * 2: previous day fill level (normalized 0-1)
 * 3: days since last collection (normalized by / 14)
 * 4: capacity in litres (normalized by / 1100)
 * 5: estimated daily fill increase (normalized by / 50)
 * 6: is_weekend (0 or 1)
 * 7: day_of_week / 6.0
 * 8: is_area_residential (0 or 1)
 * 9: is_area_commercial (0 or 1)
 * 10: is_area_market (0 or 1)
 * 11: is_area_industrial (0 or 1)
 * 12: is_area_pilgrimage (0 or 1)
 */
export function extractFeatures(record) {
  const currentFill = parseFloat(record.Fill_Level_Percent ?? record.currentFillPercentage ?? record.current_fill ?? 0.0);
  const prevFill = parseFloat(record.Previous_Day_Fill_Level_Percent ?? record.prevFill ?? currentFill);
  const daysSince = parseFloat(record.Days_Since_Last_Collection ?? record.daysSinceLastCollection ?? 0);
  const capacity = parseFloat(record.Capacity_Litres ?? record.capacityLiters ?? record.capacity ?? 240.0);
  const dailyIncrease = parseFloat(record.Estimated_Daily_Fill_Increase_Percent ?? record.dailyIncrease ?? 8.0);
  const isWeekend = record.Is_Weekend !== undefined ? (record.Is_Weekend ? 1.0 : 0.0) : (record.isWeekend ? 1.0 : 0.0);
  const dayOfWeek = parseDayOfWeek(record.Day_Of_Week ?? record.dayOfWeek);
  const area = normalizeAreaType(record.Area_Type ?? record.areaCategory ?? record.areaType);

  return [
    1.0, // Bias intercept
    Math.max(0.0, Math.min(100.0, currentFill)) / 100.0,
    Math.max(0.0, Math.min(100.0, prevFill)) / 100.0,
    Math.min(14.0, Math.max(0.0, daysSince)) / 14.0,
    Math.max(60.0, Math.min(2000.0, capacity)) / 1100.0,
    Math.max(0.0, Math.min(50.0, dailyIncrease)) / 50.0,
    isWeekend,
    dayOfWeek / 6.0,
    area === 'residential' ? 1.0 : 0.0,
    area === 'commercial' ? 1.0 : 0.0,
    area === 'market' ? 1.0 : 0.0,
    area === 'industrial' ? 1.0 : 0.0,
    area === 'pilgrimage' ? 1.0 : 0.0,
  ];
}

export const FEATURE_NAMES = [
  'bias_intercept',
  'current_fill_norm',
  'previous_day_fill_norm',
  'days_since_collection_norm',
  'capacity_norm',
  'estimated_daily_increase_norm',
  'is_weekend',
  'day_of_week_norm',
  'area_residential',
  'area_commercial',
  'area_market',
  'area_industrial',
  'area_pilgrimage',
];
