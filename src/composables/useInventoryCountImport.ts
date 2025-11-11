import { liveQuery } from 'dexie';
import { useProductMaster } from './useProductMaster';
import { hasError } from '@/stores/useAuthStore';
import api from '@/services/RemoteAPI';
import { v4 as uuidv4 } from 'uuid';
import { db, ScanEvent } from '@/services/commonDatabase'
import { useProductStoreSettings } from './useProductStoreSettings';

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
  const pageSize = 500
  let pageIndex = 0
  let totalFetched = 0
  let hasMore = true

  try {
    while (hasMore) {
      const resp = await api({
        url: `inventory-cycle-count/cycleCounts/sessions/${inventoryCountImportId}/items`,
        method: 'GET',
        params: { pageSize, pageIndex }
      })

      if (hasError(resp) || !resp?.data?.length) {
        hasMore = false
        break
      }

      const items = resp.data
      totalFetched += items.length

      // --- Store items batch-wise directly into IndexedDB ---
      await db.transaction('rw', db.inventoryCountRecords, async () => {
        for (const item of items) {
          await db.inventoryCountRecords.put({
            inventoryCountImportId: item.inventoryCountImportId,
            productId: item.productId || null,
            uuid: item.uuid || uuidv4(),
            isRequested: item.isRequested || 'Y',
            productIdentifier: item.productIdentifier || '',
            locationSeqId: item.locationSeqId || null,
            quantity: item.quantity || 0,
            status: 'active',
            facilityId: '',
            createdAt: item.createdDate || currentMillis(),
            lastScanAt: item.lastUpdatedStamp || currentMillis(),
            lastUpdatedAt: item.lastUpdatedStamp || currentMillis(),
            lastSyncedAt: null,
            lastSyncedBatchId: null,
            aggApplied: 0
          })
        }
      })

      // --- Handle product caching batch-wise ---
      const productIds = [...new Set(items.map((i: any) => i.productId).filter(Boolean))] as any
      if (productIds.length) {
        try {
          const existingProducts = await db.products.bulkGet(productIds)
          const existingIds = new Set(existingProducts.filter(Boolean).map((product: any) => product.productId))
          const missingIds = productIds.filter((id: string) => !existingIds.has(id))

          if (missingIds.length) {
            const { getByIds, upsertFromApi } = useProductMaster() as any
            const newProducts = await getByIds(missingIds)
            if (newProducts?.length) await upsertFromApi(newProducts)
          }
        } catch (err) {
          console.warn("[loadInventoryItemsFromBackend] Failed to fetch missing products:", err)
        }
      }

      // --- Stop when fewer than pageSize returned ---
      if (items.length < pageSize) hasMore = false
      else pageIndex++
    }

  } catch (err) {
    console.error('[loadInventoryItemsFromBackend] Error:', err)
  }
}

  async function searchInventoryItemsByIdentifier(inventoryCountImportId: string, keyword: string, segment: string) {
    if (!keyword?.trim()) return []

    const value = keyword.trim().toLowerCase()

    let tableQuery = db.table('inventoryCountRecords').where({ inventoryCountImportId })

    if (segment === 'counted') {
      tableQuery = tableQuery.and(item => item.quantity > 0)
    } else if (segment === 'uncounted') {
      tableQuery = tableQuery.and(item => item.quantity === 0)
    } else if (segment === 'undirected') {
      tableQuery = tableQuery.and(item => item.isRequested === 'N')
    } else if (segment === 'unmatched') {
      tableQuery = tableQuery.and(item => !item.productId)
    }

    let resultSet = await tableQuery
      .filter(item => (item.productIdentifier || '').toLowerCase().includes(value))
      .toArray()

    if (!resultSet.length) {
      const productId = useProductMaster().findProductByIdentification(useProductStoreSettings().getPrimaryId(), value, {})
      if (productId) {
        resultSet = await tableQuery
          .filter(item => item.productId === productId)
          .toArray()
      }
    }
    // enrich with product info if cached
    for (const item of resultSet) {
      if (item.productId) {
        const product = await db.table('products').get(item.productId)
        if (product) item.product = product
      }
    }
    return resultSet
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
        .map((item: any) => item.productId)
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
        .filter(item => !item.productId)
        .toArray()

      const productIds = [...new Set(items.map(i => i.productId).filter(Boolean))] as any;
      const products = await db.products.bulkGet(productIds)
      const productMap = new Map(products.filter(Boolean).map((product: any) => [product.productId, product]))

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
        .filter(item => ((Number(item.quantity) || 0) > 0 && item.isRequested === 'Y' && Boolean(item.productId)))
        .toArray()

      const productIds = [...new Set(items.map(i => i.productId).filter(Boolean))] as any;
      const products = await db.products.bulkGet(productIds)
      const productMap = new Map(products.filter(Boolean).map((product: any) => [product.productId, product]))
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
        .filter(item => (Number(item.quantity) || 0) === 0)
        .toArray()

      const productIds = [...new Set(items.map(i => i.productId).filter(Boolean))] as any;
      const products = await db.products.bulkGet(productIds)
      const productMap = new Map(products.filter(Boolean).map((product: any) => [product.productId, product]))

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
        .filter(item => item.isRequested === 'N' && Boolean(item.productId))
        .toArray();

      const productIds = [...new Set(items.map(i => i.productId).filter(Boolean))] as any;
      const products = await db.products.bulkGet(productIds)
      const productMap = new Map(products.filter(Boolean).map((product: any) => [product.productId, product]))

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
      filterByDate: true,
      pageIndex: 0,
      pageSize: 100,
      customParametersMap: {
        ...payload
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