import { v4 as uuidv4 } from 'uuid'
import workerApi from "@/services/workerApi";
import { expose } from 'comlink';
import { createCommonDB } from "@/services/commonDatabase";

// DB instance for worker (created once)
let db: any = null;
let dbInitialized = false;

export interface InventorySyncWorker {
  aggregate: (inventoryCountImportId: string, context: any) => Promise<number>;
  syncToServer: (inventoryCountImportId: string, context: any) => Promise<number>;
  resolveUnmatched: (inventoryCountImportId: string, context: any) => Promise<number>;
  matchProductLocallyAndSync: (
    inventoryCountImportId: string,
    item: any,
    productId: string,
    context: any
  ) => Promise<{ success: boolean; error?: any }>;
  aggregateVarianceLogs: (context: any) => Promise<number>;
}

expose({
  aggregate,
  syncToServer,
  matchProductLocallyAndSync,
  aggregateVarianceLogs
});

let isAggregating = false
let isSyncing = false

// Product Lookup Helper

const buildProductQuery = (params: any): Record<string, any> => {
  const viewSize = params.viewSize || process.env.VUE_APP_VIEW_SIZE || 100
  const viewIndex = params.viewIndex || 0

  const payload: any = {
    json: {
      params: {
        rows: viewSize,
        'q.op': 'AND',
        start: viewIndex * viewSize,
      },
      query: '(*:*)',
      filter: [`docType:${params.docType || 'PRODUCT'}`],
    },
  }

  if (params.keyword) {
    payload.json.query = `*${params.keyword}* OR "${params.keyword}"^100`
    payload.json.params['qf'] =
      params.queryFields ||
      'sku^100 upc^100 productName^50 internalName^40 productId groupId groupName'
    payload.json.params['defType'] = 'edismax'
  }

  if (params.filter) {
    const filters = params.filter.split(',').map((filter: any) => filter.trim())
    filters.forEach((filter: any) => payload.json.filter.push(filter))
  }

  if (params.facet) {
    payload.json.facet = params.facet
  }
  return payload
}


async function getById(productId: string, context: any) {
  const now = Date.now()
  const cached = await db.table('products').get(productId)
  const ttlMs = 60 * 60 * 1000
  if (cached && now - cached.updatedAt < ttlMs) {
    return cached
  }

  try {
    const query = buildProductQuery({
        filter: `productId: ${productId}`,
        viewSize: 1,
        fieldsToSelect: `productId,productName,parentProductName,internalName,mainImageUrl,goodIdentifications`
      });
    const resp = await workerApi({
      baseURL: context.maargUrl,
      headers: {
        'Authorization': `Bearer ${context.token}`,
        'Content-Type': 'application/json'
      },
      url: 'inventory-cycle-count/runSolrQuery',
      method: 'POST',
      data: query
    })

    const doc = resp?.response?.docs?.[0]
    if (doc) {
      const normalized = {
        ...doc,
        updatedAt: now
      }
      await db.table('products').put(normalized)
      // Return the normalized version from Dexie
      return await db.table('products').get(productId)
    }
  } catch (err) {
    console.error(`Error fetching product ${productId} via workerApi:`, err)
  }

  return cached || undefined
}

async function findProductByIdentification(idType: string, value: string, context: any) {
  const ident = await db.table('productIdentification').where('value').equalsIgnoreCase(value).and((item: any) => item.identKey === context.barcodeIdentification).first()
  if (ident) return ident.productId

  if (!context?.token || !context?.maargUrl) return null
  if (!idType) idType = context.barcodeIdentification

  try {
    const query = buildProductQuery({
        filter: `goodIdentifications:${idType}/${value},isVirtual:false,productTypeId:FINISHED_GOOD,-prodCatalogCategoryTypeIds:PCCT_DISCONTINUED`,
        viewSize: 1,
        fieldsToSelect: `productId,productName,parentProductName,internalName,mainImageUrl,goodIdentifications`
      });
    const resp = await workerApi({
      baseURL: context.maargUrl,
      headers: {
        'Authorization': `Bearer ${context.token}`,
        'Content-Type': 'application/json'
      },
      url: 'inventory-cycle-count/runSolrQuery',
      method: 'POST',
      data: query
    })

    const productId = resp?.response?.docs?.[0]?.productId
    if (productId) {
      await db.table('productIdentification').put({ productId, identKey: idType, value })
      // Optionally cache full product for faster future access
      const doc = resp.response.docs[0]
      await db.table('products').put({ ...doc, updatedAt: Date.now() })
    }

    return productId || null
  } catch (err) {
    console.warn('Solr lookup failed for', value, err)
    return null
  }
}

function ensureProductStored(productId: string | null, context: any) {
  if (!productId) return;

  (async () => {
    try {
      const existing = await db.table('products').get(productId);
      if (existing) return;
      const query = buildProductQuery({
        filter: `productId: ${productId}`,
        viewSize: 1,
        fieldsToSelect: `productId,productName,parentProductName,internalName,mainImageUrl,goodIdentifications`
      });
      const resp = await workerApi({
        baseURL: context.maargUrl,
        headers: {
          'Authorization': `Bearer ${context.token}`,
          'Content-Type': 'application/json'
        },
        url: 'inventory-cycle-count/runSolrQuery',
        method: 'POST',
        data: query
      });

      const doc = resp?.response?.docs?.[0];
      if (doc) {
        await db.table('products').put({ ...doc, updatedAt: Date.now() });
      }
    } catch (err) {
      console.warn(`[Worker] Failed to cache product ${productId}:`, err);
    }
  })();
}
async function resolveMissingProducts(inventoryCountImportId: string, context: any) {
  // get all records in this session where productId is null / empty
  const unresolved = await db.table('inventoryCountRecords')
    .where({ inventoryCountImportId })
    .and((item: any) => !item.productId) // null, undefined, empty
    .toArray()

  if (!unresolved.length) return 0

  const now = Date.now()

  // we’ll do them one by one — these are usually few
  for (const rec of unresolved) {
    const identifier = rec.productIdentifier
    if (!identifier) continue
    let productId: any = null
    productId = await findProductByIdentification(context.barcodeIdentification, identifier, context)
    if (!productId) {
      const product = await getById(identifier, context)
      productId = product?.productId || null
    }

    if (!productId) {
      continue
    }
 
    const item = await db.table('inventoryCountRecords')
      .where('inventoryCountImportId').equals(inventoryCountImportId)
      .and((item: any) => item.productId == productId)
      .toArray();

    await db.table('inventoryCountRecords')
      .where('[inventoryCountImportId+uuid]')
      .equals([inventoryCountImportId, rec.uuid])
      .modify({
        productId,
        isRequested: context.inventoryCountTypeId === 'DIRECTED_COUNT' ? item.length > 0 ? item[0].isRequested : 'N' : 'Y',
        lastUpdatedAt: now
      })

    await db.table('scanEvents')
      .where({ inventoryCountImportId })
      .and((scanEvent: any) => scanEvent.scannedValue === identifier)
      .modify({
        productId,
        lastUpdatedAt: now
      });
  }
  return;
}

const getProductStock = async (productId: string, context: any): Promise<any> => {
  return await workerApi({
    baseURL: context.maargUrl,
    headers: {
      'Authorization': `Bearer ${context.token}`,
      'Content-Type': 'application/json'
    },
    url: 'poorti/getInventoryAvailableByFacility',
    method: 'GET',
    params: { productId: productId, facilityId: context.facilityId }
  })
}

async function aggregateVarianceLogs(context: any) {
  if (isAggregating) return 0
  isAggregating = true
  try {
    const varianceLogs = await db.table('varianceLogs')
      .where({ aggApplied: 0 })
      .toArray()

    if (!varianceLogs.length) {
      return 0
    }

    const grouped: Record<string, number> = {}
    for (const scan of varianceLogs) {
      const key = scan.inventoryItemId || scan.scannedValue?.trim()
      if (!key) continue
      grouped[key] = (grouped[key] || 0) + scan.quantity
    }
    let processed = 0
    const now = Date.now()
    for (const [key, quantity] of Object.entries(grouped)) {
      let productId = await findProductByIdentification(context.barcodeIdentification, key, context)
      if (!productId) {
        const product = await getById(key, context)
        productId = product?.productId || null
      }
      
      let stock = null;
      if (productId) {
        stock = await getProductStock(productId, context)
      }

      // Upsert by productId and facilityId in the inventoryAdjustments table here
      const inventoryAdjustment = await db.table('inventoryAdjustments')
        .where({ facilityId: context.facilityId })
        .and((item: any) => (productId && item.productId === productId) || item.scannedValue === key)
        .first()

      if (inventoryAdjustment) {
        await db.table('inventoryAdjustments').put({
          ...inventoryAdjustment,
          quantity: inventoryAdjustment.quantity + quantity,
          atp: stock?.atp || null,
          qoh: stock?.qoh || null,
          lastUpdatedAt: now
        })
      } else {
        await db.table('inventoryAdjustments').add({
          uuid: uuidv4(),
          scannedValue: key,
          productId,
          facilityId: context.facilityId,
          quantity,
          atp: stock?.atp || null,
          qoh: stock?.qoh || null,
          lastUpdatedAt: now
        })
      }
      processed++
    }
    await db.table('varianceLogs')
      .where('id')
      .anyOf(varianceLogs.map((scanEvent: any) => scanEvent.id))
      .modify({ aggApplied: 1 })

    return processed;
  } catch (error) {
    console.error('Error aggregating variance logs:', error)
    return 0;
  } finally {
    isAggregating = false
  }
}

// Aggregation Logic
async function aggregate(inventoryCountImportId: string, context: any) {
  if (isAggregating) return 0
  isAggregating = true
  try {
    const scans = await db.table('scanEvents')
      .where({ inventoryCountImportId })
      .and((scanEvent: any) => scanEvent.aggApplied === 0)
      .toArray()

    if (!scans.length) {
      return 0
    }

    const grouped: Record<string, number> = {}
    for (const scan of scans) {
      const key = scan.productId || scan.scannedValue?.trim()
      if (!key) continue
      grouped[key] = (grouped[key] || 0) + (scan.quantity || 1)
    }

    let processed = 0
    const now = Date.now()

    for (const [scannedValue, quantity] of Object.entries(grouped)) {
      let productId: any = null
      const identification = await db.table('productIdentification').where('value').equalsIgnoreCase(scannedValue).and((item: any) => item.identKey === context.barcodeIdentification).first()
      if (identification) {
        productId = identification.productId
      } else {
        const product = await db.table('products').get(scannedValue)
        if (product) {
          productId = product.productId
        }
      }
      // let productId = await findProductByIdentification(context.barcodeIdentification, scannedValue, context)
      // if (!productId) {
      //   const product = await getById(scannedValue, context)
      //   productId = product?.productId || null
      // }

      const existing = await db.table('inventoryCountRecords')
        .where('inventoryCountImportId')
        .equals(inventoryCountImportId)
        .and((item: any) => (productId && item.productId === productId) || item.productIdentifier === scannedValue)
        .first()

      // if (productId) ensureProductStored(productId, context);

      if (existing) {
        await db.table('inventoryCountRecords').put({
          ...existing,
          quantity: (existing.quantity || 0) + quantity,
        // TODO: Check if needed; if not set undirected and unmatched products could be identified: productIdentifier: scannedValue,
          lastScanAt: now,
          lastUpdatedAt: now, // mark updated
          productId: existing.productId || productId,
          facilityId: context.facilityId,
          isRequested: existing.isRequested ?? 'Y'
        })
      } else {
        await db.table('inventoryCountRecords').add({
          inventoryCountImportId,
          uuid: uuidv4(),
          productIdentifier: scannedValue,
          productId: productId || null,
          quantity,
          facilityId: context.facilityId,
          isRequested: (context.inventoryCountTypeId === 'HARD_COUNT') ? 'Y' : 'N',
          createdAt: now,
          lastScanAt: now,
          lastUpdatedAt: now // new record, so same as createdAt
        })
      }
      if (productId) {
        await db.table('scanEvents')
          .where({ inventoryCountImportId })
          .and((scanEvent: any) => scanEvent.scannedValue === scannedValue)
          .modify({
            productId,
            lastUpdatedAt: now
          });
      }
      processed++
    }

    await db.table('scanEvents')
      .where('id')
      .anyOf(scans.map((scanEvent: any) => scanEvent.id))
      .modify({ aggApplied: 1 })

    return processed
  } catch (err) {
    console.error('Aggregation failed', err)
    return 0
  } finally {
    isAggregating = false
  }
}

async function matchProductLocallyAndSync(inventoryCountImportId: string, item: any, productId: string, context: any) {
  if (!productId) throw new Error("Product ID is required");

  const now = Date.now();
  ensureDB(context);

  try {
    ensureProductStored(productId, context);
    const inventory = await workerApi({
        baseURL: context.maargUrl,
        headers: {
          'Authorization': `Bearer ${context.token}`,
          'Content-Type': 'application/json'
        },
        url: 'oms/dataDocumentView',
        method: 'POST',
        data: {
        dataDocumentId: 'ProductFacilityAndInventoryItem',
        pageSize: 1,
        customParametersMap: { productId: productId, facilityId: context.facilityId }
      }
      })

    await db.transaction('rw', db.table('inventoryCountRecords'), async () => {
      const table = db.table('inventoryCountRecords');

      const existing = await table
        .where({ inventoryCountImportId })
        .and((itm: any) => itm.uuid === item?.uuid)
        .first();

      if (existing) {
        // Use compound key + modify for a safe partial update
        await table
          .where('[inventoryCountImportId+uuid]')
          .equals([inventoryCountImportId, existing.uuid])
          .modify({
            productId,
            lastUpdatedAt: now,
            isRequested: context.isRequested,
            systemQuantityOnHand: inventory?.entityValueList?.[0]?.quantityOnHandTotal || 0
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
          isRequested: context.isRequested
        });
      }
    });

    console.log(`[Worker] Triggering syncToServer for ${inventoryCountImportId}`);
    await syncToServer(inventoryCountImportId, context);

    return { success: true };
  } catch (err) {
    console.error('[Worker] Error in matchProductLocallyAndSync', err);
    return { success: false, error: err };
  }
}

async function syncToServer(inventoryCountImportId: string, context: any) {
  if (isSyncing) return 0
  isSyncing = true
  try {
    const baseUrl = context.maargUrl
    const token = context.token

    let pending = await db.table('inventoryCountRecords')
      .where({ inventoryCountImportId })
      .and((item: any) =>
        !item.lastSyncedAt ||  // never synced
        (item.lastUpdatedAt && item.lastSyncedAt && item.lastUpdatedAt > item.lastSyncedAt) // modified after last sync
      )
      .toArray()

    if (!pending.length) return 0

    const needsQoh = (item: any) =>
      item.productId &&
      item.facilityId &&
      (item.systemQuantityOnHand === undefined || item.systemQuantityOnHand === null)

    if (pending.some(needsQoh)) {
      await resolveMissingSystemQOH(inventoryCountImportId, context)
      pending = await db.table('inventoryCountRecords')
        .where({ inventoryCountImportId })
        .and((item: any) =>
          !item.lastSyncedAt ||  // never synced
          (item.lastUpdatedAt && item.lastSyncedAt && item.lastUpdatedAt > item.lastSyncedAt)
        )
        .toArray()
    }

    const syncable: any = [];
    const blocked: any = [];
    for (const item of pending) {
      if (needsQoh(item)) {
        blocked.push(item);
      } else {
        syncable.push(item);
      }
    }

    if (!syncable.length) {
      return 0
    }

    const items = syncable.map((item: any) => ({
      uuid: item.uuid,
      productId: item.productId,
      productIdentifier: item.productIdentifier,
      quantity: Number(item.quantity || 0),
      lastScanAt: item.lastScanAt,
      lastUpdatedAt: item.lastUpdatedAt || Date.now(),
      isRequested: item.isRequested,
      createdDate: item.createdAt || Date.now(),
      countedByUserLoginId: context.userLoginId,
      ...(item.systemQuantityOnHand !== undefined &&
        item.systemQuantityOnHand !== null && {
          systemQuantityOnHand: item.systemQuantityOnHand
        })
    }))

    const payload = { items }

    const resp = await workerApi({
      baseURL: baseUrl,
      headers: {
        'Authorization': `Bearer ${token}`
      },
      url: `inventory-cycle-count/cycleCounts/sessions/${inventoryCountImportId}/items`,
      method: 'PUT',
      data: payload
    })

    if (resp) {
      const now = Date.now()
      await db.transaction('rw', db.table('inventoryCountRecords'), async () => {
        for (const item of syncable) {
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

async function resolveMissingSystemQOH(
  inventoryCountImportId: string,
  context: any
) {
  // fetch only items that have productId but no QOH yet, and are going to be synced
    const records = await db.table('inventoryCountRecords')
    .where({ inventoryCountImportId })
    .and((item: any) =>
      item.productId &&
      item.facilityId &&
      (item.systemQuantityOnHand === undefined || item.systemQuantityOnHand === null) &&
      (
        !item.lastSyncedAt ||  // never synced
        (item.lastUpdatedAt && item.lastSyncedAt && item.lastUpdatedAt > item.lastSyncedAt)
      )
    )
    .toArray()

  if (!records.length) return 0

  const now = Date.now()
  let enrichedCount = 0

  for (const record of records) {
    try {
      const inventory = await workerApi({
        baseURL: context.maargUrl,
        headers: {
          'Authorization': `Bearer ${context.token}`,
          'Content-Type': 'application/json'
        },
        url: 'oms/dataDocumentView',
        method: 'POST',
        data: {
        dataDocumentId: 'ProductFacilityAndInventoryItem',
        pageSize: 1,
        customParametersMap: { productId: record.productId, facilityId: record.facilityId }
      }
      })

      if (!inventory) throw new Error('No inventory response')

      await db.table('inventoryCountRecords')
        .where('[inventoryCountImportId+uuid]')
        .equals([inventoryCountImportId, record.uuid])
        .modify({
          systemQuantityOnHand: inventory?.entityValueList?.[0]?.quantityOnHandTotal ?? 0,
          lastUpdatedAt: now
        })

      enrichedCount++
    } catch (err) {
      console.warn(
        `[Worker] Failed to enrich QOH for ${record.productId} on facility ${record.facilityId}`,
        err
      )
    }
  }

  return enrichedCount
}

async function ensureDB(context: any) {
  if (dbInitialized && db) return db;

  db = createCommonDB(context.omsInstance);
  await db.open();
  dbInitialized = true;

  console.log("[Worker] DB initialized:", context.omsInstance);

  return db;
}

// Worker Listener
self.onmessage = async (messageEvent: MessageEvent) => {
  const { type, payload } = messageEvent.data

  if (type === 'aggregate') {
    const { inventoryCountImportId, context } = payload
    await ensureDB(context);
    const count = await aggregate(inventoryCountImportId, context)
    await resolveMissingProducts(inventoryCountImportId, context)
    await syncToServer(inventoryCountImportId, context)

    self.postMessage({ type: 'aggregationComplete', count })
  }

  if (type === 'schedule') {
    const { inventoryCountImportId, context, intervalMs = 10000 } = payload
    await ensureDB(context);
    setInterval(async () => {
      const count = await aggregate(inventoryCountImportId, context)
      await resolveMissingProducts(inventoryCountImportId, context)
      await syncToServer(inventoryCountImportId, context)

      self.postMessage({ type: 'aggregationComplete', count })
    }, intervalMs)
  }

  if (type === 'scheduleVarianceAggregation') {
    const { context, intervalMs = 10000 } = payload;
    await ensureDB(context);
    setInterval(async () => {
      const count = await aggregateVarianceLogs(context);
      self.postMessage({ type: 'varianceAggregationComplete', count })
    }, intervalMs)
  }
}
