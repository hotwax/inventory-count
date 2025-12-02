import { liveQuery } from 'dexie';
import { useProductMaster } from './useProductMaster';
import api from '@/services/RemoteAPI';
import { v4 as uuidv4 } from 'uuid';
import { db, ScanEvent } from '@/services/commonDatabase'
import { useProductStore } from '@/stores/productStore';

interface RecordScanParams {
  inventoryCountImportId: string;
  productId?: string;
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
      productId: params.productId || null,
      locationSeqId: params.locationSeqId || null,
      scannedValue: params.productIdentifier,
      quantity: params.quantity,
      createdAt: currentMillis(),
      aggApplied: 0
    };
    await db.scanEvents.add(event);
  }

  async function storeInventoryCountItems(items: any[]) {
    if (!items?.length) return;

    await useProductMaster().upsertInventoryFromSessionItems(items);
    try {
      // Normalize or enrich data before storing if needed
      const facilityId = useProductStore().getCurrentFacility.facilityId || '';
      const normalized = items.map((item: any) => ({
        inventoryCountImportId: item.inventoryCountImportId,
        productId: item.productId || null,
        uuid: item.uuid || uuidv4(),
        isRequested: item.isRequested || 'Y',
        productIdentifier: item.productIdentifier || '',
        locationSeqId: item.locationSeqId || null,
        quantity: item.quantity || 0,
        status: 'active',
        facilityId,
        createdAt: item.createdDate || currentMillis(),
        lastScanAt: item.lastUpdatedStamp || currentMillis(),
        lastUpdatedAt: item.lastUpdatedStamp || currentMillis(),
        lastSyncedAt: item.lastUpdatedStamp || currentMillis(), //Important: to ignore the items during first aggregation
        lastSyncedBatchId: null,
        aggApplied: 0
      }));

      // Dexie table name for inventory count items
      const table = db.table('inventoryCountRecords');

      // Insert or update efficiently
      await table.bulkPut(normalized);

    } catch (err) {
      console.error('[IndexedDB] Failed to store batch', err);
    }
  }

  async function searchInventoryItemsByIdentifier(inventoryCountImportId: string, keyword: string, segment: string) {
    if (!keyword?.trim()) return []

    const value = keyword.trim().toLowerCase()

    let tableQuery = db.table('inventoryCountRecords').where('inventoryCountImportId').equals(inventoryCountImportId)
    let searchByProductIdQuery = db.table('inventoryCountRecords').where('inventoryCountImportId').equals(inventoryCountImportId)

    if (segment === 'counted') {
      tableQuery = tableQuery.and(item => item.quantity > 0)
      searchByProductIdQuery = searchByProductIdQuery.and(item => item.quantity > 0)
    } else if (segment === 'uncounted') {
      tableQuery = tableQuery.and(item => item.quantity === 0)
      searchByProductIdQuery = searchByProductIdQuery.and(item => item.quantity === 0)
    } else if (segment === 'undirected') {
      tableQuery = tableQuery.and(item => item.isRequested === 'N')
      searchByProductIdQuery = searchByProductIdQuery.and(item => item.isRequested === 'N')
    } else if (segment === 'unmatched') {
      tableQuery = tableQuery.and(item => !item.productId)
      searchByProductIdQuery = searchByProductIdQuery.and(item => !item.productId)
    }

    let resultSet = [];
    if (segment !== 'uncounted') {
      resultSet = await tableQuery
      .and(item => (item.productIdentifier || '').toLowerCase().includes(value))
      .toArray()
    }

    if (!resultSet.length) {
      const productIds = await useProductMaster().searchProducts(value)
      if (productIds) {
        resultSet = await searchByProductIdQuery
          .and(item => (productIds.includes(item.productId)))
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

    const productIds = [...new Set(resultSet.map(item => item.productId).filter(Boolean))] as string[]
    if (productIds.length) {
      const inventoryRecords = await db.productInventory
        .where('productId')
        .anyOf(productIds)
        .toArray()

      const inventoryMap = new Map(
        inventoryRecords.map((item: any) => [`${item.productId}::${item.facilityId}`, item])
      )

      resultSet = resultSet.map(item => ({
        ...item,
        inventory: item.productId ? inventoryMap.get(`${item.productId}::${item.facilityId}`) : undefined
      }))
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

  async function getInventoryCountImportItemsCount(inventoryCountImportId: string): Promise<number> {
    try {
      const count = await db.inventoryCountRecords
        .where('inventoryCountImportId')
        .equals(inventoryCountImportId)
        .count();

      return count;
    } catch (err) {
      console.error('Error counting inventory records from IndexedDB:', err);
      return 0;
    }
  }

  async function getInventoryCountImportByProductId(inventoryCountImportId: string, productId: string) {
  if (!inventoryCountImportId || !productId) return '';
  try {
    const record = await db.inventoryCountRecords
      .where('inventoryCountImportId')
      .equals(inventoryCountImportId)
      .and(item => item.productId === productId)
      .first();

    return record || null;
  } catch (err) {
    console.error('Failed to check direction status', err);
    return null;
  }
}

  async function getSessionProductIds(inventoryCountImportId: string): Promise<string[]> {
    try {
      const items = await db.inventoryCountRecords
        .where('inventoryCountImportId')
        .equals(inventoryCountImportId)
        .toArray();

      if (!items.length) return [];

      const counted = [];
      const uncounted = [];

      for (const item of items) {
        if (!item.productId) continue;
        if (item.quantity >= 0) counted.push(item.productId);
        else uncounted.push(item.productId);
      }

      // --- Deduplicate while preserving category order ---
      const distinctProducts = new Set<string>();

      const ordered = [
        ...counted.filter(id => !distinctProducts.has(id) && distinctProducts.add(id)),
        ...uncounted.filter(id => !distinctProducts.has(id) && distinctProducts.add(id)),
      ];

      return ordered;
    } catch (err) {
      console.error("Error fetching ordered productIds:", err);
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

      const productIds = [...new Set(items.map(item => item.productId).filter(Boolean))] as any;
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

      items.sort((predecessor, successor) => {
        const predecessorTime = predecessor.lastUpdatedAt ? Number(predecessor.lastUpdatedAt) : 0;
        const successorTime = successor.lastUpdatedAt ? Number(successor.lastUpdatedAt) : 0;
        return successorTime - predecessorTime;
      });

      const productIds = [...new Set(items.map(item => item.productId).filter(Boolean))] as any;
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

      const productIds = [...new Set(items.map(item => item.productId).filter(Boolean))] as any;
      const products = await db.products.bulkGet(productIds)
      const productMap = new Map(products.filter(Boolean).map((product: any) => [product.productId, product]))


      const inventoryRecords = await db.productInventory
      .where('productId')
      .anyOf(productIds)
      .toArray()

      const inventoryMap = new Map(
        inventoryRecords.map((item: any) => [`${item.productId}::${item.facilityId}`, item])
      )
      return items.map(item => ({
        ...item,
        product: productMap.get(item.productId || ''),
        inventory: inventoryMap.get(`${item.productId}::${item.facilityId}`)
      }))
    });

  const getUndirectedItems = (inventoryCountImportId: string) =>
    liveQuery(async () => {
      const items = await db.table('inventoryCountRecords')
        .where('inventoryCountImportId')
        .equals(inventoryCountImportId)
        .filter(item => item.isRequested === 'N' && Boolean(item.productId))
        .toArray();

      const productIds = [...new Set(items.map(item => item.productId).filter(Boolean))] as any;
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
        events.map(async event => {
          if (event.productId) {
            const product = await db.products.get(event.productId);
            return { ...event, product };
          }
          return event;
        })
      );

      return enriched || [];
    });

  const getTotalCountedUnits = (inventoryCountImportId: string) =>
  liveQuery(async () => {
    const items = await db.inventoryCountRecords
      .where('inventoryCountImportId')
      .equals(inventoryCountImportId)
      .toArray()

    return items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
  })

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

const getSessionItemsByImportId = async (params: any): Promise<any> => {
  return await api({
    url: `inventory-cycle-count/cycleCounts/sessions/${params.inventoryCountImportId}/items`,
    method: 'GET',
    params
  });
}

const updateSessionItem = async (params: any): Promise<any> => {
  return await api({
    url: `inventory-cycle-count/cycleCounts/sessions/${params.inventoryCountImportId}/items`,
    method: 'PUT',
    data: params
  });
}

const deleteSessionItem = async (params: any): Promise<any> => {
  return await api({
    url: `inventory-cycle-count/cycleCounts/sessions/${params.inventoryCountImportId}/items`,
    method: 'DELETE',
    data: params.data
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

  async function getInventoryCountImportItemCount(inventoryCountImportId: string) {
    return api({
      url: `inventory-cycle-count/cycleCounts/sessions/${inventoryCountImportId}/items/count`,
      method: 'GET'
    })
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
    getInventoryCountImportByProductId,
    getInventoryCountImportItemCount,
    getInventoryCountImportItems,
    getInventoryCountImportItemsCount,
    getInventoryCountImportSession,
    getScanEvents,
    getSessionItemsByImportId,
    getSessionProductIds,
    getSessionLock,
    getTotalCountedUnits,
    getUncountedItems,
    getUndirectedItems,
    getUnmatchedItems,
    lockSession,
    recordScan,
    releaseSession,
    searchInventoryItemsByIdentifier,
    storeInventoryCountItems,
    submitSession,
    updateSession,
    updateSessionItem,
    deleteSessionItem
  };
}
