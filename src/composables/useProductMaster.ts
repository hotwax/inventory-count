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

  const findByIdentification = async (idType: string, productId: string) => {
    if (!cacheReady.value) throw new Error("ProductMaster not initialized")
    if (!productId) return { product: undefined, identificationValue: undefined }

    // Get product from DB
    const product = await db.products.get(productId)
    if (!product) return { product: undefined, identificationValue: undefined }

    // Find identification value from product.goodIdentifications
    const ident = product.goodIdentifications?.find(i => i.type === idType)
    return { product, identificationValue: ident?.value }
  }

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

  const upsertFromApi = async (docs: any[]) => {
    if (!cacheReady.value) throw new Error("ProductMaster not initialized")

    const now = Date.now()
    const products = docs.map(doc => ({
      ...mapApiDocToProduct(doc),
      updatedAt: now
    }))

    await db.transaction('rw', db.products, db.productIdents, async () => {
      for (const product of products) {
        await db.products.put(product)

        if (product.goodIdentifications?.length) {
          for (const ident of product.goodIdentifications) {
            await db.productIdents.put({
              productId: product.productId,
              identKey: makeIdentKey(ident.type),
              value: ident.value
            })
          }
        }
      }
    })
  }

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
    liveProduct,
    cacheReady
  }
}
