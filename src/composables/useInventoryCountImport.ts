import { ref, computed, ComputedRef } from 'vue';
import Dexie, { Table, liveQuery } from 'dexie';
import { useProductMaster } from './useProductMaster';
import { hasError } from '@hotwax/oms-api';
import api, { client } from '@/api';
import { v4 as uuidv4 } from 'uuid';
import store from '@/store';

/**
 * Schema definitions
 */

interface ScanEvent {
  id?: number;
  scannedValue?: string;
  inventoryCountImportId: string;
  locationSeqId?: string | null;
  quantity: number;
  createdAt: number; // millis
  aggApplied: number;
  
}

interface InventoryCountImportItem {
  // merged fields from InventoryCountImportItem + InventoryCountImport
  inventoryCountImportId: string;
  productId: string | null;
  uuid: string;
  productIdentifier: string;
  locationSeqId?: string | null;
  quantity: number;
  status: 'active' | 'closed';
  facilityId: string;
  createdAt: number; // millis
  lastScanAt: number; // millis
  lastUpdatedAt?: number;
  lastSyncedAt?: number | null;
  lastSyncedBatchId?: string | null;
  aggApplied?: number;
  isRequested?: string;
}

interface RecordScanParams {
  inventoryCountImportId: string;
  productIdentifier: string;
  quantity: number;
  locationSeqId?: string | null;
}

/**
 * Dexie Database
 */
class InventoryCountDB extends Dexie {
  scanEvents!: Table<ScanEvent, number>;
  inventoryCountRecords!: Table<InventoryCountImportItem, [string, number]>;

  constructor() {
    super('InventoryCountDB');
    this.version(1).stores({
      scanEvents: '++id, inventoryCountImportId, aggApplied',
      inventoryCountRecords: '[inventoryCountImportId+uuid], inventoryCountImportId, uuid, productIdentifier, productId, quantity, isRequested'
    });
  }
}

const db = new InventoryCountDB();

/**
 * Utility Functions
 */
function currentMillis(): number {
  return Date.now();
}

/**
 * Main composable
 */
export function useInventoryCountImport() {
  const syncStatus = ref<'idle'>('idle');
  const currentImport = ref<InventoryCountImportItem | null>(null);
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
   /* Implementation yet to be done
    const now = currentMillis();
    const session: InventoryCountImportItem = {
      inventoryCountImportId,
      productId: null,
      uuid: '',
      productIdentifier: '',
      quantity: 0,
      status: 'active',
      facilityId,
      createdAt: now,
      lastScanAt: now
    };
    await db.inventoryCountRecords.put(session);
    currentImport.value = session; */
  }

  /** Records a scan event */
  async function recordScan(params: RecordScanParams): Promise<void> {
    const event: ScanEvent = {
      inventoryCountImportId: params.inventoryCountImportId,
      locationSeqId: params.locationSeqId || null,
      scannedValue: params.productIdentifier,
      quantity: params.quantity,
      createdAt: currentMillis(),
      aggApplied: 0
    };
    await db.scanEvents.add(event);
  }

  /** Load inventory items from backend into Dexie */
  async function loadInventoryItemsFromBackend(workEffortId: string, inventoryCountImportId: string): Promise<void> {
    try {
      const resp = await api({
        url: `inventory-cycle-count/cycleCounts/inventoryCountSession/${inventoryCountImportId}/items`,
        method: 'GET',
        params: {pageSize:500}
      });

      if (!hasError(resp) && resp?.data?.length) {
        const items = resp.data;
        await db.transaction('rw', db.inventoryCountRecords, async () => {
          for (const item of items) {
            await db.inventoryCountRecords.put({
              inventoryCountImportId: item.inventoryCountImportId,
              productId: item.productId || null,
              uuid: item.uuid || uuidv4(),
              isRequested: item.isRequested || 'Y',
              productIdentifier: item.productIdentifier || '',
              locationSeqId: item.locationSeqId || null,
              quantity: item.quantity || 0,              // default 0 until user scans
              status: 'active',
              facilityId: '',
              createdAt: item.createdDate || currentMillis(),
              lastScanAt: item.lastUpdatedStamp || currentMillis(),
              lastUpdatedAt: item.lastUpdatedStamp || currentMillis(),
              lastSyncedAt: null,
              lastSyncedBatchId: null,
              aggApplied: 0
            });
          }
        });
      }
    } catch (err) {
      console.error('Error loading inventory items', err);
    }
  }

  async function getInventoryRecordsFromIndexedDB(inventoryCountImportId: string) {
    try {
      const records = await db.inventoryCountRecords
        .where('inventoryCountImportId')
        .equals(inventoryCountImportId)
        .toArray();

      return records || [];
    } catch (err) {
      console.error('Error fetching inventory records from IndexedDB:', err);
      return [];
    }
  }

  const getUnmatchedItems = (inventoryCountImportId: string) =>
    liveQuery(() => db.table('inventoryCountRecords')
      .where('inventoryCountImportId')
      .equals(inventoryCountImportId)
      .filter(r => !r.productId)
      .toArray());

  const getCountedItems = (inventoryCountImportId: string) =>
    liveQuery(() =>
      db.table('inventoryCountRecords')
        .where('inventoryCountImportId')
        .equals(inventoryCountImportId)
        .filter(r => (Number(r.quantity) || 0) > 0 && r.isRequested === 'Y')
        .toArray());

  const getUncountedItems = (inventoryCountImportId: string) =>
    liveQuery(() => db.table('inventoryCountRecords')
      .where('inventoryCountImportId')
      .equals(inventoryCountImportId)
      .filter(r => (Number(r.quantity) || 0) === 0)
      .toArray());

  const getUndirectedItems = (inventoryCountImportId: string) =>
    liveQuery(() => db.table('inventoryCountRecords')
      .where('inventoryCountImportId')
      .equals(inventoryCountImportId)
      .filter(r => r.isRequested === 'N' && r.productId)
      .toArray());

  const fetchCycleCount = async (payload: any): Promise <any>  => {
    return api({
      url: `inventory-cycle-count/cycleCounts/workEfforts/${payload.workEffortId}/reviews`,
      method: "get",
      params: payload
    });
  }

  const fetchSessions = async (payload: any): Promise <any> => {
    return api({
      url: `inventory-cycle-count/cycleCounts/workEfforts/${payload.workEffortId}/counts`,
      method: "get",
      params: payload
    });
  }

  const fetchWorkEffort = async (payload: any): Promise<any> => {
    return api({
      url: `inventory-cycle-count/cycleCounts/workEfforts/${payload.workEffortId}`,
      method: "get"
    });
  }

  const getProductReviewDetail = async (payload: any): Promise<any> => {
    return api({
      url: `inventory-cycle-count/cycleCounts/workEfforts/${payload.workEffortId}/reviews`,
      method: "get",
      params: {
        internalName: payload.internalName
      }
    });
  }

  async function createSessionOnServer (payload: any) {

    const resp = await api({
        url: `inventory-cycle-count/cycleCounts/workEfforts/${payload.workEffortId}/sessions`,
        method: "post",
        data: payload
      })
    return resp;
  }

  const getAssignedWorkEfforts = async (params: any): Promise <any> => {
  return api({
    url: "inventory-cycle-count/cycleCounts/workEfforts",
    method: "get",
    params
  });
}
const getWorkEfforts = async (params: any): Promise <any> => {
  return api({
    url: "inventory-cycle-count/cycleCounts/workEfforts",
    method: "get",
    params
  });
}

const getInventoryCountImportsByWorkEffort = async (params: any): Promise <any> => {
  return api({
    url: `inventory-cycle-count/cycleCounts/workEfforts/${params.workEffortId}/sessions`,
    method: "get",
  });
}

const addSessionInCount = async (payload: any): Promise<any> => {
  return api({
    url: `inventory-cycle-count/cycleCounts/workEfforts/${payload.workEffortId}/sessions`,
    method: "post",
    data: payload
  }
  );
}

const getInventoryCountImportSession = async (params: { inventoryCountImportId: string; }): Promise<any> => {
  return await api({
    url: `inventory-cycle-count/cycleCounts/inventoryCountSession/${params.inventoryCountImportId}`,
    method: 'get',
    params
  });
}

const bulkUploadInventoryCounts = async (payload: any): Promise <any>  => {
  return api({
    url: `inventory-cycle-count/cycleCounts/upload`,
    method: "post",
    ...payload
  });
}

const fetchCycleCountImportSystemMessages = async (payload: any): Promise <any>  => {
  return api({
    url: `inventory-cycle-count/cycleCounts/systemMessages`,
    method: "get",
    params: payload
  });
}

const cancelCycleCountFileProcessing = async (payload: any): Promise <any>  => {
  return api({
    url: `inventory-cycle-count/cycleCounts/systemMessages/${payload.systemMessageId}`,
    method: "post",
    data: payload
  });
}

const fetchCycleCountUploadedFileData = async (payload: any): Promise <any> => {
  return api({
    url: `inventory-cycle-count/cycleCounts/systemMessages/${payload.systemMessageId}/downloadFile`,
    method: "get",
    data: payload
  });
}

const fetchCycleCountImportErrors = async (payload: any): Promise <any>  => {
  return api({
    url: `inventory-cycle-count/cycleCounts/systemMessages/${payload.systemMessageId}/errors`,
    method: "get",
    data: payload
  });
}

    
  return {
    currentImport,
    createSessionOnServer,
    syncStatus,
    loadSession,
    createSession,
    recordScan,
    loadInventoryItemsFromBackend,
    getInventoryRecordsFromIndexedDB,
    getUnmatchedItems,
    getCountedItems,
    getUncountedItems,
    getUndirectedItems,
    fetchCycleCount,
    fetchSessions,
    fetchWorkEffort,
    getProductReviewDetail,
    cancelCycleCountFileProcessing,
    getAssignedWorkEfforts,
    getInventoryCountImportsByWorkEffort,
    getInventoryCountImportSession,
    bulkUploadInventoryCounts,
    fetchCycleCountImportSystemMessages,
    fetchCycleCountUploadedFileData,
    addSessionInCount,
    getWorkEfforts,
    fetchCycleCountImportErrors
  };
}