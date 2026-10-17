import Papa from 'papaparse';
import { prisma } from '../database/client';

export interface CsvImportResult {
  sourceName: string;
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  errors: { row: number; error: string; raw: any }[];
}

export class ImportService {
  async importBinsCsv(csvString: string, sourceName = 'Manual CSV Upload'): Promise<CsvImportResult> {
    const parsed = Papa.parse(csvString, { header: true, skipEmptyLines: true });
    const rows = parsed.data as any[];

    const result: CsvImportResult = {
      sourceName,
      totalRows: rows.length,
      acceptedRows: 0,
      rejectedRows: 0,
      errors: [],
    };

    const wards = await prisma.ward.findMany();
    const wardMap = new Map<string, string>();
    for (const w of wards) {
      wardMap.set(w.code.toUpperCase(), w.id);
      wardMap.set(w.name.toUpperCase(), w.id);
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      // Validate required columns
      if (!row.code || !row.name || !row.latitude || !row.longitude) {
        result.rejectedRows++;
        result.errors.push({ row: rowNum, error: 'Missing required fields: code, name, latitude, or longitude.', raw: row });
        continue;
      }

      const lat = parseFloat(row.latitude);
      const lng = parseFloat(row.longitude);

      // Validate Nashik bounding box: lat ~ 19.8 to 20.2, lng ~ 73.6 to 74.0
      if (isNaN(lat) || isNaN(lng) || lat < 19.8 || lat > 20.2 || lng < 73.6 || lng > 74.0) {
        result.rejectedRows++;
        result.errors.push({
          row: rowNum,
          error: `Coordinates (${row.latitude}, ${row.longitude}) fall outside valid Nashik geographic bounds (19.8-20.2 N, 73.6-74.0 E).`,
          raw: row,
        });
        continue;
      }

      // Find or assign ward
      let wardId: string | undefined;
      if (row.ward_code && wardMap.has(row.ward_code.toUpperCase())) {
        wardId = wardMap.get(row.ward_code.toUpperCase());
      } else if (wards.length > 0) {
        wardId = wards[0].id; // Fallback to first ward
      }

      if (!wardId) {
        result.rejectedRows++;
        result.errors.push({ row: rowNum, error: `Invalid ward code: ${row.ward_code}`, raw: row });
        continue;
      }

      const cap = parseFloat(row.capacity_liters || '1000');
      const capacityLiters = isNaN(cap) || cap <= 0 ? 1000 : cap;

      try {
        await prisma.bin.upsert({
          where: { code: row.code.trim() },
          update: {
            name: row.name.trim(),
            wardId,
            latitude: lat,
            longitude: lng,
            capacityLiters,
            wasteType: row.waste_type || 'general',
            areaCategory: row.area_category || 'residential',
            status: row.status || 'active',
            provenance: 'imported',
          },
          create: {
            code: row.code.trim(),
            name: row.name.trim(),
            wardId,
            latitude: lat,
            longitude: lng,
            capacityLiters,
            wasteType: row.waste_type || 'general',
            areaCategory: row.area_category || 'residential',
            status: row.status || 'active',
            provenance: 'imported',
          },
        });
        result.acceptedRows++;
      } catch (err: any) {
        result.rejectedRows++;
        result.errors.push({ row: rowNum, error: `Database error: ${err.message}`, raw: row });
      }
    }

    // Record in DataSource table
    await prisma.dataSource.create({
      data: {
        name: sourceName,
        sourceType: 'open_source',
        acceptedRowsCount: result.acceptedRows,
        rejectedRowsCount: result.rejectedRows,
        dataQualityWarnings: result.rejectedRows > 0 ? `${result.rejectedRows} rows failed coordinate/ward validation` : 'Clean import',
      },
    });

    return result;
  }

  async importObservationsCsv(csvString: string, sourceName = 'Observation Feed Upload'): Promise<CsvImportResult> {
    const parsed = Papa.parse(csvString, { header: true, skipEmptyLines: true });
    const rows = parsed.data as any[];

    const result: CsvImportResult = {
      sourceName,
      totalRows: rows.length,
      acceptedRows: 0,
      rejectedRows: 0,
      errors: [],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      if (!row.bin_code || row.fill_percentage === undefined) {
        result.rejectedRows++;
        result.errors.push({ row: rowNum, error: 'Missing bin_code or fill_percentage', raw: row });
        continue;
      }

      const bin = await prisma.bin.findUnique({ where: { code: row.bin_code.trim() } });
      if (!bin) {
        result.rejectedRows++;
        result.errors.push({ row: rowNum, error: `Bin code "${row.bin_code}" does not exist in registry.`, raw: row });
        continue;
      }

      const fill = parseFloat(row.fill_percentage);
      if (isNaN(fill) || fill < 0 || fill > 100) {
        result.rejectedRows++;
        result.errors.push({ row: rowNum, error: `Invalid fill percentage "${row.fill_percentage}". Must be 0-100.`, raw: row });
        continue;
      }

      const obsDate = row.observed_at ? new Date(row.observed_at) : new Date();

      try {
        await prisma.binObservation.create({
          data: {
            binId: bin.id,
            fillPercentage: fill,
            observedAt: obsDate,
            observerType: row.observer_type || 'manual_inspection',
            provenance: 'imported',
            notes: row.notes || null,
          },
        });

        // Update bin current fill
        let urgency = 'low';
        if (fill >= 85) urgency = 'critical';
        else if (fill >= 70) urgency = 'high';
        else if (fill >= 45) urgency = 'medium';

        await prisma.bin.update({
          where: { id: bin.id },
          data: {
            currentFillPercentage: fill,
            lastObservedAt: obsDate,
            urgency,
          },
        });

        result.acceptedRows++;
      } catch (err: any) {
        result.rejectedRows++;
        result.errors.push({ row: rowNum, error: err.message, raw: row });
      }
    }

    return result;
  }
}

export const importService = new ImportService();
