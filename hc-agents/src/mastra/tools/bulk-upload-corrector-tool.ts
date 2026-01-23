import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const rowSchema = z.record(z.any());

const normalizeKey = (value?: string | null) => (value || '').trim().toLowerCase();

const formatDate = (date: Date) => {
  const pad = (value: number) => `${value}`.padStart(2, '0');
  return [
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    date.getFullYear(),
  ].join('-') + ` ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const parseDateValue = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}:\d{2}$/.test(trimmed)) return null;

  const direct = new Date(trimmed);
  if (!Number.isNaN(direct.getTime())) return direct;

  const match = trimmed.match(
    /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (!match) return null;

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  const hours = Number(match[4] || 0);
  const minutes = Number(match[5] || 0);
  const seconds = Number(match[6] || 0);

  const date = new Date(year, month - 1, day, hours, minutes, seconds);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const collectColumns = (rows: Record<string, unknown>[]) => {
  const columns: string[] = [];
  rows.forEach((row) => {
    Object.keys(row).forEach((key) => {
      if (!columns.includes(key)) columns.push(key);
    });
  });
  return columns;
};

const toCsvValue = (value: unknown) => {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const toCsv = (rows: Record<string, unknown>[]) => {
  if (!rows.length) return '';
  const columns = collectColumns(rows);
  const header = columns.join(',');
  const lines = rows.map((row) => columns.map((column) => toCsvValue(row[column])).join(','));
  return [header, ...lines].join('\n');
};

export const bulkUploadCorrectorTool = createTool({
  id: 'bulk-upload-corrector',
  description: 'Correct common bulk upload CSV issues using app-provided data and defaults.',
  inputSchema: z.object({
    rows: z.array(rowSchema),
    errorText: z.string().optional(),
    missingSkus: z.array(z.string()).optional(),
    missingFacilities: z.array(z.string()).optional(),
    requiredFields: z.array(z.string()).optional(),
    dateFormat: z.string().optional(),
    defaultFacilityId: z.string().optional(),
  }),
  outputSchema: z.object({
    summary: z.string(),
    fixes: z.array(z.string()),
    warnings: z.array(z.string()),
    correctedRows: z.array(rowSchema),
    correctedCsv: z.string(),
    removedRows: z.number(),
  }),
  execute: async ({
    rows,
    errorText,
    missingSkus = [],
    missingFacilities = [],
    requiredFields = [],
    defaultFacilityId,
  }) => {
    const missingSkuSet = new Set(missingSkus.map(normalizeKey).filter(Boolean));
    const missingFacilitySet = new Set(missingFacilities.map(normalizeKey).filter(Boolean));
    const fixes: string[] = [];
    const warnings: string[] = [];

    const facilityKeys = ['facilityId', 'facility', 'externalFacilityId', 'facilityExternalId', 'facilityCode'];
    const skuKeys = ['productSku', 'productId', 'sku', 'productIdentifier', 'productCode', 'idValue'];

    let filledFacilities = 0;
    let reformattedDates = 0;
    let removedRows = 0;

    const correctedRows: Record<string, unknown>[] = [];

    rows.forEach((row) => {
      const updatedRow = { ...row };
      let valid = true;

      const rowKeys = Object.keys(updatedRow);

      const dateKeys = rowKeys.filter((key) => /date/i.test(key));
      dateKeys.forEach((key) => {
        const value = updatedRow[key];
        if (typeof value !== 'string') return;
        const parsed = parseDateValue(value);
        if (parsed) {
          updatedRow[key] = formatDate(parsed);
          reformattedDates += 1;
        }
      });

      const facilityKey = rowKeys.find((key) => facilityKeys.includes(key));
      if (facilityKey) {
        const value = (updatedRow[facilityKey] ?? '').toString().trim();
        const normalized = normalizeKey(value);
        if (!value) {
          if (defaultFacilityId) {
            updatedRow[facilityKey] = defaultFacilityId;
            filledFacilities += 1;
          } else {
            valid = false;
          }
        } else if (missingFacilitySet.has(normalized)) {
          if (defaultFacilityId) {
            updatedRow[facilityKey] = defaultFacilityId;
            filledFacilities += 1;
          } else {
            valid = false;
          }
        }
      }

      const skuKey = rowKeys.find((key) => skuKeys.includes(key));
      const skuValue = skuKey ? (updatedRow[skuKey] ?? '').toString().trim() : '';
      if (skuKey && missingSkuSet.has(normalizeKey(skuValue))) {
        valid = false;
      }
      if (requiredFields.length) {
        for (const field of requiredFields) {
          if (!rowKeys.includes(field)) continue;
          const value = (updatedRow[field] ?? '').toString().trim();
          if (!value) {
            valid = false;
            break;
          }
        }
      }

      if (valid) {
        correctedRows.push(updatedRow);
      } else {
        removedRows += 1;
      }
    });

    if (filledFacilities) {
      fixes.push(`Filled ${filledFacilities} missing facility value(s) using the default facility.`);
    }
    if (reformattedDates) {
      fixes.push(`Reformatted ${reformattedDates} date value(s) to the required format.`);
    }
    if (removedRows) {
      fixes.push(`Removed ${removedRows} row(s) that could not be corrected.`);
    }
    if (!filledFacilities && !reformattedDates && !removedRows) {
      warnings.push('No automatic corrections were applied based on the provided data.');
    }
    if (missingSkuSet.size) {
      warnings.push('Rows with missing SKUs were removed because no match was found locally.');
    }
    if (!defaultFacilityId && missingFacilitySet.size) {
      warnings.push('Missing facility IDs could not be auto-filled without a default facility.');
    }
    if (errorText) {
      warnings.push(`Source error: ${errorText}`);
    }

    const correctedCsv = toCsv(correctedRows);

    return {
      summary: correctedRows.length
        ? `Corrected file generated with ${correctedRows.length} row(s).`
        : 'No rows remain after applying corrections.',
      fixes,
      warnings,
      correctedRows,
      correctedCsv,
      removedRows,
    };
  },
});
