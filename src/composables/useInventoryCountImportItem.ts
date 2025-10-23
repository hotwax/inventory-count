import { ref, computed, ComputedRef } from 'vue';
import Dexie, { Table } from 'dexie';
import { useProductMaster } from './useProductMaster';
import { hasError } from '@hotwax/oms-api';
import api from '@/api';
import { wrap } from 'comlink';
import type { InventorySyncWorker } from '@/workers/inventorySyncWorker';

/**
 * Schema definitions
 */

interface ScanEvent {
  id?: number;
  scannedValue?: string;
  inventoryCountImportId: string;
  locationSeqId?: string | null;
  qty: number;
  createdAt: number; // millis
  aggApplied: number;
}

interface InventoryCountRecord {
  // merged fields from InventoryCountImportItem + InventoryCountImport
  inventoryCountImportId: string;
  importItemSeqId: number;
  sku: string;
  productId: string | null;
  productIdentifier: string;
  locationSeqId?: string | null;
  quantity: number;
  syncedQty: number;
  status: 'active' | 'closed';
  facilityId: string;
  createdAt: number; // millis
  lastScanAt: number; // millis
  lastUpdatedAt?: number;
  lastSyncedAt?: number | null;
  lastSyncedBatchId?: string | null;
  aggApplied?: number;
}

interface RecordScanParams {
  inventoryCountImportId: string;
  sku: string;
  qty: number;
  locationSeqId?: string | null;
}

/**
 * Dexie Database
 */
class InventoryCountDB extends Dexie {
  scanEvents!: Table<ScanEvent, number>;
  inventoryCountRecords!: Table<InventoryCountRecord, [string, number]>;

  constructor() {
    super('InventoryCountDB');
    this.version(2).stores({
      scanEvents: '++id, inventoryCountImportId, aggApplied',
      inventoryCountRecords: '[inventoryCountImportId+importItemSeqId], sku, productId'
    });
  }
}

const db = new InventoryCountDB();

/**
 * Utility Functions
 */
function generateULID(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 5);
}

function currentMillis(): number {
  return Date.now();
}

/**
 * Main composable
 */
export function useInventoryCountImport() {
  const syncStatus = ref<'idle'>('idle');
  const currentImport = ref<InventoryCountRecord | null>(null);
  const productMaster = useProductMaster();

  /** Loads a specific inventory import record session */
  async function loadSession(inventoryCountImportId: string): Promise<void> {
    const session = await db.inventoryCountRecords
      .where('inventoryCountImportId')
      .equals(inventoryCountImportId)
      .first();
    currentImport.value = session || null;
  }

  /** Creates a new inventory import session */
  async function createSession(inventoryCountImportId: string, facilityId: string): Promise<void> {
    const now = currentMillis();
    const session: InventoryCountRecord = {
      inventoryCountImportId,
      importItemSeqId: 0,
      sku: '',
      productId: null,
      productIdentifier: '',
      quantity: 0,
      syncedQty: 0,
      status: 'active',
      facilityId,
      createdAt: now,
      lastScanAt: now
    };
    await db.inventoryCountRecords.put(session);
    currentImport.value = session;
  }

  /** Records a scan event */
  async function recordScan(params: RecordScanParams): Promise<void> {
    const event: ScanEvent = {
      inventoryCountImportId: params.inventoryCountImportId,
      locationSeqId: params.locationSeqId || null,
      qty: params.qty,
      createdAt: currentMillis(),
      aggApplied: 0
    };
    await db.scanEvents.add(event);
  }

  /** Aggregates scan events into inventory count records */
  async function aggregateScanEvents(): Promise<void> {
    const unAppliedEvents = await db.scanEvents.where('aggApplied').equals(0).toArray();
    if (unAppliedEvents.length === 0) return;

    await db.transaction('rw', db.scanEvents, db.inventoryCountRecords, async () => {
      for (const scan of unAppliedEvents) {
        const { inventoryCountImportId, qty, locationSeqId, createdAt, scannedValue } = scan;

        const existing = await db.inventoryCountRecords
          .where('[inventoryCountImportId+sku]')
          .equals([inventoryCountImportId, scannedValue || ''])
          .first();

        if (!existing) {
          const product = await productMaster.findByIdentification('sku', scannedValue || '');

          const maxSeq = await db.inventoryCountRecords
            .where('inventoryCountImportId')
            .equals(inventoryCountImportId)
            .last()
            .then((item) => item?.importItemSeqId || 0);

          const seqId = maxSeq + 1;

          const newRecord: InventoryCountRecord = {
            inventoryCountImportId,
            importItemSeqId: seqId,
            sku: scannedValue || '',
            productId: product?.product?.productId || null,
            productIdentifier: scannedValue || '',
            locationSeqId: locationSeqId || null,
            quantity: qty,
            syncedQty: 0,
            status: 'active',
            facilityId: '',
            createdAt,
            lastScanAt: createdAt,
            aggApplied: 1
          };
          await db.inventoryCountRecords.add(newRecord);
        } else {
          await db.inventoryCountRecords.update(existing, {
            quantity: existing.quantity + qty,
            lastScanAt: createdAt
          });
        }

        await db.scanEvents.update(scan.id!, { aggApplied: 1 });
      }
    });
  }

  /** Starts sync worker */
  async function startSyncWorker() {
    if (typeof window === 'undefined') {
      console.warn('Web Workers not available in SSR/Node environment.');
      return;
    }

    const worker = new Worker(new URL('@/workers/inventorySyncWorker.ts', import.meta.url), { type: 'module' });
    const workerApi = wrap<InventorySyncWorker>(worker);

    try {
      await workerApi.startSync();
    } catch (error) {
      console.error('Error starting inventory sync worker:', error);
    }
  }

  /** Computes items pending sync */
  const pendingItems: ComputedRef<Promise<InventoryCountRecord[]>> = computed(() =>
    db.inventoryCountRecords
      .where('quantity')
      .notEqual(0)
      .and((item) => item.quantity !== item.syncedQty)
      .toArray()
  );

  /** Scheduler for periodic aggregation */
  function startAggregationScheduler(): void {
    setInterval(() => {
      aggregateScanEvents().catch((error) => console.error('Aggregation error:', error));
    }, 15 * 60 * 1000); // every 15 min
  }

  /** Load inventory items from backend into Dexie */
  async function loadInventoryItemsFromBackend(inventoryCountImportId: string): Promise<void> {
    try {
      const resp = await api({
        url: `/cycleCounts/${inventoryCountImportId}/items/summary`,
        method: 'GET'
      });

      if (!hasError(resp) && resp?.data?.length) {
        const items = resp.data;
        await db.transaction('rw', db.inventoryCountRecords, async () => {
          for (const item of items) {
            if (item.statusId !== 'INV_COUNT_VOIDED') {
                await db.inventoryCountRecords.put({
                inventoryCountImportId: item.inventoryCountImportId,
                importItemSeqId: item.importItemSeqId,
                sku: item.sku,
                productId: item.productId || null,
                productIdentifier: item.sku,
                locationSeqId: item.locationSeqId || null,
                quantity: item.quantity,
                syncedQty: item.syncedQty,
                status: 'active',
                facilityId: item.facilityId,
                createdAt: Date.parse(item.createdAt) || currentMillis(),
                lastScanAt: Date.parse(item.lastScanAt) || currentMillis(),
                lastSyncedAt: item.lastSyncedAt ? Date.parse(item.lastSyncedAt) : null,
                lastSyncedBatchId: item.lastSyncedBatchId || null,
                aggApplied: 0
              });
            }
          }
        });
      }
    } catch (err) {
      console.error('Error loading inventory items', err);
    }
  }

  return {
    currentImport,
    syncStatus,
    loadSession,
    createSession,
    recordScan,
    aggregateScanEvents,
    pendingItems,
    loadInventoryItemsFromBackend,
    startAggregationScheduler,
    startSyncWorker
  };
}