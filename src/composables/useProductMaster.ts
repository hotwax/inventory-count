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
  identKeys?: string[]
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
    console.log('Fetched products from Solr:', results);
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

  const prefetch = async (productIds: string[]) => {
    if (!cacheReady.value) throw new Error("ProductMaster not initialized")

    const existing = await db.products.toArray()
    const existingIds = new Set(existing.map(p => p.productId))
    const idsToFetch = productIds.filter(id => !existingIds.has(id))

    if (idsToFetch.length === 0) return
    console.log('Prefetching product IDs:', idsToFetch);
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
        console.log('Upserting product:', product.productId);
        await db.products.put(product);

        if (product.goodIdentifications?.length) {
          for (const ident of product.goodIdentifications as any[]) {
            console.log('Upserting identification for product:', product.productId, ident);

            let idType: string | undefined;
            let idValue: string | undefined;

            // Case 1: ident is a string like "SKU/207-113-G"
            if (typeof ident === 'string') {
              const slashIndex = ident.indexOf('/');
              if (slashIndex === -1) {
                console.warn('Invalid identification format (missing "/"):', ident);
                continue;
              }
              idType = ident.substring(0, slashIndex).trim();
              idValue = ident.substring(slashIndex + 1).trim();
            }
            // Case 2: ident is an object { type, value }
            else if (ident && typeof ident === 'object' && ('type' in ident || 'value' in ident)) {
              idType = String((ident as any).type || '').trim();
              idValue = String((ident as any).value || '').trim();
            } else {
              console.warn('Invalid ident type (expected string or object):', ident);
              continue;
            }

            if (!idType || !idValue) {
              console.warn('Invalid identification format, missing type or value:', ident);
              continue;
            }

            const identKey = (makeIdentKey(idType) || idType).trim();

            // 🔍 Check for existing record for same productId + identKey
            const existingIdent = await db.productIdents
              .where('[productId+identKey]')
              .equals([product.productId, identKey])
              .first();

            if (existingIdent) {
              // Update existing record
              await db.productIdents.update(existingIdent, {
                value: idValue
              });
              console.log(`Updated existing ident for ${product.productId} (${identKey})`);
            } else {
              // Insert new record
              await db.productIdents.put({
                productId: product.productId,
                identKey,
                value: idValue
              });
              console.log(`Inserted new ident for ${product.productId} (${identKey})`);
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
    return {
      productId: doc.productId,
      productName: doc.productName || '',
      parentProductName: doc.parentProductName || '',
      internalName: doc.internalName || '',
      mainImageUrl: doc.mainImageUrl || '',
      goodIdentifications: doc.goodIdentifications || [],
      identKeys: (doc.goodIdentifications || []).map((id: any) => `${id.type}:${id.value}`),
      updatedAt: Date.now() // Will be overridden if necessary during upsert
    }
  }

  return {
    init,
    getById,
    findByIdentification,
    prefetch,
    upsertFromApi,
    clearCache,
    setStaleMs,
    getAllProductIdsFromIndexedDB,
    liveProduct,
    cacheReady
  }
}
