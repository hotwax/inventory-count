import { defineStore } from 'pinia'
import api from '@/services/RemoteAPI'
import { hasError } from '@/stores/useAuthStore'
import logger from '@/logger'
import { useAuthStore } from './useAuthStore'
import { useProductMaster } from '@/composables/useProductMaster'
import {
  fetchGoodIdentificationTypes,
  getEComStores,
  getEComStoresByFacility,
  getProductIdentificationPref,
  getUserPreference,
  setProductIdentificationPref,
  setUserPreference
} from '@/adapter'
import { useUserProfile } from './useUserProfileStore'

export const useProductStore = defineStore('productStore', {
  state: () => ({
    productStores: [] as any[],
    current: null as any,
    statusDesc: [] as any[],
    settings: {
      productIdentifier: {
        productIdentificationPref: {
          primaryId: 'SKU',
          secondaryId: 'productId'
        },
        productIdentificationOptions: [] as any[],
        goodIdentificationOptions: [] as any[]
      }
    }
  }),

  getters: {
    getCurrentProductStore: (state) => state.current,
    getProductStores: (state) => state.productStores,
    getStatusDescriptions: (state) => state.statusDesc,

    // Shortcuts for productIdentifier nested object
    getProductIdentificationPref: (state) => state.settings.productIdentifier.productIdentificationPref,
    getProductIdentificationOptions: (state) => state.settings.productIdentifier.productIdentificationOptions,
    getGoodIdentificationOptions: (state) => state.settings.productIdentifier.goodIdentificationOptions,
    getPrimaryId: (state) => state.settings.productIdentifier.productIdentificationPref.primaryId || 'SKU',
    getSecondaryId: (state) => state.settings.productIdentifier.productIdentificationPref.secondaryId || 'productId'
  },

  actions: {
    /** ---------- Product Store Management ---------- */
    async loadStoresByFacility(facilityId: string) {
      try {
        const resp = await api({
          url: `inventory-cycle-count/facilities/${facilityId}/productStores`,
          method: 'GET'
        })
        if (!hasError(resp)) this.productStores = resp?.data
      } catch (err) {
        logger.error('Failed to load product stores', err)
      }
    },

    setCurrent(productStore: any) {
      this.current = productStore
    },

    async getDxpEComStoresByFacility(facilityId?: any) {
      const authStore = useAuthStore()
      try {
        const response = await getEComStoresByFacility(authStore.token.value, authStore.getBaseUrl, 100, facilityId)
        this.productStores = response
      } catch (error) {
        console.error(error)
      }
      return this.productStores
    },

    async getDxpEComStores() {
      const authStore = useAuthStore()
      try {
        const response = await getEComStores(authStore.token.value, authStore.getBaseUrl, 100)
        this.productStores = response
      } catch (error) {
        console.error(error)
      }
      return this.productStores
    },

    async getEComStorePreference(userPrefTypeId: any, userId = "") {
      const authStore = useAuthStore()
      if (!this.productStores.length) return

      let preferredStore = this.productStores[0]
      try {
        const preferredStoreId = await getUserPreference(authStore.token.value, authStore.getBaseUrl, userPrefTypeId, userId)
        if (preferredStoreId) {
          const store = this.productStores.find((store: any) => store.productStoreId === preferredStoreId)
          if (store) preferredStore = store
        }
      } catch (error) {
        console.error(error)
      }
      this.current = preferredStore
    },

    async setEComStorePreference(payload: any) {
      const userProfile = useUserProfile().getUserProfile
      try {
        await setUserPreference({
          userPrefTypeId: 'SELECTED_BRAND',
          userPrefValue: payload.productStoreId,
          userId: userProfile.userId
        })
      } catch (error) {
        console.error('error', error)
      }
      this.current = payload
    },

    /** ---------- Status Descriptions ---------- */
    setStatusDescriptions(statuses: any[]) {
      this.statusDesc = statuses || []
    },

    getStatusDescription(statusId: string): string {
      const found = this.statusDesc.find((s: any) => s.statusId === statusId)
      return found?.description || statusId
    },

    /** ---------- Product Identification Pref ---------- */
    async setDxpProductIdentificationPref(id: string, value: string, eComStoreId: string) {
      const productIdentificationPref = JSON.parse(
        JSON.stringify(this.getProductIdentificationPref)
      )
      if (!eComStoreId) {
        this.settings.productIdentifier.productIdentificationPref = productIdentificationPref
        return
      }

      productIdentificationPref[id] = value
      try {
        this.settings.productIdentifier.productIdentificationPref = await setProductIdentificationPref(
          eComStoreId,
          productIdentificationPref
        )
      } catch (err) {
        console.error('Failed to set identification pref:', err)
      }
    },

    async getDxpIdentificationPref(eComStoreId: string) {
      if (!eComStoreId) {
        this.settings.productIdentifier.productIdentificationPref = {
          primaryId: 'productId',
          secondaryId: ''
        }
        return
      }
      this.settings.productIdentifier.productIdentificationPref = await getProductIdentificationPref(eComStoreId)
    },

    async prepareProductIdentifierOptions() {
      const staticOptions = [
        { goodIdentificationTypeId: 'productId', description: 'Product ID' },
        { goodIdentificationTypeId: 'groupId', description: 'Group ID' },
        { goodIdentificationTypeId: 'groupName', description: 'Group Name' },
        { goodIdentificationTypeId: 'internalName', description: 'Internal Name' },
        { goodIdentificationTypeId: 'parentProductName', description: 'Parent Product Name' },
        { goodIdentificationTypeId: 'primaryProductCategoryName', description: 'Primary Product Category Name' },
        { goodIdentificationTypeId: 'title', description: 'Title' }
      ]

      const fetchedGoodIdentificationTypes = await fetchGoodIdentificationTypes('HC_GOOD_ID_TYPE')
      const fetchedOptions = fetchedGoodIdentificationTypes || []

      this.settings.productIdentifier.productIdentificationOptions = Array.from(
        new Set([...staticOptions, ...fetchedOptions])
      ) as any
      this.settings.productIdentifier.goodIdentificationOptions = fetchedOptions
    },

    /** ---------- ProductStoreSettings Functions ---------- */
    async getProductIdentifications(productStoreId: string) {
      try {
        const resp = await api({
          url: `admin/productStores/${productStoreId}/settings`,
          method: 'GET',
          params: { productStoreId, settingTypeEnumId: 'PRDT_IDEN_PREF' }
        })

        if (!hasError(resp) && resp?.data?.length) {
          const settings = JSON.parse(resp.data[0].settingValue)
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
    },

    async loadProductIdentifierSettings() {
      try {
        const productStoreId = this.current?.productStoreId
        if (!productStoreId) throw new Error('No current product store selected')

        const { primaryId, secondaryId } = await this.getProductIdentifications(productStoreId)
        this.settings.productIdentifier.productIdentificationPref = { primaryId, secondaryId }
        console.info('[useProductStore] Loaded product identifier settings for', productStoreId)
      } catch (err) {
        console.error('[useProductStore] Failed to load identifier settings:', err)
      }
    },

    async getProductIdentificationValue(productId: string, type: string): Promise<any> {
      if (!type || !productId) return undefined
      const productMaster = useProductMaster()
      try {
        const { product } = await productMaster.getById(productId)
        if (product) {
          const match = product.goodIdentifications?.find(
            (goodIdentification: any) => goodIdentification.type === type
          )
          if (match?.value) return match.value
        }
      } catch (err) {
        console.error(`[useProductStore] Failed to get identification for ${productId}/${type}`, err)
      }
    }
  },

  persist: true
})
