import { ref } from 'vue';
import { liveQuery } from 'dexie';
import { useProductMaster } from './useProductMaster';
import { hasError } from '@hotwax/oms-api';
import api from '@/api';
import { v4 as uuidv4 } from 'uuid';

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

import { db } from '@/database/commonDatabase'

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

  /** Loads a specific inventory import record session */
  async function loadSession(inventoryCountImportId: string): Promise<void> {
    const session = await db.inventoryCountRecords
      .where('inventoryCountImportId')
      .equals(inventoryCountImportId)
      .first();
    currentImport.value = session || null;
  }

  /** Creates a new inventory import session */
  // async function createSession(inventoryCountImportId: string, facilityId: string): Promise<void> {
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
  // }

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
        const productIds = [...new Set(items.map((item: any) => item.productId).filter(Boolean))] as any

      if (productIds.length) {
        try {
          const existingProducts = await db.products.bulkGet(productIds);
          const existingIds = new Set(existingProducts.filter(Boolean).map((p: any) => p.productId));

          const missingIds = productIds.filter((id: string) => !existingIds.has(id));

          if (missingIds.length) {
            const productMaster = useProductMaster();
            const { getFromSolr, upsertFromApi } = productMaster as any;
            const newProducts = await getFromSolr(missingIds);

            if (newProducts?.length) {
              await upsertFromApi(newProducts);
            }
          }
        } catch (err) {
          console.warn("Failed to verify or fetch missing products:", err);
        }
      }
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
    liveQuery(async () => {
    const items = await db.inventoryCountRecords
      .where('inventoryCountImportId')
      .equals(inventoryCountImportId)
      .filter(r => !r.productId)
      .toArray()

    const productIds = [...new Set(items.map(i => i.productId).filter(Boolean))] as any;
    const products = await db.products.bulkGet(productIds)
    const productMap = new Map(products.filter(Boolean).map(p => [p!.productId, p!]))

    return items.map(item => ({
      ...item,
      product: productMap.get(item.productId || '')
    }))
  });

  const getCountedItems = (inventoryCountImportId: string) =>
    liveQuery(async () => {
    const items = await db.inventoryCountRecords
      .where('inventoryCountImportId')
      .equals(inventoryCountImportId)
      .filter(r => ((Number(r.quantity) || 0) > 0 && r.isRequested === 'Y' && Boolean(r.productId)))
      .toArray()

    const productIds = [...new Set(items.map(i => i.productId).filter(Boolean))] as any;
    const products = await db.products.bulkGet(productIds)
    const productMap = new Map(products.filter(Boolean).map(p => [p!.productId, p!]))
    return items.map((item) => {
      const product = productMap.get(item.productId || "");
      let unmatched = false;

      if (product) {
        const allValues: string[] = [product.productId, product.internalName, ...(product.goodIdentifications?.map((gi: any) => gi.value) || []),
        ].map((v) => (v || "").toLowerCase());

        // Mark as unmatched if productIdentifier doesn't appear in product details
        if (item.productIdentifier && !allValues.includes(item.productIdentifier.toLowerCase())) {
          unmatched = true;
        }
      }
      return {
        ...item,
        product,
        unmatched,
      };
    });
  });

  const getUncountedItems = (inventoryCountImportId: string) =>
    liveQuery(async () => {
    const items = await db.inventoryCountRecords
      .where('inventoryCountImportId')
      .equals(inventoryCountImportId)
      .filter(r => (Number(r.quantity) || 0) === 0)
      .toArray()

    const productIds = [...new Set(items.map(i => i.productId).filter(Boolean))] as any;
    const products = await db.products.bulkGet(productIds)
    const productMap = new Map(products.filter(Boolean).map(p => [p!.productId, p!]))

    return items.map(item => ({
      ...item,
      product: productMap.get(item.productId || '')
    }))
  });

  const getUndirectedItems = (inventoryCountImportId: string) =>
    liveQuery(async () => {
      const items = await db.table('inventoryCountRecords')
        .where('inventoryCountImportId')
        .equals(inventoryCountImportId)
        .filter(r => r.isRequested === 'N' && Boolean(r.productId))
        .toArray();

      const productIds = [...new Set(items.map(i => i.productId).filter(Boolean))] as any;
      const products = await db.products.bulkGet(productIds)
      const productMap = new Map(products.filter(Boolean).map(p => [p!.productId, p!]))

      return items.map(item => ({
        ...item,
        product: productMap.get(item.productId || '')
      }))
    });

   /* API call functions moved from CountService.ts */   
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
      params: payload
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

async function discardSession(inventoryCountImportId: string): Promise<void> {
  try {
    const resp = await api({
      url: `inventory-cycle-count/cycleCounts/inventoryCountSession/${inventoryCountImportId}`,
      method: 'PUT',
      data: {
        uploadedByUserLogin: null
      }
    })
  } catch (err) {
    console.error(`useInventoryCountImport Failed to discard session ${inventoryCountImportId}`, err)
    throw err
  }
}

async function submitSession(workEffortId: string): Promise<void> {
  try {
    const resp = await api({
      url: `inventory-cycle-count/cycleCounts/workEfforts/${workEffortId}`,
      method: 'PUT',
      data: {
        statusId: 'SESSION_SUBMITTED'
      }
    })
  } catch (err) {
    console.error(`useInventoryCountImport Failed to submit WorkEffort ${workEffortId}`, err)
    throw err
  }
}

const submitProductReview = async (payload: any): Promise <any> => {
  return api({
    url: `inventory-cycle-count/cycleCounts/submit`,
    method: "post",
    data: payload
  })
}

const updateWorkEffort = async (payload: any): Promise <any> => {
  return api({
    url: `inventory-cycle-count/cycleCounts/workEfforts/${payload.workEffortId}`,
    method: "put",
    data: payload
  })
}
    
  return {
    currentImport,
    discardSession,
    submitSession,
    createSessionOnServer,
    syncStatus,
    loadSession,
    // createSession,
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
    getInventoryCountImportsByWorkEffort,
    getInventoryCountImportSession,
    bulkUploadInventoryCounts,
    fetchCycleCountImportSystemMessages,
    fetchCycleCountUploadedFileData,
    addSessionInCount,
    getWorkEfforts,
    fetchCycleCountImportErrors,
    submitProductReview,
    updateWorkEffort
  };
}