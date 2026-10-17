import { Bin, AreaCategory } from '@eco-collect/shared';

export interface MLTrainingRecord {
  id: string;
  binId: string;
  features: {
    currentFill: number;
    hoursSinceLastCollection: number;
    historicalAccumulationRate: number;
    dayOfWeek: number; // 0-6
    hourOfDay: number; // 0-23
    capacityLiters: number;
    areaCategoryCode: number;
    wardIndex: number;
  };
  targetFill24h: number; // ground-truth observed fill 24h later
  observedAt: string;
  provenance: string;
}

const AREA_MAP: Record<AreaCategory, number> = {
  residential: 0,
  commercial: 1,
  market: 2,
  pilgrimage: 3,
  industrial: 4,
};

export function extractFeaturesFromBin(
  bin: Bin,
  observationTime: Date = new Date(),
  historicalAccumulationRate: number = 18.0,
  wardIndex: number = 0
): number[] {
  const currentFill = (bin.currentFillPercentage || 0) / 100.0;
  
  let hoursSinceLastCollection = 24.0;
  if (bin.lastCollectedAt) {
    hoursSinceLastCollection = Math.max(
      0,
      (observationTime.getTime() - new Date(bin.lastCollectedAt).getTime()) / (1000 * 3600)
    );
  }
  const normHoursSinceCol = Math.min(hoursSinceLastCollection / 72.0, 1.0);
  const normHistRate = Math.min(historicalAccumulationRate / 50.0, 1.0);
  const normDayOfWeek = observationTime.getDay() / 6.0;
  const normHourOfDay = observationTime.getHours() / 23.0;
  const normCapacity = Math.min(bin.capacityLiters / 2500.0, 1.0);
  const areaCode = (AREA_MAP[bin.areaCategory] ?? 0) / 4.0;
  const normWard = Math.min(wardIndex / 10.0, 1.0);

  return [
    currentFill,
    normHoursSinceCol,
    normHistRate,
    normDayOfWeek,
    normHourOfDay,
    normCapacity,
    areaCode,
    normWard,
  ];
}

export const FEATURE_NAMES = [
  'current_fill_norm',
  'hours_since_last_collection_norm',
  'historical_accumulation_rate_norm',
  'day_of_week_norm',
  'hour_of_day_norm',
  'capacity_liters_norm',
  'area_category_code_norm',
  'ward_index_norm',
];
