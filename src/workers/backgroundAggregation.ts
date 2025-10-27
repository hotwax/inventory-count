import Dexie from 'dexie'
import { v4 as uuidv4 } from 'uuid'
import workerApi from "@/api/workerApi";
import { expose } from 'comlink';
import { wrap } from 'comlink';
import type { Remote } from 'comlink';

export interface InventorySyncWorker {
  aggregate: (inventoryCountImportId: string, context: any) => Promise<number>;
  syncToServer: (workEffortId: string, inventoryCountImportId: string, context: any) => Promise<number>;
  matchProductLocallyAndSync: (
    workEffortId: string,
    inventoryCountImportId: string,
    item: any,
    productId: string,
    context: any
  ) => Promise<{ success: boolean; error?: any }>;
}

const worker = new Worker(new URL('./backgroundAggregation.ts', import.meta.url), { type: 'module' });

export const inventorySyncWorker = wrap<Remote<InventorySyncWorker>>(worker);

expose({
  aggregate,
  syncToServer,
  matchProductLocallyAndSync
});

// Shared Dexie Schema
const db = new Dexie('InventoryCountDB')
db.version(5).stores({
  scanEvents: '++id, inventoryCountImportId, scannedValue, quantity, createdAt, aggApplied',
  inventoryCountRecords: '[inventoryCountImportId+uuid], inventoryCountImportId, uuid, productIdentifier, productId, quantity, isRequested'
})

// ProductMaster DB (same schema as useProductMaster)
const productDB = new Dexie('ProductMasterDB')
productDB.version(1).stores({
  products: 'productId, updatedAt',
  productIdents: '[productId+identKey], identKey, value'
})

let isAggregating = false
let isSyncing = false
// const store = useStore();

// Product Lookup Helper
async function getById(productId: string, context: any) {
  const now = Date.now()
  const cached = await productDB.table('products').get(productId)
  const ttlMs = 60 * 60 * 1000
  if (cached && now - cached.updatedAt < ttlMs) {
    return cached
  }

  try {
    const resp = await workerApi({
      baseURL: context.omsUrl,
      headers: {
        'Authorization': `Bearer ${context.token}`,
        'Content-Type': 'application/json'
      },
      url: 'searchProducts',
      method: 'POST',
      data: {
        filters: [`productId: ${productId}`],
        viewSize: 1,
        fieldsToSelect: ["productId", "productName", "parentProductName", "internalName", "mainImageUrl", "goodIdentifications"]
      }
    })

    const doc = resp?.response?.docs?.[0]
    if (doc) {
      const normalized = {
        ...doc,
        updatedAt: now
      }
      await productDB.table('products').put(normalized)
      // Return the normalized version from Dexie
      return await productDB.table('products').get(productId)
    }
  } catch (err) {
    console.error(`Error fetching product ${productId} via workerApi:`, err)
  }

  return cached || undefined
}

async function findProductByIdentification(idType: string, value: string, context: any) {
  const ident = await productDB.table('productIdents').where('value').equalsIgnoreCase(value).first()
  if (ident) return ident.productId

  if (!context?.token || !context?.omsUrl) return null
  if (!idType) idType = context.barcodeIdentification

  try {
    const resp = await workerApi({
      baseURL: context.omsUrl,
      headers: {
        'Authorization': `Bearer ${context.token}`,
        'Content-Type': 'application/json'
      },
      url: 'searchProducts',
      method: 'POST',
      data: {
        filters: [`goodIdentifications:${idType}/${value}`],
        viewSize: 1,
        fieldsToSelect: ["productId", "productName", "parentProductName", "internalName", "mainImageUrl", "goodIdentifications"]
      }
    })

    const productId = resp?.response?.docs?.[0]?.productId
    if (productId) {
      await productDB.table('productIdents').put({ productId, identKey: idType, value })
      // Optionally cache full product for faster future access
      const doc = resp.response.docs[0]
      await productDB.table('products').put({ ...doc, updatedAt: Date.now() })
    }

    return productId || null
  } catch (err) {
    console.warn('Solr lookup failed for', value, err)
    return null
  }
}

// Aggregation Logic
async function aggregate(inventoryCountImportId: string, context: any) {
  if (isAggregating) return 0
  isAggregating = true
  try {
    const scans = await db.table('scanEvents')
      .where({ inventoryCountImportId })
      .and(s => s.aggApplied === 0)
      .toArray()

    if (!scans.length) {
      return 0
    }

    const grouped: Record<string, number> = {}
    for (const s of scans) {
      const key = s.scannedValue?.trim()
      if (!key) continue
      grouped[key] = (grouped[key] || 0) + (s.quantity || 1)
    }

    let processed = 0
    const now = Date.now()

    for (const [scannedValue, quantity] of Object.entries(grouped)) {
      let productId = await findProductByIdentification(context.barcodeIdentification, scannedValue, context)
      if (!productId) {
        const product = await getById(scannedValue, context)
        productId = product?.productId || null
      }

      const existing = await db.table('inventoryCountRecords')
        .where({ inventoryCountImportId })
        .and(r => (productId && r.productId === productId) || r.productIdentifier === scannedValue)
        .first()

      if (existing) {
        await db.table('inventoryCountRecords').put({
          ...existing,
          quantity: (existing.quantity || 0) + quantity,
          lastScanAt: now,
          lastUpdatedAt: now, // mark updated
          productId: productId || existing.productId,
          isRequested: existing.isRequested ?? 'Y'
        })
      } else {
        await db.table('inventoryCountRecords').add({
          inventoryCountImportId,
          uuid: uuidv4(),
          productIdentifier: scannedValue,
          productId: productId || null,
          quantity,
          isRequested: 'N',
          createdAt: now,
          lastScanAt: now,
          lastUpdatedAt: now // new record, so same as createdAt
        })
      }

      processed++
    }

    await db.table('scanEvents')
      .where('id')
      .anyOf(scans.map(s => s.id))
      .modify({ aggApplied: 1 })

    return processed
  } catch (err) {
    console.error('Aggregation failed', err)
    return 0
  } finally {
    isAggregating = false
  }
}

async function matchProductLocallyAndSync(workEffortId: string, inventoryCountImportId: string, item: any, productId: string, context: any) {
  if (!productId) throw new Error("Product ID is required");

  const now = Date.now();
  console.log(`[Worker] Matching product ${productId} for ${item?.uuid}`);

  try {
    await db.transaction('rw', db.table('inventoryCountRecords'), async () => {
      const table = db.table('inventoryCountRecords');

      const existing = await table
        .where({ inventoryCountImportId })
        .and((r: any) => r.uuid === item?.uuid)
        .first();

      if (existing) {
        // Use compound key + modify for a safe partial update
        await table
          .where('[inventoryCountImportId+uuid]')
          .equals([inventoryCountImportId, existing.uuid])
          .modify({
            productId,
            lastUpdatedAt: now,
          });
      } else {
        await table.add({
          inventoryCountImportId,
          uuid: item?.uuid || uuidv4(),
          productId,
          productIdentifier: item?.productIdentifier || '',
          locationSeqId: item?.locationSeqId ?? null,
          quantity: Number(item?.quantity || 0),
          status: 'active',
          facilityId: item?.facilityId || '',
          createdAt: now,
          lastScanAt: now,
          lastUpdatedAt: now,
          lastSyncedAt: null,
          lastSyncedBatchId: null,
          aggApplied: 1,
          isRequested: 'N'
        });
      }
    });

    console.log(`[Worker] Triggering syncToServer for ${inventoryCountImportId}`);
    await syncToServer(workEffortId, inventoryCountImportId, context);

    return { success: true };
  } catch (err) {
    console.error('[Worker] Error in matchProductLocallyAndSync', err);
    return { success: false, error: err };
  }
}

async function syncToServer(workEffortId: string, inventoryCountImportId: string, context: any) {
  if (isSyncing) return 0
  isSyncing = true
  try {
    const baseUrl = context.maargUrl
    const token = context.token

    const pending = await db.table('inventoryCountRecords')
      .where({ inventoryCountImportId })
      .and(i =>
        !i.lastSyncedAt ||  // never synced
        (i.lastUpdatedAt && i.lastSyncedAt && i.lastUpdatedAt > i.lastSyncedAt) // modified after last sync
      )
      .toArray()

    if (!pending.length) return 0

    const items = pending.map(i => ({
      uuid: i.uuid,
      productId: i.productId,
      productIdentifier: i.productIdentifier,
      quantity: Number(i.quantity || 0),
      lastScanAt: i.lastScanAt,
      lastUpdatedAt: i.lastUpdatedAt || Date.now(),
      isRequested: i.isRequested,
      createdDate: i.createdAt || Date.now(),
      countedByUserLoginId: context.userLoginId
    }))

    const payload = { items }

    const resp = await workerApi({
      baseURL: baseUrl,
      headers: {
        'Authorization': `Bearer ${token}`
      },
      url: `inventory-cycle-count/cycleCounts/inventoryCountSession/${inventoryCountImportId}/items`,
      method: 'PUT',
      data: payload
    })

    if (resp) {
      const now = Date.now()
      await db.transaction('rw', db.table('inventoryCountRecords'), async () => {
        for (const item of pending) {
          await db.table('inventoryCountRecords')
            .where('[inventoryCountImportId+uuid]')
            .equals([inventoryCountImportId, item.uuid])
            .modify({
              lastSyncedAt: now,
              lastSyncedBatchId: `batch-${now}`
            })
        }
      })
      return pending.length
    }

    return 0
  } catch (err) {
    console.error('sync error', err)
    return 0
  } finally {
    isSyncing = false
  }
}

// Worker Listener
self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data

  if (type === 'aggregate') {
    const { workEffortId, inventoryCountImportId, context } = payload
    const count = await aggregate(inventoryCountImportId, context)

    console.log(`Aggregated ${count} items for importId ${inventoryCountImportId}`)
    if (count > 0) {
      console.log(`Aggregated ${count} items for importId ${inventoryCountImportId}, initiating sync`)
      await syncToServer(workEffortId, inventoryCountImportId, context)
    }

    self.postMessage({ type: 'aggregationComplete', count })
  }

  if (type === 'schedule') {
    const { workEffortId, inventoryCountImportId, context, intervalMs = 2000 } = payload
    setInterval(async () => {
      const count = await aggregate(inventoryCountImportId, context)
      if (count > 0) {
        await syncToServer(workEffortId, inventoryCountImportId, context)
      }
      self.postMessage({ type: 'aggregationComplete', count })
    }, intervalMs)
  }
}