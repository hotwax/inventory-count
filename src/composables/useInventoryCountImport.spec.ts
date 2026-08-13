import { describe, it, expect, vi, beforeEach } from 'vitest';
import Papa from 'papaparse';

/**
 * The CSV built here is consumed by co.hotwax.cycleCount.InventoryCountServices.import#InventoryCount,
 * so the header names are a contract with that service.
 */

const api = vi.fn();

vi.mock('@common', () => ({ api: (...args: any[]) => api(...args) }));
vi.mock('@/services/appInitializer', () => ({ db: { scanEvents: {}, table: () => ({}) } }));
vi.mock('@/services/commonDatabase', () => ({}));
vi.mock('./useProductMaster', () => ({ useProductMaster: () => ({}) }));
vi.mock('@/stores/productStore', () => ({ useProductStore: () => ({ getCurrentFacility: {} }) }));
vi.mock('dexie', () => ({ liveQuery: vi.fn() }));

import { useInventoryCountImport } from './useInventoryCountImport';

async function readBlob(blob: Blob): Promise<string> {
  // jsdom Blob has no text() in older versions, FileReader is always available
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsText(blob);
  });
}

describe('createCycleCountFromProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.mockResolvedValue({ status: 200, data: {} });
  });

  it('posts a multipart CSV with one row per product', async () => {
    await useInventoryCountImport().createCycleCountFromProducts({
      countName: 'Weekly store audit',
      purposeType: 'DIRECTED_COUNT',
      facilityId: 'STORE_1',
      startDate: '08-03-2026 00:00:00',
      dueDate: '08-10-2026 23:59:59',
      products: [
        { productId: 'P1', internalName: 'SKU-1' },
        { productId: 'P2', sku: 'SKU-2' },
        { productId: 'P3' }
      ]
    });

    expect(api).toHaveBeenCalledTimes(1);
    const request = api.mock.calls[0][0];
    expect(request.url).toBe('inventory-cycle-count/cycleCounts/upload');
    expect(request.method).toBe('post');
    expect(request.headers['Content-Type']).toContain('multipart/form-data');

    const formData: FormData = request.data;
    expect(formData.get('fileName')).toBe('Weekly_store_audit');

    const file = formData.get('uploadedFile') as File;
    const csv = await readBlob(file);
    const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });

    // Header is the import service's in-parameter names
    expect(parsed.meta.fields).toEqual([
      'countImportName',
      'purposeType',
      'facilityId',
      'productId',
      'idType',
      'idValue',
      'estimatedStartDate',
      'estimatedCompletionDate'
    ]);

    expect(parsed.data).toHaveLength(3);
    expect(parsed.data[0]).toEqual({
      countImportName: 'Weekly store audit',
      purposeType: 'DIRECTED_COUNT',
      facilityId: 'STORE_1',
      productId: 'P1',
      idType: 'SKU',
      idValue: 'SKU-1',
      estimatedStartDate: '08-03-2026 00:00:00',
      estimatedCompletionDate: '08-10-2026 23:59:59'
    });
    // sku is used when internalName is absent, and a missing one is empty rather than "undefined"
    expect((parsed.data[1] as any).idValue).toBe('SKU-2');
    expect((parsed.data[2] as any).idValue).toBe('');
  });

  it('keeps a count name with commas and quotes intact through the CSV', async () => {
    await useInventoryCountImport().createCycleCountFromProducts({
      countName: 'Audit "A", aisle 3',
      purposeType: 'HARD_COUNT',
      facilityId: 'STORE_1',
      startDate: '08-03-2026 00:00:00',
      dueDate: '08-10-2026 23:59:59',
      products: [{ productId: 'P1', internalName: 'SKU-1' }]
    });

    const formData: FormData = api.mock.calls[0][0].data;
    const csv = await readBlob(formData.get('uploadedFile') as File);
    const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });

    expect((parsed.data[0] as any).countImportName).toBe('Audit "A", aisle 3');
    // The filename is sanitised, the value inside the file is not
    expect(formData.get('fileName')).toBe('Audit_A_aisle_3');
  });
});
