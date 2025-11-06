import { ref } from 'vue'
import api from '@/api'
import { hasError } from '@hotwax/oms-api'
import { useProductMaster } from './useProductMaster'
import { getProductStoreId } from '@/utils'

interface ProductIdentificationPref {
  primaryId: string
  secondaryId: string
}

interface ProductStoreSetting {
  productStoreId: string
  productIdentificationPref: ProductIdentificationPref
}

const productStore = ref<ProductStoreSetting | null>(null)
const isInitialized = ref(false)
const isLoading = ref(false)

/** API call to get store settings */
async function getProductIdentifications(productStoreId: string) {
  try {
    const resp = await api({
      url: `admin/productStores/${productStoreId}/settings`,
      method: 'GET',
      params: {
        productStoreId,
        settingTypeEnumId: 'PRDT_IDEN_PREF'
      }
    })
    if (!hasError(resp) && resp?.data) {
      const settings = JSON.parse(resp.data[0].settingValue);
      const primaryId = settings?.primaryId || 'SKU'
      const secondaryId = settings?.secondaryId || 'productId'
      return { primaryId, secondaryId }
    }

    console.warn('No valid identification settings returned for store:', productStoreId)
    return { primaryId: 'SKU', secondaryId: 'productId' }
  } catch (err) {
    console.error('Failed to fetch product store settings:', err)
    return { primaryId: 'SKU', secondaryId: 'productId' }
  }
}

/** Initialize once per app lifecycle */
async function init() {
  if (isInitialized.value || isLoading.value) return productStore.value

  isLoading.value = true
  try {
    const productStoreId = await getProductStoreId()
    const { primaryId, secondaryId } = await getProductIdentifications(productStoreId)

    productStore.value = {
      productStoreId,
      productIdentificationPref: { primaryId, secondaryId }
    }

    isInitialized.value = true
    console.info('[useProductStoreSettings] Initialized for', productStoreId)
    return productStore.value
  } catch (err) {
    console.error('[useProductStoreSettings] Initialization failed:', err)
    return null
  } finally {
    isLoading.value = false
  }
}

/**
 * Returns goodIdentification value for a product (from IndexedDB or Solr)
 * Uses useProductMaster for unified access.
 */
async function getProductIdentificationValue(productId: string, type: string): Promise<string | undefined> {
  if (!type || !productId) return undefined
  const productMaster = useProductMaster()

  try {
    // Try local cache
    const { product } = await productMaster.getById(productId)
    if (product) {
      const match = product.goodIdentifications?.find((goodIdentification: any) => goodIdentification.type === type)
      if (match?.value) return match.value
    }

  } catch (err) {
    console.error(`[useProductStoreSettings] Failed to get identification for ${productId}/${type}`, err)
  }
}

/** Helper getters */
const getPrimaryId = () => productStore.value?.productIdentificationPref.primaryId || 'SKU'
const getSecondaryId = () => productStore.value?.productIdentificationPref.secondaryId || 'productId'

/**
 * Exported composable API
 */
export function useProductStoreSettings() {
  return {
    productStore,
    isInitialized,
    isLoading,
    init,
    getPrimaryId,
    getSecondaryId,
    getProductIdentificationValue
  }
}