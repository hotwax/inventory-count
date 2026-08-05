import fs from 'fs';
import path from 'path';

export type CycleCountCsvRow = Record<string, string>;

export type CycleCountUploadFixture = {
  csvPath: string;
  countImportName: string;
  row: CycleCountCsvRow;
  uploadFileName: string;
  facilityCandidates: string[];
  requestedItemId: string;
  requestedItemIds: string[];
};

function toCsvLine(values: string[]) {
  return values.map((value) => `"${String(value ?? '')}"`).join(',');
}

export function createCycleCountUploadFixture(
  clientId?: string,
  isHardCount = false
): CycleCountUploadFixture {
  const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const countImportName = `Auto-${isHardCount ? 'Hard' : 'Directed'}-${uniqueSuffix}`;
  
  let validProducts = ['WP0228Red', 'WP0528Red'];
  let validFacilities = ['BROOKLYN'];
  let activeFacilityId = '';

  try {
    const getClientConfig = require('../config/clients').getClientConfig;
    const clientConfig = getClientConfig(clientId || 'krewe-uat');
    if (clientConfig.skus?.length) validProducts = clientConfig.skus;
    if (clientConfig.facilities?.length) validFacilities = clientConfig.facilities;

    const authDataPath = path.join(process.cwd(), 'playwright', '.auth', `${clientId || 'krewe-uat'}.user.json`);
    if (fs.existsSync(authDataPath)) {
      const authData = JSON.parse(fs.readFileSync(authDataPath, 'utf-8'));
      const productStoreEntry = authData.origins?.[0]?.localStorage?.find(
        (entry: any) => entry.name.toLowerCase().includes('productstore')
      );
      if (productStoreEntry?.value) {
        const productStore = JSON.parse(productStoreEntry.value);
        activeFacilityId = productStore?.currentFacility?.facilityId || productStore?.currentFacility?.externalId || '';
      }
    }
  } catch (err) {
    console.error("Fixture error: ", err);
  }

  const fallbackFacility = validFacilities[Math.floor(Math.random() * validFacilities.length)];
  const facility = activeFacilityId || fallbackFacility;

  // For dates, format as MM-dd-yyyy HH:mm:ss
  const pad = (n: number) => n.toString().padStart(2, '0');
  const now = new Date();
  
  const startObj = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Yesterday
  const estimatedStartDate = `${pad(startObj.getMonth()+1)}-${pad(startObj.getDate())}-${startObj.getFullYear()} ${pad(startObj.getHours())}:${pad(startObj.getMinutes())}:${pad(startObj.getSeconds())}`;
  
  const dueObj = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days
  const estimatedCompletionDate = `${pad(dueObj.getMonth()+1)}-${pad(dueObj.getDate())}-${dueObj.getFullYear()} ${pad(dueObj.getHours())}:${pad(dueObj.getMinutes())}:${pad(dueObj.getSeconds())}`;

  const headers = [
    'countImportName',
    'purposeType',
    'idType',
    'idValue',
    'externalFacilityId',
    'estimatedCompletionDate',
    'estimatedStartDate'
  ];

  let rows: CycleCountCsvRow[] = [];
  const purposeType = isHardCount ? 'HARD_COUNT' : 'DIRECTED_COUNT';

  if (isHardCount) {
    rows.push({
      countImportName,
      purposeType,
      idType: 'SKU',
      idValue: '',
      externalFacilityId: facility,
      estimatedCompletionDate,
      estimatedStartDate
    });
  } else {
    // Generate up to 3 unique SKUs
    const numProducts = Math.min(3, validProducts.length);
    const selectedSkus = [...validProducts].sort(() => 0.5 - Math.random()).slice(0, numProducts);
    
    for (const sku of selectedSkus) {
      rows.push({
        countImportName,
        purposeType,
        idType: 'SKU',
        idValue: sku,
        externalFacilityId: facility,
        estimatedCompletionDate,
        estimatedStartDate
      });
    }
  }

  const fixtureDir = path.join(process.cwd(), 'playwright', 'test-fixtures');
  if (!fs.existsSync(fixtureDir)) fs.mkdirSync(fixtureDir, { recursive: true });
  
  const csvPath = path.join(fixtureDir, `${countImportName}.csv`);
  
  const csvLines = [toCsvLine(headers)];
  for (const rowObj of rows) {
    const orderedValues = headers.map(h => rowObj[h] ?? '');
    csvLines.push(toCsvLine(orderedValues));
  }
  
  fs.writeFileSync(csvPath, csvLines.join('\n') + '\n', 'utf-8');

  // Provide the first row for backwards compatibility with existing tests
  const row = rows[0];

  return {
    csvPath,
    countImportName,
    row,
    uploadFileName: path.basename(csvPath),
    facilityCandidates: [facility],
    requestedItemId: row.idValue,
    requestedItemIds: rows.map(r => r.idValue),
  };
}

export function cleanupCycleCountUploadFixture(fixture: Pick<CycleCountUploadFixture, 'csvPath'>) {
  if (fixture.csvPath && fs.existsSync(fixture.csvPath)) {
    fs.unlinkSync(fixture.csvPath);
  }
}
