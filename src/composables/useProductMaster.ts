import { ref } from 'vue'
import Dexie, { Table } from 'dexie'
import { liveQuery } from 'dexie'
import store from '@/store'
import { client } from '@/api'

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

// Setup Dexie database
class ProductDB extends Dexie {
  products!: Table<Product, string>
  productIdents!: Table<{ productId: string, identKey: string, value: string }, [string, string]>

  constructor() {
    super('ProductMasterDB')
    this.version(1).stores({
      products: 'productId, updatedAt',
      productIdents: '[productId+identKey], identKey' // compound primary key
    })
  }
}

const db = new ProductDB()

export function useProductMaster() {
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

  const getFromSolr = async (productIds: string[]): Promise<Product[]> => {
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

    const product = await db.products.get(productId)
    const now = Date.now()

    if (product && (!opts?.refresh || now - product.updatedAt < staleMs.value)) {
      return { product, status: 'hit' as const }
    }

    if (!product) return { product: undefined, status: 'miss' as const }

    getFromSolr([productId])
      .then(async docs => {
        if (docs.length) await upsertFromApi(docs)
      })
      .catch(err => console.error("Background refresh failed", err))

    return { product, status: 'stale' as const }
  }

  const findByIdentification = async (idType: string, idValue: string) => {
    if (!cacheReady.value) throw new Error("ProductMaster not initialized")
    if (!idValue) return { product: undefined, identificationValue: undefined }

    // Since Dexie cannot query inside arrays directly, we need to scan manually:
    const allProducts = await db.products.toArray()
    const matchedProduct = allProducts.find(p =>
      p.goodIdentifications?.some(ident => ident.type === idType && ident.value === idValue)
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
    const docs = await getFromSolr(idsToFetch)
    if (docs.length) {
      await upsertFromApi(docs)
    }
  }

  async function getAllProductIdsFromIndexedDB(inventoryCountImportId: string): Promise<string[]> {
    try {
      // Reuse the same Dexie DB as in useInventoryCountImport
      const db = new Dexie('InventoryCountDB');
      db.version(3).stores({
        inventoryCountRecords: '[inventoryCountImportId+importItemSeqId], productId'
      });

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


  return {
    init,
    getById,
    findByIdentification,
    getByIdentificationFromSolr,
    prefetch,
    upsertFromApi,
    clearCache,
    setStaleMs,
    getAllProductIdsFromIndexedDB,
    liveProduct,
    cacheReady
  }
}
