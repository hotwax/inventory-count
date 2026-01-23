import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const REQUIRED_FIELDS = ['countImportName', 'productSku'];
const OPTIONAL_FIELDS = [
  'purposeType',
  'facility',
  'externalFacility',
  'estimatedCompletionDate',
  'estimatedStartDate',
];
const SUPPORTED_FORMAT = 'CSV';
const DATE_FORMAT = 'MM-dd-yyyy HH:mm:ss';

const SAMPLE_ROWS = [
  {
    countImportName: 'Weekly store audit',
    purposeType: 'DIRECTED_COUNT',
    productSku: 'SKU-12345',
    facility: 'FACILITY_100',
    externalFacility: '',
    estimatedCompletionDate: '02-20-2001 02:00:00',
    estimatedStartDate: '07-21-2003 08:20:00',
  },
  {
    countImportName: 'Distribution center spot check',
    purposeType: 'HARD_COUNT',
    productSku: '',
    facility: 'FACILITY_DC_01',
    externalFacility: '',
    estimatedCompletionDate: '02-20-2001 02:00:00',
    estimatedStartDate: '07-21-2003 08:20:00',
  },
];

const escapeCsvValue = (value: string) => {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

const buildSampleCsv = () => {
  const headers = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];
  const lines = [headers.join(',')];

  for (const row of SAMPLE_ROWS) {
    const line = headers
      .map((header) => escapeCsvValue(String(row[header as keyof typeof row] ?? '')))
      .join(',');
    lines.push(line);
  }

  return lines.join('\n');
};

const shouldIncludeSample = (errorMessage?: string, requestSample?: boolean) => {
  if (requestSample) return true;
  if (!errorMessage) return false;
  const value = errorMessage.toLowerCase();
  return value.includes('sample') || value.includes('template') || value.includes('example');
};

export const uploadHelpTool = createTool({
  id: 'upload-help',
  description: 'Explain bulk upload requirements and common file upload errors for inventory counts.',
  inputSchema: z.object({
    errorMessage: z.string().optional(),
    missingSkus: z.array(z.string()).optional(),
    missingFacilities: z.array(z.string()).optional(),
    requestSample: z.boolean().optional(),
  }),
  outputSchema: z.object({
    summary: z.string(),
    fixes: z.array(z.string()),
    supportedFormat: z.string(),
    dateFormat: z.string(),
    requiredFields: z.array(z.string()),
    optionalFields: z.array(z.string()),
    missingSkus: z.array(z.string()).optional(),
    missingFacilities: z.array(z.string()).optional(),
    sampleCsv: z.string().optional(),
  }),
  execute: async ({ errorMessage, missingSkus = [], missingFacilities = [], requestSample }) => {
    const fixes: string[] = [];
    const summaryParts: string[] = [];
    const errorText = errorMessage?.toLowerCase() || '';

    if (errorText.includes('date') || errorText.includes('format')) {
      fixes.push(`Use date format ${DATE_FORMAT} for estimatedStartDate and estimatedCompletionDate.`);
      summaryParts.push('Date format issue detected.');
    }

    if (errorText.includes('facility')) {
      fixes.push('Ensure facility or externalFacility values match a facility the user can access.');
      summaryParts.push('Facility validation issue detected.');
    }

    if (errorText.includes('sku') || errorText.includes('product')) {
      fixes.push('Verify the uploaded SKU exists in product master before uploading.');
      summaryParts.push('SKU/product validation issue detected.');
    }

    if (missingFacilities.length) {
      fixes.push('Resolve missing facilities or update file values to valid facility IDs.');
    }

    if (missingSkus.length) {
      fixes.push('Missing SKUs indicate products are not in the catalog for those values.');
    }

    if (!fixes.length) {
      fixes.push('Confirm the required fields are mapped and the file is a valid CSV.');
    }

    const summary = summaryParts.length
      ? summaryParts.join(' ')
      : 'Bulk upload guidance for inventory counts.';

    const response: {
      summary: string;
      fixes: string[];
      supportedFormat: string;
      dateFormat: string;
      requiredFields: string[];
      optionalFields: string[];
      missingSkus?: string[];
      missingFacilities?: string[];
      sampleCsv?: string;
    } = {
      summary,
      fixes,
      supportedFormat: SUPPORTED_FORMAT,
      dateFormat: DATE_FORMAT,
      requiredFields: REQUIRED_FIELDS,
      optionalFields: OPTIONAL_FIELDS,
    };

    if (missingSkus.length) response.missingSkus = missingSkus.slice(0, 50);
    if (missingFacilities.length) response.missingFacilities = missingFacilities.slice(0, 50);

    if (shouldIncludeSample(errorMessage, requestSample)) {
      response.sampleCsv = buildSampleCsv();
    }

    return response;
  },
});
