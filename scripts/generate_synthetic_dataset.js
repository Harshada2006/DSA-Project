/**
 * EcoNexus Nashik — Synthetic Bin Timeseries Dataset Generator
 * Generates 100 demonstration municipal bins across Nashik's 6 administrative wards
 * and 180 consecutive days of logically consistent daily observations (~18,000 records)
 * and an associated ledger of simulated collection events.
 *
 * Uses a deterministic, seeded pseudo-random number generator (Mulberry32)
 * for 100% reproducible generation across environments.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Output Directory
const OUTPUT_DIR = path.resolve(__dirname, '../data/generated');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ---------------------------------------------------------------------------
// 1. DETERMINISTIC SEEDED PSEUDO-RANDOM NUMBER GENERATOR (Mulberry32)
// ---------------------------------------------------------------------------
function createPRNG(seed = 20261027) {
  let s = seed >>> 0;
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = createPRNG(20261027);

function randomInRange(min, max) {
  return min + (max - min) * rng();
}

// ---------------------------------------------------------------------------
// 2. 100 DEMONSTRATION BINS CONFIGURATION ACROSS 6 NASHIK WARDS
// ---------------------------------------------------------------------------
const WARDS_CONFIG = [
  {
    wardCode: 'WARD-01',
    wardName: 'Panchavati',
    zone: 'North Zone',
    centerLat: 20.0080,
    centerLng: 73.7950,
    count: 20,
    prefix: 'PAN',
    areaTypes: ['market', 'pilgrimage', 'residential', 'commercial'],
  },
  {
    wardCode: 'WARD-02',
    wardName: 'Nashik West',
    zone: 'West Zone',
    centerLat: 19.9980,
    centerLng: 73.7740,
    count: 18,
    prefix: 'WST',
    areaTypes: ['commercial', 'residential', 'market'],
  },
  {
    wardCode: 'WARD-03',
    wardName: 'Nashik East',
    zone: 'Central Zone',
    centerLat: 19.9920,
    centerLng: 73.7920,
    count: 16,
    prefix: 'EST',
    areaTypes: ['commercial', 'residential', 'market'],
  },
  {
    wardCode: 'WARD-04',
    wardName: 'CIDCO',
    zone: 'South-West Zone',
    centerLat: 19.9650,
    centerLng: 73.7550,
    count: 18,
    prefix: 'CDO',
    areaTypes: ['residential', 'commercial', 'market'],
  },
  {
    wardCode: 'WARD-05',
    wardName: 'Satpur',
    zone: 'Industrial Zone',
    centerLat: 19.9820,
    centerLng: 73.7300,
    count: 14,
    prefix: 'SAT',
    areaTypes: ['industrial', 'residential', 'commercial'],
  },
  {
    wardCode: 'WARD-06',
    wardName: 'Nashik Road',
    zone: 'South-East Zone',
    centerLat: 19.9520,
    centerLng: 73.8320,
    count: 14,
    prefix: 'NRD',
    areaTypes: ['commercial', 'residential', 'market'],
  },
];

const CAPACITIES = [660, 1100, 1200, 1500, 2000, 2400];
const WASTE_TYPES = ['general', 'organic', 'recyclable', 'hazardous'];

// Generate 100 Bin Master records
const binMasterRecords = [];
let binIndexCounter = 1;

for (const ward of WARDS_CONFIG) {
  for (let i = 1; i <= ward.count; i++) {
    const binId = `BIN-NSK-${String(binIndexCounter).padStart(3, '0')}`;
    const capacity = CAPACITIES[(binIndexCounter + i) % CAPACITIES.length];
    const binType = WASTE_TYPES[(binIndexCounter * 3 + i) % WASTE_TYPES.length];
    const areaCategory = ward.areaTypes[i % ward.areaTypes.length];

    // Realistic jitter around ward geographic center (~400m to 1200m)
    const latJitter = (rng() - 0.5) * 0.016;
    const lngJitter = (rng() - 0.5) * 0.018;
    const lat = Math.round((ward.centerLat + latJitter) * 10000) / 10000;
    const lng = Math.round((ward.centerLng + lngJitter) * 10000) / 10000;

    let locationDescriptor = '';
    if (areaCategory === 'pilgrimage') locationDescriptor = 'Ghat Steps / Riverbank Hub';
    else if (areaCategory === 'market') locationDescriptor = 'Vegetable Market Cluster';
    else if (areaCategory === 'commercial') locationDescriptor = 'Shopping Arcade / Corner';
    else if (areaCategory === 'industrial') locationDescriptor = 'MIDC Gate / Industrial Shed';
    else locationDescriptor = 'Housing Colony Transit Point';

    const binName = `${ward.wardName} ${locationDescriptor} #${i}`;

    binMasterRecords.push({
      Bin_ID: binId,
      Area: ward.wardName,
      Ward_Code: ward.wardCode,
      Bin_Name: binName,
      Bin_Type: binType,
      Area_Category: areaCategory,
      Capacity_Litres: capacity,
      Latitude: lat,
      Longitude: lng,
      Location_Verification_Status: 'approximate_synthetic',
      Data_Source: 'SYNTHETIC_SIMULATION',
    });

    binIndexCounter++;
  }
}

console.log(`Generated ${binMasterRecords.length} Bin Master demonstration records.`);

// ---------------------------------------------------------------------------
// 3. 180 CONSECUTIVE DAYS DAILY OBSERVATIONS & COLLECTION EVENTS
// ---------------------------------------------------------------------------
// 180 consecutive days ending on current date 2026-10-27
const TOTAL_DAYS = 180;
const END_DATE = new Date('2026-10-27T00:00:00Z');
const START_DATE = new Date(END_DATE.getTime() - (TOTAL_DAYS - 1) * 24 * 3600 * 1000);

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Simulation parameters per Area Category
const AREA_PROFILE = {
  market: { baseDailyRatePct: 22.0, weekendMultiplier: 1.45, collectionThresholdPct: 75.0 },
  pilgrimage: { baseDailyRatePct: 20.0, weekendMultiplier: 1.55, collectionThresholdPct: 70.0 },
  commercial: { baseDailyRatePct: 18.0, weekendMultiplier: 0.85, collectionThresholdPct: 80.0 },
  residential: { baseDailyRatePct: 15.0, weekendMultiplier: 1.25, collectionThresholdPct: 80.0 },
  industrial: { baseDailyRatePct: 12.0, weekendMultiplier: 0.65, collectionThresholdPct: 85.0 },
};

function getOverflowRiskCategory(fillPercentage) {
  if (fillPercentage >= 85.0) return 'critical';
  if (fillPercentage >= 70.0) return 'high';
  if (fillPercentage >= 50.0) return 'monitor';
  return 'normal';
}

const dailyObservationRecords = [];
const collectionEventRecords = [];
let obsCounter = 1;
let colCounter = 1;

// Generate time series for each bin sequentially
for (const bin of binMasterRecords) {
  const profile = AREA_PROFILE[bin.Area_Category] || AREA_PROFILE.residential;

  // Initial fill level between 15% and 45%
  let currentFillPct = Math.round(randomInRange(15.0, 45.0) * 10) / 10;
  let previousDayFillPct = currentFillPct;
  let daysSinceCollection = Math.floor(randomInRange(0, 3));

  for (let dayIdx = 0; dayIdx < TOTAL_DAYS; dayIdx++) {
    const obsDate = new Date(START_DATE.getTime() + dayIdx * 24 * 3600 * 1000);
    const dateStr = obsDate.toISOString().split('T')[0];
    const dayOfWeek = DAYS_OF_WEEK[obsDate.getUTCDay()];
    const isWeekend = obsDate.getUTCDay() === 0 || obsDate.getUTCDay() === 6;

    // Calculate daily accumulation percentage
    const weekendFactor = isWeekend ? profile.weekendMultiplier : 1.0;
    const noise = randomInRange(0.85, 1.20);
    const dailyAccumulationPct = Math.round(profile.baseDailyRatePct * weekendFactor * noise * 10) / 10;
    const dailyAccumulationLitres = Math.round(((dailyAccumulationPct / 100.0) * bin.Capacity_Litres) * 10) / 10;

    // Apply accumulation before potential collection
    const uncollectedFillPct = Math.min(100.0, currentFillPct + dailyAccumulationPct);

    // Determine if collection is triggered today
    // Trigger condition: fill exceeds threshold OR (daysSinceCollection >= 3 and fill >= 45%)
    let collectionPerformed = 0;
    let collectionQuantityLitres = 0.0;
    let fillAfterCollection = uncollectedFillPct;

    if (uncollectedFillPct >= profile.collectionThresholdPct || (daysSinceCollection >= 3 && uncollectedFillPct >= 45.0)) {
      collectionPerformed = 1;
      const fillBefore = uncollectedFillPct;
      
      // Compactor trucks empty the bin thoroughly (residual 0% to 5%)
      fillAfterCollection = Math.round(randomInRange(0.0, 5.0) * 10) / 10;
      const collectedVolumePct = fillBefore - fillAfterCollection;
      collectionQuantityLitres = Math.round(((collectedVolumePct / 100.0) * bin.Capacity_Litres) * 10) / 10;

      const collectionEventId = `COL-${String(colCounter).padStart(6, '0')}`;
      collectionEventRecords.push({
        Collection_Event_ID: collectionEventId,
        Date: dateStr,
        Bin_ID: bin.Bin_ID,
        Fill_Percentage_Before_Collection: Math.round(fillBefore * 10) / 10,
        Estimated_Or_Recorded_Collection_Quantity_Litres: collectionQuantityLitres,
        Fill_Percentage_After_Collection: fillAfterCollection,
        Event_Status: 'completed',
        Data_Source: 'SYNTHETIC_SIMULATION',
      });
      colCounter++;

      daysSinceCollection = 0;
    } else {
      daysSinceCollection++;
    }

    // Resulting daily fill percentage
    const resultingFillPct = Math.round(fillAfterCollection * 10) / 10;
    const estimatedWasteVolumeLitres = Math.round(((resultingFillPct / 100.0) * bin.Capacity_Litres) * 10) / 10;
    const overflowRisk = getOverflowRiskCategory(resultingFillPct);

    const observationId = `OBS-${String(obsCounter).padStart(6, '0')}`;
    dailyObservationRecords.push({
      Observation_ID: observationId,
      Date: dateStr,
      Bin_ID: bin.Bin_ID,
      Area: bin.Area,
      Bin_Type: bin.Bin_Type,
      Capacity_Litres: bin.Capacity_Litres,
      Fill_Percentage: resultingFillPct,
      Estimated_Waste_Volume_Litres: estimatedWasteVolumeLitres,
      Simulated_Daily_Waste_Accumulation_Litres: dailyAccumulationLitres,
      Collection_Performed: collectionPerformed,
      Collection_Quantity_Litres: collectionQuantityLitres,
      Overflow_Risk_Category: overflowRisk,
      Day_Of_Week: dayOfWeek,
      Data_Source: 'SYNTHETIC_SIMULATION',
      Data_Quality_Note: 'Simulated daily state transition with area-weighted accumulation and emptying cycle',
    });
    obsCounter++;

    // Carry resulting state into next day
    previousDayFillPct = resultingFillPct;
    currentFillPct = resultingFillPct;
  }
}

console.log(`Generated ${dailyObservationRecords.length} daily observation records.`);
console.log(`Generated ${collectionEventRecords.length} simulated collection events.`);

// ---------------------------------------------------------------------------
// 4. WRITE CSV FILES TO data/generated/
// ---------------------------------------------------------------------------
function writeCsv(filePath, headers, rows) {
  const headerLine = headers.join(',');
  const rowLines = rows.map((r) =>
    headers
      .map((h) => {
        const val = r[h] !== undefined && r[h] !== null ? String(r[h]) : '';
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      })
      .join(',')
  );
  const fullContent = [headerLine, ...rowLines].join('\n') + '\n';
  fs.writeFileSync(filePath, fullContent, 'utf8');
  console.log(`Saved: ${filePath} (${rowLines.length} rows)`);
}

// 1. bin_master_synthetic.csv
writeCsv(
  path.join(OUTPUT_DIR, 'bin_master_synthetic.csv'),
  [
    'Bin_ID',
    'Area',
    'Ward_Code',
    'Bin_Name',
    'Bin_Type',
    'Area_Category',
    'Capacity_Litres',
    'Latitude',
    'Longitude',
    'Location_Verification_Status',
    'Data_Source',
  ],
  binMasterRecords
);

// 2. bin_daily_history_180_days_synthetic.csv
writeCsv(
  path.join(OUTPUT_DIR, 'bin_daily_history_180_days_synthetic.csv'),
  [
    'Observation_ID',
    'Date',
    'Bin_ID',
    'Area',
    'Bin_Type',
    'Capacity_Litres',
    'Fill_Percentage',
    'Estimated_Waste_Volume_Litres',
    'Simulated_Daily_Waste_Accumulation_Litres',
    'Collection_Performed',
    'Collection_Quantity_Litres',
    'Overflow_Risk_Category',
    'Day_Of_Week',
    'Data_Source',
    'Data_Quality_Note',
  ],
  dailyObservationRecords
);

// 3. simulated_collection_events.csv
writeCsv(
  path.join(OUTPUT_DIR, 'simulated_collection_events.csv'),
  [
    'Collection_Event_ID',
    'Date',
    'Bin_ID',
    'Fill_Percentage_Before_Collection',
    'Estimated_Or_Recorded_Collection_Quantity_Litres',
    'Fill_Percentage_After_Collection',
    'Event_Status',
    'Data_Source',
  ],
  collectionEventRecords
);

// 4. Also write legacy timeseries compatibility format to data/import/ for ML and seed services
const legacyRows = [];
for (let bIdx = 0; bIdx < binMasterRecords.length; bIdx++) {
  const bin = binMasterRecords[bIdx];
  const binObs = dailyObservationRecords.filter((o) => o.Bin_ID === bin.Bin_ID);
  for (let d = 0; d < binObs.length; d++) {
    const cur = binObs[d];
    const prev = d > 0 ? binObs[d - 1] : cur;
    const next = d < binObs.length - 1 ? binObs[d + 1] : cur;
    const isWeekend = cur.Day_Of_Week === 'Saturday' || cur.Day_Of_Week === 'Sunday' ? 1 : 0;
    const overflowRiskNext = next.Fill_Percentage >= 80.0 ? 1 : 0;

    legacyRows.push({
      Bin_ID: cur.Bin_ID,
      NMC_Division_or_Area: cur.Area,
      Area_Type: bin.Area_Category,
      Capacity_Litres: cur.Capacity_Litres,
      Observation_Date: cur.Date,
      Fill_Level_Percent: cur.Fill_Percentage,
      Previous_Day_Fill_Level_Percent: prev.Fill_Percentage,
      Estimated_Daily_Fill_Increase_Percent: Math.round(((cur.Simulated_Daily_Waste_Accumulation_Litres / cur.Capacity_Litres) * 100) * 10) / 10,
      Days_Since_Last_Collection: cur.Collection_Performed === 1 ? 0 : 1,
      Collection_Completed_Today: cur.Collection_Performed,
      Day_Of_Week: cur.Day_Of_Week,
      Is_Weekend: isWeekend,
      Next_Day_Fill_Level_Percent: next.Fill_Percentage,
      Overflow_Risk_Next_Day: overflowRiskNext,
      Data_Source: 'SYNTHETIC_SIMULATION',
    });
  }
}

const legacyHeaders = [
  'Bin_ID',
  'NMC_Division_or_Area',
  'Area_Type',
  'Capacity_Litres',
  'Observation_Date',
  'Fill_Level_Percent',
  'Previous_Day_Fill_Level_Percent',
  'Estimated_Daily_Fill_Increase_Percent',
  'Days_Since_Last_Collection',
  'Collection_Completed_Today',
  'Day_Of_Week',
  'Is_Weekend',
  'Next_Day_Fill_Level_Percent',
  'Overflow_Risk_Next_Day',
  'Data_Source',
];

const legacyOutputPath = path.resolve(__dirname, '../data/import/econexus_synthetic_bin_timeseries_180_days.csv');
writeCsv(legacyOutputPath, legacyHeaders, legacyRows);

console.log('✅ Dataset generation complete!');
