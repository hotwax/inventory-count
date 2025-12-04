import { defineStore } from 'pinia'
import api from '@/services/remoteAPI'
import { hasError } from '@/stores/authStore'
import logger from '@/logger'
import { useAuthStore } from './authStore'
import { useProductMaster } from '@/composables/useProductMaster'
import {
  fetchGoodIdentificationTypes,
  getEComStores,
  getEComStoresByFacility,
  getProductIdentificationPref,
  getUserPreference,
  setProductIdentificationPref,
  setUserPreference,
  getUserFacilities
} from '@/adapter'
import { useUserProfile } from './userProfileStore'
import { showToast } from '@/services/uiUtils';
import { translate } from '@/i18n'

export const useProductStore = defineStore('productStore', {
  state: () => ({
    productStores: [] as any[],
    currentProductStore: null as any,
    statusDesc: [] as any[],
    facilities: [] as any[],
    currentFacility: null as any,
    settings: {
      forceScan: false,
      showQoh: false,
      productIdentifier: {
        productIdentificationPref: {
          primaryId: 'SKU',
          secondaryId: 'productId'
        },
        productIdentificationOptions: [] as any[],
        goodIdentificationOptions: [] as any[],
        barcodeIdentificationPref: ''
      }
    } as any
  }),

  getters: {
    getCurrentProductStore: (state) => state.currentProductStore,
    getProductStores: (state) => state.productStores,
    getStatusDescriptions: (state) => state.statusDesc,
    getStatusDescription: (state) => (statusId: string) => {
      const found = state.statusDesc.find((status: any) => status.statusId === statusId)
      return found?.description || statusId
    },

    getFacilities: (state) => state.facilities,
    getCurrentFacility: (state) => state.currentFacility,

    getProductStoreSettings: (state) => state.settings,
    getForceScan: (state) => state.settings.forceScan,
    getShowQoh: (state) => state.settings.showQoh,
    getBarcodeIdentificationPref: (state) => state.settings.productIdentifier.barcodeIdentificationPref,

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
      this.currentProductStore = productStore
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
      this.currentProductStore = preferredStore
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
      this.currentProductStore = payload
    },

    /** ---------- Status Descriptions ---------- */
    setStatusDescriptions(statuses: any[]) {
      this.statusDesc = statuses || []
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

    async getSettings(productStoreId: string) {
      try {
        const resp = await api({
          url: `inventory-cycle-count/productStores/${productStoreId}/settings`,
          method: 'GET',
          params: {
            settingTypeEnumId: ['INV_FORCE_SCAN', 'INV_CNT_VIEW_QOH', 'BARCODE_IDEN_PREF'],
            settingTypeEnumId_op: 'in',
            pageSize: 5
          }
        })

        if (!hasError(resp) && resp?.data?.length) {
          const parsedSettings = resp.data.reduce((acc: any, setting: any) => {
            const keyMap: Record<string, string> = {
              INV_FORCE_SCAN: 'forceScan',
              INV_CNT_VIEW_QOH: 'showQoh',
              BARCODE_IDEN_PREF: 'barcodeIdentificationPref'
            }
            const key = keyMap[setting.settingTypeEnumId]
            if (key === 'forceScan') acc.forceScan = JSON.parse(setting.settingValue)
            if (key === 'showQoh') acc.showQoh = JSON.parse(setting.settingValue)  
            if (key === 'barcodeIdentificationPref') acc.productIdentifier.barcodeIdentificationPref = setting.settingValue
            return acc
          }, this.settings)
          this.settings = parsedSettings
        }
      } catch (err) {
        logger.error('Failed to load product store settings', err)
      }
    },

    async setProductStoreSetting(key: string, value: any, productStoreId: string) {
      const keyToEnum: Record<string, string> = {
        forceScan: 'INV_FORCE_SCAN',
        showQoh: 'INV_CNT_VIEW_QOH',
        barcodeIdentificationPref: 'BARCODE_IDEN_PREF'
      }
      const enumId = keyToEnum[key]
      if (!enumId) return

      try {
        const resp = await api({
          url: `inventory-cycle-count/productStores/${productStoreId}/settings`,
          method: 'POST',
          data: {
            productStoreId,
            settingTypeEnumId: enumId,
            settingValue: value
          }
        })
        if (!hasError(resp)) {
          if (key === 'forceScan') this.settings.forceScan = value
          if (key === 'showQoh') this.settings.showQoh = value
          if (key === 'barcodeIdentificationPref') this.settings.productIdentifier.barcodeIdentificationPref = value
          showToast(translate('Store preference updated successfully.'))
        } else {
          throw resp
        }
      } catch (err) {
        showToast(translate('Failed to update Store preference.'))
        logger.error(err)
      }
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

    async getProductIdentifierSettings() {
      try {
        const productStoreId = this.currentProductStore?.productStoreId
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
          const matchedValue = (type === 'internalName') ? product.internalName : product.goodIdentifications?.find(
            (goodIdentification: any) => goodIdentification.type === type
          )?.value
          if (matchedValue) return matchedValue
        }
      } catch (err) {
        console.error(`[useProductStore] Failed to get identification for ${productId}/${type}`, err)
      }
    },

    /** Facility specific functions */
    async loadUserFacilities(partyId: string) {
      try {
        const resp = await api({
          url: `inventory-cycle-count/users/${partyId}/facilities`,
          method: 'GET'
        })
        if (!hasError(resp)) this.facilities = resp?.data
      } catch (err) {
        logger.error('Failed to load facilities', err)
      }
    },

    async getDxpUserFacilities(partyId: string, facilityGroupId: string, isAdminUser: boolean, payload = {}) {
      const authStore = useAuthStore()
      try {
        const response = await getUserFacilities(authStore.token.value, authStore.getBaseUrl, partyId, facilityGroupId, isAdminUser, payload)
        this.facilities = response
      } catch (error) {
        console.error('Failed to fetch user facilities:', error)
      }
      return this.facilities
    },

    setCurrentFacility(facility: any) {
      this.currentFacility = facility
    },

    async getFacilityPreference(userPrefTypeId: string, userId = '') {
      const authStore = useAuthStore()
      if (!this.facilities.length) return

      let preferredFacility = this.facilities[0]
      try {
        const preferredFacilityId = await getUserPreference(authStore.token.value, authStore.getBaseUrl, userPrefTypeId, userId)
        if (preferredFacilityId) {
          const facility = this.facilities.find((facility: any) => facility.facilityId === preferredFacilityId)
          if (facility) preferredFacility = facility
        }
      } catch (error) {
        console.error('Failed to fetch facility preference', error)
      }
      this.currentFacility = preferredFacility
    },

    async setFacilityPreference(payload: any) {
      const userProfile = useUserProfile().getUserProfile
      try {
        await setUserPreference({
          userPrefTypeId: 'SELECTED_FACILITY',
          userPrefValue: payload.facilityId,
          userId: userProfile.userId
        })
        this.currentFacility = payload
      } catch (error) {
        console.error('Failed to set facility preference', error)
      }
    },
  },

  persist: true
})
