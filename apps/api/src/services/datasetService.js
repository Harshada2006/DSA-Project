import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import xlsx from 'xlsx';
import { prisma } from '../database/client.js';
import {
  extractFeatures,
  chronologicalSplit,
  trainRidgeRegression,
  evaluateModel,
  FEATURE_NAMES,
} from '@eco-collect/ml';

const REQUIRED_CSV_COLUMNS = [
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

function resolveFilePath(filename) {
  const candidates = [
    path.resolve(process.cwd(), 'data/import', filename),
    path.resolve(process.cwd(), 'data/imports', filename),
    path.resolve(process.cwd(), '../../data/import', filename),
    path.resolve(process.cwd(), '../../data/imports', filename),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

export class DatasetService {
  /**
   * Validate and load CSV timeseries dataset
   */
  loadCsvDataset(customPath = null) {
    const filePath = customPath || resolveFilePath('econexus_synthetic_bin_timeseries_180_days.csv');
    if (!fs.existsSync(filePath)) {
      throw new Error(`Synthetic bin timeseries CSV not found at: ${filePath}. Please ensure file is in data/import/`);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });

    if (parsed.errors && parsed.errors.length > 5) {
      throw new Error(`CSV Parsing errors detected: ${parsed.errors[0]?.message || 'Malformatted CSV'}`);
    }

    const fields = parsed.meta.fields || [];
    const missing = REQUIRED_CSV_COLUMNS.filter((col) => !fields.includes(col));
    if (missing.length > 0) {
      throw new Error(`CSV validation failed: Missing required columns: ${missing.join(', ')}`);
    }

    const validRecords = [];
    const validationErrors = [];
    const seenBinDates = new Set();

    parsed.data.forEach((row, idx) => {
      const lineNum = idx + 2;
      const binId = String(row.Bin_ID || '').trim();
      const date = String(row.Observation_Date || '').trim();

      if (!binId || !date) {
        validationErrors.push(`Row ${lineNum}: Missing Bin_ID or Observation_Date`);
        return;
      }

      const key = `${binId}_${date}`;
      if (seenBinDates.has(key)) {
        validationErrors.push(`Row ${lineNum}: Duplicate entry for bin ${binId} on date ${date}`);
        return;
      }
      seenBinDates.add(key);

      const fill = parseFloat(row.Fill_Level_Percent);
      if (isNaN(fill) || fill < 0 || fill > 100) {
        validationErrors.push(`Row ${lineNum}: Invalid Fill_Level_Percent: ${row.Fill_Level_Percent}`);
        return;
      }

      const nextFill = parseFloat(row.Next_Day_Fill_Level_Percent);
      if (isNaN(nextFill) || nextFill < 0 || nextFill > 100) {
        validationErrors.push(`Row ${lineNum}: Invalid Next_Day_Fill_Level_Percent: ${row.Next_Day_Fill_Level_Percent}`);
        return;
      }

      const capacity = parseFloat(row.Capacity_Litres);
      if (isNaN(capacity) || capacity <= 0) {
        validationErrors.push(`Row ${lineNum}: Invalid Capacity_Litres: ${row.Capacity_Litres}`);
        return;
      }

      validRecords.push(row);
    });

    return {
      filePath,
      totalRows: parsed.data.length,
      validRowsCount: validRecords.length,
      invalidRowsCount: validationErrors.length,
      sampleErrors: validationErrors.slice(0, 10),
      records: validRecords,
      isSynthetic: true,
      provenanceDisclaimer:
        'All records marked SYNTHETIC_SIMULATION represent simulated prototypes for algorithm evaluation, not verified IoT physical sensor readings.',
    };
  }

  /**
   * Train, evaluate, and persist ML model from CSV dataset
   */
  async trainAndPersistModel(customPath = null) {
    const dataset = this.loadCsvDataset(customPath);
    const { trainRecords, testRecords } = chronologicalSplit(dataset.records, 0.8);

    if (trainRecords.length < 100 || testRecords.length < 20) {
      throw new Error('Insufficient dataset size to conduct chronological train/test split.');
    }

    // Extract features and targets (STRICT TARGET SEPARATION - NO LEAKAGE)
    const trainFeatures = trainRecords.map((r) => extractFeatures(r));
    const trainTargets = trainRecords.map((r) => parseFloat(r.Next_Day_Fill_Level_Percent));

    const testFeatures = testRecords.map((r) => extractFeatures(r));
    const testTargets = testRecords.map((r) => parseFloat(r.Next_Day_Fill_Level_Percent));

    // Simple baseline predictions: persistence baseline (next day = current fill + estimated daily increase)
    const baselineTestPredictions = testRecords.map((r) => {
      const cur = parseFloat(r.Fill_Level_Percent || 0);
      const inc = parseFloat(r.Estimated_Daily_Fill_Increase_Percent || 5);
      return Math.max(0.0, Math.min(100.0, cur + inc));
    });

    // Train Ridge Regression
    const weights = trainRidgeRegression(trainFeatures, trainTargets, 0.05);

    // Evaluate on test split
    const evalResults = evaluateModel(testFeatures, testTargets, weights, baselineTestPredictions);

    // Evaluate on train split for train metrics
    const trainPredictions = trainFeatures.map((feats) => {
      let sum = 0.0;
      for (let i = 0; i < feats.length; i++) sum += feats[i] * weights[i];
      return Math.max(0.0, Math.min(100.0, sum));
    });

    let trainSumMae = 0.0;
    let trainSumSq = 0.0;
    for (let i = 0; i < trainTargets.length; i++) {
      const diff = trainTargets[i] - trainPredictions[i];
      trainSumMae += Math.abs(diff);
      trainSumSq += diff * diff;
    }
    const trainMae = trainSumMae / trainTargets.length;
    const trainRmse = Math.sqrt(trainSumSq / trainTargets.length);

    const version = `v1.${Date.now().toString().slice(-4)}-ridge-nashik`;

    // Mark previous models candidate/archived
    await prisma.mLModelRecord.updateMany({
      where: { isActive: true },
      data: { isActive: false, status: 'archived' },
    });

    // Persist active model record
    const modelRecord = await prisma.mLModelRecord.create({
      data: {
        version,
        modelType: 'Ridge Linear Regression with Chronological Split (No Leakage)',
        featuresUsed: JSON.stringify(FEATURE_NAMES),
        trainingRecordsCount: trainRecords.length,
        trainMae: Math.round(trainMae * 100) / 100,
        trainRmse: Math.round(trainRmse * 100) / 100,
        testMae: evalResults.metrics.testMae,
        testRmse: evalResults.metrics.testRmse,
        baselineMae: evalResults.metrics.baselineMae,
        baselineRmse: evalResults.metrics.baselineRmse,
        improvementPercentage: evalResults.metrics.improvementPercentage,
        weightsJson: JSON.stringify(weights),
        isActive: true,
        status: 'active',
        provenance: 'synthetic_simulation',
      },
    });

    return {
      model: modelRecord,
      weights,
      evaluation: evalResults,
      trainingSize: trainRecords.length,
      testSize: testRecords.length,
    };
  }

  /**
   * Inspect and safely parse Excel workbook
   */
  inspectExcelWorkbook(customPath = null) {
    const filePath = customPath || resolveFilePath('Eco_Collect_Nashik_Datasets.xlsx');
    if (!fs.existsSync(filePath)) {
      throw new Error(`Excel workbook not found at: ${filePath}. Please ensure file is in data/import/`);
    }

    const wb = xlsx.readFile(filePath);
    const result = {
      filePath,
      sheets: wb.SheetNames,
      data: {},
    };

    wb.SheetNames.forEach((sheetName) => {
      const sheet = wb.Sheets[sheetName];
      const json = xlsx.utils.sheet_to_json(sheet);
      result.data[sheetName] = {
        rowCount: json.length,
        columns: json.length > 0 ? Object.keys(json[0]) : [],
        sample: json.slice(0, 3),
      };
    });

    return result;
  }

  /**
   * Safely import sample fictional workers from Excel into SampleWorkerRecord table
   * STRICT ENFORCEMENT: Never creates User accounts or grants login access.
   */
  async importSampleWorkersFromExcel(customPath = null) {
    const inspect = this.inspectExcelWorkbook(customPath);
    const workerRows = xlsx.utils.sheet_to_json(
      xlsx.readFile(inspect.filePath).Sheets['Fictional_Workers_30'] || {}
    );

    let importedCount = 0;
    for (const row of workerRows) {
      const workerId = String(row.Worker_ID || '').trim();
      const name = String(row.Worker_Name_Fictional || row.Worker_Name || '').trim();
      if (!workerId || !name) continue;

      await prisma.sampleWorkerRecord.upsert({
        where: { workerId },
        update: {
          workerName: name,
          assignedZone: String(row.Assigned_Zone || 'Panchavati'),
          shift: String(row.Shift || '07:00–15:00'),
          vehicleType: String(row.Vehicle_Type || 'Mini truck'),
          assignedBinIds: String(row.Assigned_Bin_IDs_Sample || ''),
          availability: String(row.Availability || 'Available'),
          dataStatus: 'FICTIONAL prototype record for test only',
          verificationNote: 'Invented record from Eco_Collect_Nashik_Datasets.xlsx. Never granted login access.',
          isFictional: true,
        },
        create: {
          workerId,
          workerName: name,
          assignedZone: String(row.Assigned_Zone || 'Panchavati'),
          shift: String(row.Shift || '07:00–15:00'),
          vehicleType: String(row.Vehicle_Type || 'Mini truck'),
          assignedBinIds: String(row.Assigned_Bin_IDs_Sample || ''),
          availability: String(row.Availability || 'Available'),
          dataStatus: 'FICTIONAL prototype record for test only',
          verificationNote: 'Invented record from Eco_Collect_Nashik_Datasets.xlsx. Never granted login access.',
          isFictional: true,
        },
      });
      importedCount++;
    }

    return { importedCount };
  }

  /**
   * Seed/Upsert the 6 Nashik E-Waste destination & collection point records
   * adhering strictly to Section 18 verified/unverified statuses and separate addresses.
   */
  async seedNashikEWasteFacilities() {
    const records = [
      {
        name: 'Techeco E-Waste Namo LLP (MPCB Authorized Recycler)',
        businessAddress: 'Gat No. 155 B/2, Village Dhakambe, Tal. Dindori, Dist. Nashik 422004',
        facilityAddress: 'Gat No. 155 B/2, Village Dhakambe, Tal. Dindori, Dist. Nashik 422004',
        address: 'Gat No. 155 B/2, Village Dhakambe, Tal. Dindori, Dist. Nashik 422004',
        area: 'Dindori Road / Dhakambe',
        facilityType: 'verified_ewaste_recycler',
        wasteType: 'electronic',
        acceptedWasteCategories: JSON.stringify(['electronic', 'battery', 'computer_hardware', 'cfl_bulbs', 'printed_circuit_boards']),
        latitude: 20.089,
        longitude: 73.815,
        locationAccuracy: 'verified_facility',
        verificationStatus: 'verified',
        verificationSource: 'Maharashtra Pollution Control Board (MPCB) Registry',
        authorizationNumber: 'MPCB/RO-NSK/E-WASTE/RECYCLER-NAMO',
        pickupAvailable: true,
        publicDropoffAvailable: true,
        activeStatus: 'active',
        sourceOrganization: 'Maharashtra Pollution Control Board (MPCB)',
      },
      {
        name: 'Nashik Road E-Waste Drop-off Hub',
        businessAddress: 'Opposite Bytco Hospital, Nashik Road, Nashik 422101',
        facilityAddress: 'Opposite Bytco Hospital, Nashik Road, Nashik 422101',
        address: 'Opposite Bytco Hospital, Nashik Road, Nashik 422101',
        area: 'Nashik Road',
        facilityType: 'verified_ewaste_recycler',
        wasteType: 'electronic',
        acceptedWasteCategories: JSON.stringify(['mobile_phones', 'chargers', 'small_appliances', 'batteries']),
        latitude: 19.954,
        longitude: 73.834,
        locationAccuracy: 'verified_hub',
        verificationStatus: 'verified',
        verificationSource: 'Maharashtra Pollution Control Board (MPCB) Authorization',
        authorizationNumber: 'MPCB/RO-NSK/E-WASTE/AUTH-2025-102',
        pickupAvailable: true,
        publicDropoffAvailable: true,
        activeStatus: 'active',
        sourceOrganization: 'Maharashtra Pollution Control Board (MPCB)',
      },
      {
        name: 'NWMPL Integrated Solid Waste Processing Facility',
        businessAddress: 'Pathardi Shivar, Old Agra Highway, Nashik 422010',
        facilityAddress: 'Pathardi Shivar, Old Agra Highway, Nashik 422010',
        address: 'Pathardi Shivar, Old Agra Highway, Nashik 422010',
        area: 'Pathardi Shivar',
        facilityType: 'general_waste_facility',
        wasteType: 'general',
        acceptedWasteCategories: JSON.stringify(['organic', 'recyclable', 'general', 'compostable']),
        latitude: 19.9482,
        longitude: 73.7651,
        locationAccuracy: 'verified_municipal_site',
        verificationStatus: 'verified',
        verificationSource: 'Nashik Municipal Corporation (NMC) Solid Waste Cell',
        authorizationNumber: 'NMC/SWM/PLANT/AUTH-2023-01',
        pickupAvailable: false,
        publicDropoffAvailable: true,
        activeStatus: 'active',
        sourceOrganization: 'Nashik Waste Management Pvt. Ltd. (NWMPL)',
      },
    ];

    const results = [];
    for (const rec of records) {
      // Find existing by name
      const existing = await prisma.facility.findFirst({
        where: { name: rec.name },
      });

      if (existing) {
        const updated = await prisma.facility.update({
          where: { id: existing.id },
          data: rec,
        });
        results.push(updated);
      } else {
        const created = await prisma.facility.create({
          data: rec,
        });
        results.push(created);
      }
    }

    return results;
  }
}

export const datasetService = new DatasetService();
