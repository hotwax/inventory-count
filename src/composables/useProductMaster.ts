import { ref } from 'vue'
import { liveQuery } from 'dexie'
import store from '@/store'
import { client } from '@/api'
import workerApi from "@/api/workerApi";
// Setup Dexie database
import { db } from '@/database/commonDatabase'

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
  const omsRedirectionInfo = store.getters["user/getOmsRedirectionInfo"]
  const baseURL = omsRedirectionInfo.url.startsWith('http')
    ? omsRedirectionInfo.url.includes('/api') ? omsRedirectionInfo.url : `${omsRedirectionInfo.url}/api/`
    : `https://${omsRedirectionInfo.url}.hotwax.io/api/`

  const batchSize = 250
  const results: Product[] = []
  let index = 0

  do {
    const batch = productIds.slice(index, index + batchSize)
    const filter = `productId: (${batch.join(' OR ')})`
    const resp = await client({
      url: "searchProducts",
      method: "POST",
      baseURL,
      data: {
        filters: [filter],
        viewSize: batch.length,
        fieldsToSelect: ["productId", "productName", "parentProductName", "internalName", "mainImageUrl", "goodIdentifications"]
      },
      headers: {
        "Authorization": 'Bearer ' + omsRedirectionInfo.token,
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
  const matchedProduct = allProducts.find(p =>
    p.goodIdentifications?.some(ident => ident.value === idValue)
  )

  if (!matchedProduct) return { product: undefined, identificationValue: undefined }

  return { product: matchedProduct, identificationValue: idValue }
}

const getByIdentificationFromSolr = async (idValue: string) => {
  const omsRedirectionInfo = store.getters["user/getOmsRedirectionInfo"];
  const productStoreSettings = store.getters["user/getProductStoreSettings"];
  const barcodeIdentification = productStoreSettings["barcodeIdentificationPref"];
  const productIdentifications = process.env.VUE_APP_PRDT_IDENT
    ? JSON.parse(JSON.stringify(process.env.VUE_APP_PRDT_IDENT))
    : [];

  const baseURL = omsRedirectionInfo.url.startsWith('http')
    ? omsRedirectionInfo.url.includes('/api')
      ? omsRedirectionInfo.url
      : `${omsRedirectionInfo.url}/api/`
    : `https://${omsRedirectionInfo.url}.hotwax.io/api/`;

  // Build Solr filter dynamically
  const filter = productIdentifications.includes(barcodeIdentification)
    ? `${barcodeIdentification}: ${idValue}`
    : `goodIdentifications: ${barcodeIdentification}/${idValue}`;

  try {
    const resp = await client({
      url: 'searchProducts',
      method: 'POST',
      baseURL,
      data: {
        filters: [filter],
        viewSize: 1,
        fieldsToSelect: [
          'productId',
          'productName',
          'parentProductName',
          'internalName',
          'mainImageUrl',
          'goodIdentifications'
        ]
      },
      headers: {
        'Authorization': 'Bearer ' + omsRedirectionInfo.token,
        'Content-Type': 'application/json'
      }
    });

    const docs = resp.data?.response?.docs || [];
    if (docs.length) {
      const mapped = mapApiDocToProduct(docs[0]);
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
  const existingIds = new Set(existing.map(p => p.productId))
  const idsToFetch = productIds.filter(id => !existingIds.has(id))

  if (idsToFetch.length === 0) return
  const docs = await getByIds(idsToFetch)
  if (docs.length) {
    await upsertFromApi(docs)
  }
}

const upsertFromApi = async (docs: any[]) => {
  if (!cacheReady.value) throw new Error("ProductMaster not initialized");

  const now = Date.now();
  const products = docs.map(doc => ({
    ...mapApiDocToProduct(doc),
    updatedAt: now
  }));

  await db.transaction('rw', db.products, db.productIdents, async () => {
    for (const product of products) {
      await db.products.put(product);

      if (product.goodIdentifications?.length) {
        for (const ident of product.goodIdentifications) {
          const identKey = (makeIdentKey(ident.type) || ident.type).trim();
          const idValue = ident.value?.trim();

          if (!identKey || !idValue) continue;

          const existingIdent = await db.productIdents
            .where('[productId+identKey]')
            .equals([product.productId, identKey])
            .first();

          if (existingIdent) {
            await db.productIdents.update(existingIdent, { value: idValue });
          } else {
            await db.productIdents.put({
              productId: product.productId,
              identKey,
              value: idValue
            });
          }
        }
      }
    }
  });
};

async function findProductByIdentification(idType: string, value: string, context: any) {
  const ident = await db.table('productIdents')
    .where('value')
    .equalsIgnoreCase(value)
    .first()
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
        fieldsToSelect: ['productId', 'productName', 'parentProductName', 'internalName', 'mainImageUrl', 'goodIdentifications']
      }
    })

    const productId = resp?.response?.docs?.[0]?.productId

    if (productId) {
      await db.table('productIdents').put({
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

const loadProducts = async (query: any): Promise<any> => {
  const omsRedirectionInfo = store.getters["user/getOmsRedirectionInfo"];
  const baseURL = omsRedirectionInfo.url.startsWith("http") ? omsRedirectionInfo.url.includes("/api") ? omsRedirectionInfo.url : `${omsRedirectionInfo.url}/api/` : `https://${omsRedirectionInfo.url}.hotwax.io/api/`;
  return await client({
    url: "searchProducts",
    method: "POST",
    baseURL,
    data: query,
    headers: {
      Authorization: "Bearer " + omsRedirectionInfo.token,
      "Content-Type": "application/json",
    },
  });
};

const clearCache = async () => {
  await db.transaction('rw', db.products, db.productIdents, async () => {
    await db.products.clear()
    await db.productIdents.clear()
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
  const baseURL = store.getters["user/getBaseUrl"];
  const token = store.getters["user/getUserToken"]

  return await client({
    url: "poorti/getInventoryAvailableByFacility",
    method: "GET",
    baseURL,
    params: query,
    headers: {
      Api_Key: token,
      'Content-Type': 'application/json'
    }
  });
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
    getByIdentificationFromSolr,
    prefetch,
    upsertFromApi,
    clearCache,
    setStaleMs,
    liveProduct,
    cacheReady
  }
}
