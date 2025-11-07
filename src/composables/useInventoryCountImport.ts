import { liveQuery } from 'dexie';
import { useProductMaster } from './useProductMaster';
import { hasError } from '@hotwax/oms-api';
import api from '@/services/RemoteAPI';
import { v4 as uuidv4 } from 'uuid';
import { db, ScanEvent } from '@/database/commonDatabase'

interface RecordScanParams {
  inventoryCountImportId: string;
  productIdentifier: string;
  quantity: number;
  locationSeqId?: string | null;
}

/**
 * Utility Functions
 */
function currentMillis(): number {
  return Date.now();
}
/* Stateless functions */
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
  async function loadInventoryItemsFromBackend(inventoryCountImportId: string): Promise<void> {
    try {
      const resp = await api({
        url: `inventory-cycle-count/cycleCounts/sessions/${inventoryCountImportId}/items`,
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

  async function searchInventoryItemsByIdentifier(inventoryCountImportId: string, keyword: string, segment: string) {
  if (!keyword?.trim()) return []

  const value = keyword.trim().toLowerCase()

  let tableQuery = db.table('inventoryCountRecords')
    .where({ inventoryCountImportId })

  if (segment === 'counted') {
    tableQuery = tableQuery.and(r => r.quantity > 0)
  } else if (segment === 'uncounted') {
    tableQuery = tableQuery.and(r => r.quantity === 0)
  } else if (segment === 'undirected') {
    tableQuery = tableQuery.and(r => r.isRequested === 'N')
  } else if (segment === 'unmatched') {
    tableQuery = tableQuery.and(r => !r.productId)
  }

  const results = await tableQuery
    .filter(r => (r.productIdentifier || '').toLowerCase().includes(value))
    .toArray()

  // enrich with product info if cached
  for (const r of results) {
    if (r.productId) {
      const p = await db.table('products').get(r.productId)
      if (p) r.product = p
    }
  }
  return results
}

  async function getInventoryCountImportItems(inventoryCountImportId: string) {
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

  async function getSessionProductIds(inventoryCountImportId: string): Promise<string[]> {
    try {
      // Reuse the same Dexie DB as in useInventoryCountImport
      const records = await db.table('inventoryCountRecords')
        .where('inventoryCountImportId')
        .equals(inventoryCountImportId)
        .toArray();

      const ids = records
        .map((r: any) => r.productId)
        .filter((id: string | null) => !!id && id !== '')
        .filter((value: string, index: number, self: string[]) => self.indexOf(value) === index);

      return ids;
    } catch (err) {
      console.error('Error fetching productIds from IndexedDB:', err);
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
    const productMap = new Map(products.filter(Boolean).map((p: any) => [p.productId, p]))

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
    const productMap = new Map(products.filter(Boolean).map((p: any) => [p.productId, p]))
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
    const productMap = new Map(products.filter(Boolean).map((p: any) => [p.productId, p]))

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
      const productMap = new Map(products.filter(Boolean).map((p: any) => [p.productId, p]))

      return items.map(item => ({
        ...item,
        product: productMap.get(item.productId || '')
      }))
    });

  const getScanEvents = (inventoryCountImportId: string) =>
  liveQuery(async () => {
    const events = await db.scanEvents
      .where('inventoryCountImportId')
      .equals(inventoryCountImportId)
      .reverse()
      .sortBy('createdAt');

    const enriched = await Promise.all(
      events.map(async e => {
        if (e.productId) {
          const product = await db.products.get(e.productId);
          return { ...e, product };
        }
        return e;
      })
    );

    return enriched || [];
  });

   /* API call functions moved from CountService.ts */   
const getInventoryCountImportSession = async (params: { inventoryCountImportId: string; }): Promise<any> => {
  return await api({
    url: `inventory-cycle-count/cycleCounts/sessions/${params.inventoryCountImportId}`,
    method: 'get',
    params
  });
}
async function discardSession(inventoryCountImportId: string): Promise<void> {
  try {
    await api({
      url: `inventory-cycle-count/cycleCounts/sessions/${inventoryCountImportId}`,
      method: 'PUT',
      data: {
        statusId: 'SESSION_VOIDED'
      }
    })
  } catch (err) {
    console.error(`useInventoryCountImport Failed to discard session ${inventoryCountImportId}`, err)
    throw err
  }
}

async function submitSession(inventoryCountImportId: string): Promise<void> {
  try {
    await api({
      url: `inventory-cycle-count/cycleCounts/sessions/${inventoryCountImportId}`,
      method: 'PUT',
      data: {
        statusId: 'SESSION_SUBMITTED'
      }
    })
  } catch (err) {
    console.error(`useInventoryCountImport Failed to submit InventoryCountImport ${inventoryCountImportId}`, err)
    throw err
  }
}

const updateSession = async (payload: any): Promise <any> => {
  return api({
    url: `inventory-cycle-count/cycleCounts/sessions/${payload.inventoryCountImportId}`,
    method: "put",
    data: payload
  })
}

const bulkUploadInventoryCounts = async (payload: any): Promise <any> => {
  return api({
    url: `inventory-cycle-count/cycleCounts/upload`,
    method: "post",
    ...payload
  });
}

const cloneSession = async (payload: any): Promise <any> => {
  return api({
    url: `inventory-cycle-count/cycleCounts/sessions/${payload.inventoryCountImportId}/cloneDirectedCount`,
    method: "post",
    data: payload
  })
}

const getSessionItemsByImportId = async (inventoryCountImportId: string): Promise<any> => {
  return await api({
    url: `inventory-cycle-count/cycleCounts/sessions/${inventoryCountImportId}/items`,
    method: 'GET',
    params: {pageSize:500}
  });
}

const getSessionLock = async (payload: any): Promise<any> => {
  return await api({
    url: `oms/dataDocumentView`,
    method: 'POST',
    data: {
      dataDocumentId: 'InventoryCountImportLock',
      customParametersMap: {
        ...payload,
        pageIndex: 0,
        pageSize: 100,
      }
    }
  });
}

const lockSession = async (payload: any): Promise<any> => {
  return await api({
    url: `inventory-cycle-count/cycleCounts/sessions/${payload.inventoryCountImportId}/lock`,
    method: 'POST',
    data: payload
  });
}

const releaseSession = async (payload: any): Promise<any> => {
  return await api({
    url: `inventory-cycle-count/cycleCounts/sessions/${payload.inventoryCountImportId}/release`,
    method: 'PUT',
    data: payload
  });
}

/**
 * Composable to manage InventoryCountImport related operations using singleton pattern
 */
export function useInventoryCountImport() {
    
  return {
    bulkUploadInventoryCounts,
    cloneSession,
    discardSession,
    getCountedItems,
    getInventoryCountImportItems,
    getInventoryCountImportSession,
    getScanEvents,
    getSessionItemsByImportId,
    getSessionProductIds,
    getSessionLock,
    getUncountedItems,
    getUndirectedItems,
    getUnmatchedItems,
    loadInventoryItemsFromBackend,
    lockSession,
    recordScan,
    releaseSession,
    searchInventoryItemsByIdentifier,
    submitSession,
    updateSession
  };
}