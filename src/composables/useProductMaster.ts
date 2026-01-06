import { ref } from 'vue'
import { liveQuery } from 'dexie'
import api, { client } from '@/services/RemoteAPI';
import workerApi from "@/services/workerApi";

import { db } from '@/services/appInitializer';
import { useAuthStore } from '@/stores/authStore';
import { useProductStore } from '@/stores/productStore';

// Product structure
export interface Product {
  productId: string
  productName?: string
  parentProductName?: string
  internalName?: string
  mainImageUrl?: string
  goodIdentifications?: { type: string, value: string }[]
  updatedAt: number
}

// Identification structure
export interface Identification {
  type: string
  value: string
}


const staleMs = ref(24 * 60 * 60 * 1000)
const cacheReady = ref(false)
const duplicateIdentifiers = ref(false)
const retentionPolicy = ref('keep')

const init = ({ staleMs: ttl, duplicateIdentifiers: dup = false, retentionPolicy: rp = 'keep' }: { staleMs?: number, duplicateIdentifiers?: boolean, retentionPolicy?: string } = {}) => {
  if (ttl !== undefined) staleMs.value = ttl
  duplicateIdentifiers.value = dup
  retentionPolicy.value = rp
  cacheReady.value = true
}

const makeIdentKey = (type: string) => type

const getByIds = async (productIds: string[]): Promise<Product[]> => {
  const baseURL = useAuthStore().getBaseUrl;

  const batchSize = 250
  const results: Product[] = []
  let index = 0

  do {
    const batch = productIds.slice(index, index + batchSize)
    const filter = `productId: (${batch.join(' OR ')})`

    const query = useProductMaster().buildProductQuery({
      filter: filter,
      viewSize: batch.length,
      fieldsToSelect: `productId, productName, parentProductName, internalName, mainImageUrl, goodIdentifications`
    });

    const resp = await client({
      url: "solr-query",
      method: "POST",
      baseURL,
      data: query,
      headers: {
        "Authorization": 'Bearer ' + useAuthStore().token.value,
        'Content-Type': 'application/json'
      }
    })

    if (resp.data?.response?.docs?.length) {
      results.push(...resp.data.response.docs.map(mapApiDocToProduct))
    }
    index += batchSize
  } while (index < productIds.length)
  return results
}

const getById = async (productId: string, opts?: { refresh?: boolean }) => {
  if (!cacheReady.value) throw new Error("ProductMaster not initialized")

  const now = Date.now()
  const product = await db.products.get(productId)

  if (product && (!opts?.refresh || now - product.updatedAt < staleMs.value)) {
    return { product, status: 'hit' as const }
  }

  try {
    const docs = await getByIds([productId])
    if (docs?.length) {
      // upsert the fetched product into IndexedDB
      await upsertFromApi(docs)

      // read back the normalized product from IndexedDB
      const updatedProduct = await db.products.get(productId)

      if (updatedProduct) {
        return { product: updatedProduct, status: product ? 'stale-refreshed' as const : 'miss-refreshed' as const }
      }
    }
  } catch (err) {
    console.error("Solr fetch or upsert failed in getById:", err)
  }
  return { product: product || undefined, status: product ? 'stale' as const : 'miss' as const }
}

const findByIdentification = async (idValue: string) => {
  if (!cacheReady.value) throw new Error("ProductMaster not initialized")
  if (!idValue) return { product: undefined, identificationValue: undefined }

  // Since Dexie cannot query inside arrays directly, we need to scan manually:
  const allProducts = await db.products.toArray()
  const matchedProduct = allProducts.find((product: any) =>
    product.goodIdentifications?.some((identification: any) => identification.value === idValue)
  )

  if (!matchedProduct) return { product: undefined, identificationValue: undefined }

  return { product: matchedProduct, identificationValue: idValue }
}

const getByIdentificationFromSolr = async (idValue: string) => {
  const barcodeIdentification = useProductStore().getBarcodeIdentificationPref;
  const productIdentifications = process.env.VUE_APP_PRDT_IDENT
    ? JSON.parse(JSON.stringify(process.env.VUE_APP_PRDT_IDENT))
    : [];

  const baseURL = useAuthStore().getBaseUrl;

  // Build Solr filter dynamically
  const filter = productIdentifications.includes(barcodeIdentification)
    ? `${barcodeIdentification}: ${idValue}`
    : `goodIdentifications: ${barcodeIdentification}/${idValue}`;

    const query = useProductMaster().buildProductQuery({
      filter: filter,
      viewSize: 1,
      fieldsToSelect: `productId,productName,parentProductName,internalName,mainImageUrl,goodIdentifications`
    });

  try {
    const resp = await client({
      url: 'solr-query',
      method: 'POST',
      baseURL,
      data: query,
      headers: {
        'Authorization': 'Bearer ' + useAuthStore().token.value,
        'Content-Type': 'application/json'
      }
    });

    const products = resp.data?.response?.docs || [];
    if (products.length) {
      const mapped = mapApiDocToProduct(products[0]);
      await upsertFromApi([mapped]);
      return { product: mapped, status: 'fresh' as const };
    }
  } catch (err) {
    console.error('Failed to fetch product by identification from Solr:', err);
  }

  return { product: undefined, status: 'miss' as const };
};

const prefetch = async (productIds: string[]) => {
  if (!cacheReady.value) throw new Error("ProductMaster not initialized")

  const existing = await db.products.toArray()
  const existingIds = new Set(existing.map((product: any) => product.productId))
  const idsToFetch = productIds.filter(id => !existingIds.has(id))

  if (idsToFetch.length === 0) return
  for (let i=0; i<idsToFetch.length; i+=750) {
    const docs = await getByIds(idsToFetch.slice(i, i+750))
    if (docs.length) {
      upsertFromApi(docs).catch(err => console.error("upsert failed", err))
    }
  }
}

const upsertFromApi = async (docs: any[]) => {
  if (!cacheReady.value) throw new Error("ProductMaster not initialized");

  const now = Date.now()

  // Convert API docs → IndexedDB friendly format
  const products = docs.map(doc => ({
    ...mapApiDocToProduct(doc),
    updatedAt: now
  }))

  // Prepare identifications
  const idents: any[] = []
  for (const product of products) {
    if (!product.goodIdentifications?.length) continue

    for (const ident of product.goodIdentifications) {
      const identKey = (makeIdentKey(ident.type) || ident.type).trim()
      const identValue = ident.value?.trim()
      if (!identKey || !identValue) continue

      idents.push({
        productId: product.productId,
        identKey,
        value: identValue
      })
    }
  }

  await db.transaction("rw", db.products, db.productIdentification, async () => {
    // Write all products in one shot
    await db.products.bulkPut(products)

    // Bulk put idents (Dexie will update if PK matches)
    if (idents.length) {
      await db.productIdentification.bulkPut(idents)
    }
  })
};

async function findProductByIdentification(idType: string, value: string, context: any) {
  const ident = await db.table('productIdentification')
    .where('value')
    .equalsIgnoreCase(value)
    .first()
  if (ident) return ident.productId

  if (!context?.token || !context?.omsUrl) return null
  if (!idType) idType = context.barcodeIdentification

  const query = useProductMaster().buildProductQuery({
        filter: `goodIdentifications:${idType}/${value}`,
        viewSize: 1,
        fieldsToSelect: `productId,productName,parentProductName,internalName,mainImageUrl,goodIdentifications`
      });
  try {
    const resp = await workerApi({
      baseURL: context.omsUrl,
      headers: {
        'Authorization': `Bearer ${context.token}`,
        'Content-Type': 'application/json'
      },
      url: 'solr-query',
      method: 'POST',
      data: query
    })

    const productId = resp?.response?.docs?.[0]?.productId

    if (productId) {
      await db.table('productIdentification').put({
        productId,
        identKey: idType,
        value
      })
      return productId
    }

    return null
  } catch (err) {
    console.warn('Solr lookup failed for', value, err)
    return null
  }
}

async function searchProducts(value: string) {
  const products = await db.table('productIdentification')
    .where('value')
    .startsWithIgnoreCase(value)
    .limit(250)
    .toArray()
    if (products) return products.map((product: any) => product.productId)
    return null
}

const clearCache = async () => {
  await db.transaction('rw', db.products, db.productIdentification, async () => {
    await db.products.clear()
    await db.productIdentification.clear()
  })
}

const setStaleMs = (ms: number) => {
  staleMs.value = ms
}

const liveProduct = (productId: string) => {
  return liveQuery(() =>
    db.products.get(productId)
  )
}

const mapApiDocToProduct = (doc: any): Product => {
  // Normalize goodIdentifications (convert "SKU/123" → { type: "SKU", value: "123" })
  const normalizedIdents = (doc.goodIdentifications || []).map((ident: any) => {
    // Case 1: ident is a string like "SKU/123"
    if (typeof ident === 'string') {
      const slashIndex = ident.indexOf('/');
      let type = '';
      let value = '';
      if (slashIndex !== -1) {
        type = ident.substring(0, slashIndex).trim();
        value = ident.substring(slashIndex + 1).trim();
      } else {
        // If no slash found, treat the whole string as value
        value = ident.trim();
      }
      return { type, value };
    }

    // Case 2: ident is an object like { type: "SKU", value: "123" }
    if (ident && typeof ident === 'object') {
      const type = String(ident.type || '').trim();
      const value = String(ident.value || '').trim();
      return { type, value };
    }

    return { type: '', value: '' };
  });
  return {
    productId: doc.productId,
    productName: doc.productName || '',
    parentProductName: doc.parentProductName || '',
    internalName: doc.internalName || '',
    mainImageUrl: doc.mainImageUrl || '',
    goodIdentifications: normalizedIdents,
    updatedAt: Date.now()
  };
};

const getProductStock = async (query: any): Promise<any> => {
  const baseURL = useAuthStore().getBaseUrl;
  const token = useAuthStore().token.value;

  return await client({
    url: "poorti/getInventoryAvailableByFacility",
    method: "GET",
    baseURL,
    params: query,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
}

const loadProducts = async (query: any): Promise<any> => {
  const baseURL = useAuthStore().getBaseUrl;
  return await client({
    url: "solr-query",
    method: "POST",
    baseURL,
    data: query,
    headers: {
      Authorization: "Bearer " + useAuthStore().token.value,
      "Content-Type": "application/json",
    },
  });
};

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
    const wildcardTerms = params.keyword.split(/\s+/).filter(Boolean).map((term: any) => `*${term}*`).join(' OR ');
    payload.json.query = `${wildcardTerms} OR "${params.keyword}"^100`
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

// helper: pick primary/secondary id from enriched product.goodIdentifications
const primaryId = (product?: any) => {
  if (!product) return ''
  const pref = useProductStore().getPrimaryId

  const parsedGoodIds = Array.isArray(product.goodIdentifications) ? product.goodIdentifications.map((goodIdentification: any) => {
        if (typeof goodIdentification === 'string' && goodIdentification.includes('/')) {
          const [type, value] = goodIdentification.split('/', 2)
          return { type: type?.trim(), value: value?.trim() }
        }
        return goodIdentification
      }) : []

  const resolve = (type: string) => {
    if (!type) return ''
    if (['SKU', 'SHOPIFY_PROD_SKU'].includes(type))
      return parsedGoodIds.find((goodIdentification: any) => goodIdentification.type === 'SKU')?.value || ''
    if (type === 'internalName') return product.internalName || ''
    if (type === 'productId') return product.productId || ''
    return parsedGoodIds.find((goodIdentification: any) => goodIdentification.type === type)?.value || ''
  }

  // Try preference, then fallback to SKU or productId
  return resolve(pref) || resolve('SKU') || product.productId || ''
}

const secondaryId = (product: any) => {
  if (!product) return ''
  const pref = useProductStore().getSecondaryId

  // Parse any flat "TYPE/VALUE" strings (from Solr)
  const parsedGoodIds = Array.isArray(product.goodIdentifications) ? product.goodIdentifications.map((goodIdentification: any) => {
        if (typeof goodIdentification === 'string' && goodIdentification.includes('/')) {
          const [type, value] = goodIdentification.split('/', 2)
          return { type: type?.trim(), value: value?.trim() }
        }
        return goodIdentification
      }) : []

  const resolve = (type: string) => {
    if (!type) return ''
    if (['SKU', 'SHOPIFY_PROD_SKU'].includes(type))
      return parsedGoodIds.find((goodIdentification: any) => goodIdentification.type === 'SKU')?.value || ''
    if (type === 'internalName') return product.internalName || ''
    if (type === 'productId') return product.productId || ''
    return parsedGoodIds.find((goodIdentification: any) => goodIdentification.type === type)?.value || ''
  }

  // Try preference, then fallback to productId
  return resolve(pref) || product.productId || ''
}

async function getProductsOnFacility (payload: any): Promise<any> {
  const resp = await api({
    url: `oms/dataDocumentView`,
    method: "post",
    data: {
      dataDocumentId: 'ProductFacilityAndInventoryItem',
      pageSize: payload.pageSize,
      pageIndex: payload.pageIndex,
      customParametersMap: {
        facilityId: payload.facilityId
      }
    }
  })
  return resp;
}

// Product Inventory functions
const inventoryStaleMs = ref(60 * 60 * 1000)
const setInventoryStaleMs = (ms: number) => { inventoryStaleMs.value = ms }

/** Upsert a batch of product+facility inventory records into IndexedDB */
const upsertInventoryBatch = async (records: any[]) => {
  if (!records?.length) return

  const now = Date.now()
  const normalized = records.map(record => ({
    productId: record.productId,
    facilityId: record.facilityId,
    availableToPromiseTotal: Number(record.availableToPromiseTotal || 0),
    quantityOnHandTotal: Number(record.quantityOnHandTotal || 0),
    updatedAt: record.updatedAt ?? now
  }))

  await db.productInventory.bulkPut(normalized)
}

/**
 * Helper for session /items response:
 * take the /items payload and store ATP/QOH into productInventory.
 */
const upsertInventoryFromSessionItems = async (items: any[]) => {
  if (!items?.length) return

  const records: any[] = items
    .filter(item => item.productId && item.facilityId)
    .map(item => ({
      productId: item.productId,
      facilityId: item.facilityId,
      availableToPromiseTotal: item.availableToPromiseTotal ?? 0,
      quantityOnHandTotal: item.quantityOnHandTotal ?? 0
    }))

  if (records.length) {
    await upsertInventoryBatch(records)
  }
}

/** Low-level: fetch inventory snapshot from OMS and store it */
const getInventory = async (
  productId: string,
  facilityId: string
): Promise<any | null> => {
  if (!productId || !facilityId) return null

  const baseURL = useAuthStore().getBaseUrl
  const token = useAuthStore().token.value

  const resp = await client({
    url: 'oms/dataDocumentView',
    method: 'POST',
    baseURL,
    data: {
      dataDocumentId: 'ProductFacilityAndInventoryItem',
      pageSize: 1,
      customParametersMap: { productId, facilityId }
    },
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })

  const row = resp.data?.entityList?.[0] || null
  if (!row) return null

  const record = {
    productId,
    facilityId,
    availableToPromiseTotal: row.availableToPromiseTotal ?? 0,
    quantityOnHandTotal: row.quantityOnHandTotal ?? 0,
    updatedAt: Date.now()
  }

  await upsertInventoryBatch([record])
  return record
}

/**
 * Main: get product inventory snapshot (ATP/QOH) for product+facility
 * - reads from IndexedDB
 * - if missing or older than inventoryStaleMs, hits OMS and refreshes
 */
const getProductInventory = async (
  productId: string,
  facilityId: string,
  opts: { forceRefresh?: boolean } = {}
) => {
  if (!productId || !facilityId) return null

  const key = [productId, facilityId] as [string, string]
  const cached = await db.productInventory
    .where('[productId+facilityId]')
    .equals(key)
    .first()

  const now = Date.now()
  const isStale =
    !cached ||
    opts.forceRefresh ||
    now - (cached?.updatedAt || 0) > inventoryStaleMs.value

  if (!isStale && cached) return cached

  const fresh = await getInventory(productId, facilityId)
  return fresh || cached || null
}

/** Convenience: just QOH value */
const getProductQoh = async (
  productId: string,
  facilityId: string
): Promise<number | null> => {
  const rec = await getProductInventory(productId, facilityId)
  return rec ? rec.quantityOnHandTotal : null
}

export function useProductMaster() {

  return {
    init,
    getById,
    getByIds,
    getProductStock,
    loadProducts,
    findByIdentification,
    findProductByIdentification,
    searchProducts,
    getByIdentificationFromSolr,
    prefetch,
    upsertFromApi,
    clearCache,
    setStaleMs,
    liveProduct,
    cacheReady,
    buildProductQuery,
    primaryId,
    secondaryId,
    getProductsOnFacility,
    upsertInventoryFromSessionItems,
    getProductInventory,
    getProductQoh,
    setInventoryStaleMs
  }
}
