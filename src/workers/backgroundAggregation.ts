import { v4 as uuidv4 } from 'uuid'
import workerApi from "@/services/workerApi";
import { expose } from 'comlink';
import { db } from '@/services/commonDatabase';

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
}

expose({
  aggregate,
  syncToServer,
  matchProductLocallyAndSync,
});

let isAggregating = false
let isSyncing = false

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
  const oms = context.omsInstanceId
  const now = Date.now()

  const cached = await db.products
    .where('[productId+omsInstanceId]')
    .equals([productId, oms])
    .first()

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
      await db.products.put({
        ...doc,
        omsInstanceId: oms,
        updatedAt: now
      });

      return await db.products
        .where('[productId+omsInstanceId]')
        .equals([productId, oms])
        .first()
    }
  } catch (err) {
    console.error(`Error fetching product ${productId} via workerApi:`, err)
  }

  return cached || undefined
}


async function findProductByIdentification(idType: string, value: string, context: any) {
  const oms = context.omsInstanceId // ★

  const ident = await db.productIdentification
    .where('[identKey+value+omsInstanceId]')
    .equals([context.barcodeIdentification, value, oms])
    .first()

  if (ident) return ident.productId

  if (!context?.token || !context?.maargUrl) return null
  if (!idType) idType = context.barcodeIdentification

  try {
    const query = buildProductQuery({
        filter: `goodIdentifications:${idType}/${value}`,
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
      await db.productIdentification.put({
        productId,
        identKey: idType,
        value,
        omsInstanceId: oms
      });

      await db.products.put({
        ...resp.response.docs[0],
        omsInstanceId: oms,
        updatedAt: Date.now()
      });
    }

    return productId || null
  } catch (err) {
    console.warn('Solr lookup failed for', value, err)
    return null
  }
}

function ensureProductStored(productId: string | null, context: any) {
  if (!productId) return
  const oms = context.omsInstanceId
  ;(async () => {
    try {
      const exists = await db.products
        .where('[productId+omsInstanceId]')
        .equals([productId, oms])
        .first()

      if (exists) return

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
        await db.products.put({
          ...doc,
          omsInstanceId: oms,
          updatedAt: Date.now()
        });
      }
    } catch (err) {
      console.warn(`[Worker] Failed to cache product ${productId}:`, err);
    }
  })();
}

async function resolveMissingProducts(inventoryCountImportId: string, context: any) {
  const oms = context.omsInstanceId

  const unresolved = await db.inventoryCountRecords
    .where('[inventoryCountImportId+omsInstanceId]')
    .equals([inventoryCountImportId, oms])
    .and(item => !item.productId)
    .toArray()

  if (!unresolved.length) return 0

  const now = Date.now()

  for (const rec of unresolved) {
    const identifier = rec.productIdentifier
    if (!identifier) continue

    let productId = await findProductByIdentification(context.barcodeIdentification, identifier, context)
    if (!productId) {
      const product = await getById(identifier, context)
      productId = product?.productId || null
    }

    if (!productId) continue

    await db.inventoryCountRecords
      .where('[inventoryCountImportId+uuid+omsInstanceId]')
      .equals([inventoryCountImportId, rec.uuid, oms])
      .modify({ productId, lastUpdatedAt: now })

    await db.scanEvents
      .where('[inventoryCountImportId+omsInstanceId]')
      .equals([inventoryCountImportId, oms])
      .and(scanEvent => scanEvent.scannedValue === identifier)
      .modify({ productId })
  }
  return 0
}

async function aggregate(inventoryCountImportId: string, context: any) {
  const oms = context.omsInstanceId

  if (isAggregating) return 0
  isAggregating = true
  try {
    const scans = await db.scanEvents
      .where('[inventoryCountImportId+omsInstanceId]')
      .equals([inventoryCountImportId, oms])
      .and(scanEvent => scanEvent.aggApplied === 0)
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
      const ident = await db.productIdentification
        .where('[identKey+value+omsInstanceId]')
        .equals([context.barcodeIdentification, scannedValue, oms])
        .first()

      if (ident) productId = ident.productId
      else {
        const prod = await db.products
          .where('[productId+omsInstanceId]')
          .equals([scannedValue, oms])
          .first()
        if (prod) productId = prod.productId
      }

      const existing = await db.inventoryCountRecords
        .where('[inventoryCountImportId+omsInstanceId]')
        .equals([inventoryCountImportId, oms])
        .and(itm => (productId && itm.productId === productId) || itm.productIdentifier === scannedValue)
        .first()

      if (existing) {
        await db.inventoryCountRecords.put({
          ...existing,
          quantity: (existing.quantity || 0) + quantity,
          lastScanAt: now,
          lastUpdatedAt: now,
          productId: existing.productId || productId,
          isRequested: existing.isRequested ?? 'Y',
          omsInstanceId: oms
        })
      } else {
        await db.inventoryCountRecords.add({
          inventoryCountImportId,
          uuid: uuidv4(),
          productIdentifier: scannedValue,
          productId: productId || null,
          quantity,
          isRequested: (context.inventoryCountTypeId === 'HARD_COUNT') ? 'Y' : 'N',
          createdAt: now,
          lastScanAt: now,
          lastUpdatedAt: now,
          status: 'active',
          facilityId: context.facilityId,
          omsInstanceId: oms
        })
      }

      if (productId) {
        await db.scanEvents
          .where('[inventoryCountImportId+omsInstanceId]')
          .equals([inventoryCountImportId, oms])
          .and(scanEvent => scanEvent.scannedValue === scannedValue)
          .modify({ productId })
      }
      processed++
    }

    await db.scanEvents
      .where('id')
      .anyOf(scans.map(se => se.id).filter((id): id is number => id !== undefined))
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
  const oms = context.omsInstanceId
  const now = Date.now()

  try {
    ensureProductStored(productId, context)

    await db.transaction('rw', db.inventoryCountRecords, async () => {
      const table = db.inventoryCountRecords

      const existing = await table
        .where('[inventoryCountImportId+omsInstanceId]')
        .equals([inventoryCountImportId, oms])
        .and(itm => itm.uuid === item?.uuid)
        .first()

      if (existing) {
        await table
          .where('[inventoryCountImportId+uuid+omsInstanceId]')
          .equals([inventoryCountImportId, existing.uuid, oms])
          .modify({
            productId,
            lastUpdatedAt: now,
            isRequested: context.isRequested
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
          isRequested: context.isRequested,
          omsInstanceId: oms
        });
      }
    });

    await syncToServer(inventoryCountImportId, context)
    return { success: true }

  } catch (err) {
    console.error('[Worker] Error in matchProductLocallyAndSync', err)
    return { success: false, error: err }
  }
}

async function syncToServer(inventoryCountImportId: string, context: any) {
  const oms = context.omsInstanceId // ★

  if (isSyncing) return 0
  isSyncing = true

  try {
    const pending = await db.inventoryCountRecords
      .where('[inventoryCountImportId+omsInstanceId]')
      .equals([inventoryCountImportId, oms])
      .and((item: any) => {
        const neverSynced = !item.lastSyncedAt
        const updated =
          item.lastUpdatedAt !== undefined &&
          item.lastSyncedAt !== undefined &&
          item.lastSyncedAt &&
          item.lastUpdatedAt > item.lastSyncedAt
        return neverSynced || updated
      })
      .toArray()

    if (!pending.length) return 0

    const items = pending.map(item => ({
      uuid: item.uuid,
      productId: item.productId,
      productIdentifier: item.productIdentifier,
      quantity: Number(item.quantity || 0),
      lastScanAt: item.lastScanAt,
      lastUpdatedAt: item.lastUpdatedAt || Date.now(),
      isRequested: item.isRequested,
      createdDate: item.createdAt || Date.now(),
      countedByUserLoginId: context.userLoginId
    }))

    const resp = await workerApi({
      baseURL: context.maargUrl,
      headers: { 'Authorization': `Bearer ${context.token}` },
      url: `inventory-cycle-count/cycleCounts/sessions/${inventoryCountImportId}/items`,
      method: 'PUT',
      data: { items }
    })

    if (resp) {
      const now = Date.now()

      await db.transaction('rw', db.inventoryCountRecords, async () => {
        for (const item of pending) {
          await db.inventoryCountRecords
            .where('[inventoryCountImportId+uuid+omsInstanceId]')
            .equals([inventoryCountImportId, item.uuid, oms])
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
self.onmessage = async (messageEvent: MessageEvent) => {
  const { type, payload } = messageEvent.data

  if (type === 'aggregate') {
    const { inventoryCountImportId, context } = payload
    const count = await aggregate(inventoryCountImportId, context)
    await resolveMissingProducts(inventoryCountImportId, context)
    await syncToServer(inventoryCountImportId, context)

    self.postMessage({ type: 'aggregationComplete', count })
  }

  if (type === 'schedule') {
    const { inventoryCountImportId, context, intervalMs = 10000 } = payload
    setInterval(async () => {
      const count = await aggregate(inventoryCountImportId, context)
      await resolveMissingProducts(inventoryCountImportId, context)
      await syncToServer(inventoryCountImportId, context)

      self.postMessage({ type: 'aggregationComplete', count })
    }, intervalMs)
  }
}