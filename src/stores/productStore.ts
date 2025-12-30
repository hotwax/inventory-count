import { defineStore } from 'pinia'
import api from '@/services/RemoteAPI'
import { hasError } from '@/stores/authStore'
import logger from '@/logger'
import { useProductMaster } from '@/composables/useProductMaster'
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
      try {
        const response = await this.getEComStoresByFacility(100, facilityId)
        this.productStores = response
      } catch (error) {
        console.error(error)
      }
      return this.productStores
    },

    async getDxpEComStores() {
      try {
        const response = await this.getEComStores(100)
        this.productStores = response
      } catch (error) {
        console.error(error)
      }
      return this.productStores
    },

    async getEComStorePreference(userPrefTypeId: any) {
      if (!this.productStores.length) return

      let preferredStore = this.productStores[0]
      try {
        const preferredStoreId = await useUserProfile().getUserPreference(userPrefTypeId)
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
      try {
        await useUserProfile().updateUserPreference({
          userPrefTypeId: 'SELECTED_BRAND',
          userPrefValue: payload.productStoreId,
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
        this.settings.productIdentifier.productIdentificationPref = await this.setProductIdentificationPref(
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
      this.settings.productIdentifier.productIdentificationPref = await this.getProductIdentificationPreference(eComStoreId)
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

      const fetchedGoodIdentificationTypes = await this.fetchGoodIdentificationTypes('HC_GOOD_ID_TYPE')
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
            settingTypeEnumId: ['INV_FORCE_SCAN', 'BARCODE_IDEN_PREF'],
            settingTypeEnumId_op: 'in',
            pageSize: 5
          }
        })

        if (!hasError(resp) && resp?.data?.length) {
          const parsedSettings = resp.data.reduce((acc: any, setting: any) => {
            const keyMap: Record<string, string> = {
              INV_FORCE_SCAN: 'forceScan',
              BARCODE_IDEN_PREF: 'barcodeIdentificationPref'
            }
            const key = keyMap[setting.settingTypeEnumId]
            if (key === 'forceScan') acc.forceScan = JSON.parse(setting.settingValue)
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
      try {
        const response = await this.getUserFacilities(partyId, facilityGroupId, isAdminUser, payload)
        this.facilities = response
      } catch (error) {
        console.error('Failed to fetch user facilities:', error)
      }
      return this.facilities
    },

    setCurrentFacility(facility: any) {
      this.currentFacility = facility
    },

    async getFacilityPreference(userPrefTypeId: string) {
      if (!this.facilities.length) return

      let preferredFacility = this.facilities[0]
      try {
        const preferredFacilityId = await useUserProfile().getUserPreference(userPrefTypeId)
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
      try {
        await useUserProfile().updateUserPreference({
          userPrefTypeId: 'SELECTED_FACILITY',
          userPrefValue: payload.facilityId,
        })
        this.currentFacility = payload
      } catch (error) {
        console.error('Failed to set facility preference', error)
      }
    },

    async fetchGoodIdentificationTypes(parentTypeId = "HC_GOOD_ID_TYPE"): Promise <any> {
      try {
        const resp: any = await api({
          url: "oms/goodIdentificationTypes",
          method: "get",
          params: {
            parentTypeId,
            pageSize: 50
          }
        });
    
        return Promise.resolve(resp.data)
      } catch(error) {
        return Promise.reject({
          code: 'error',
          message: 'Failed to fetch good identification types',
          serverResponse: error
        })
      }
    },
    async getUserFacilities(partyId: string, facilityGroupId: any, isAdminUser = false, payload = {}) {
      return await this.fetchFacilities(partyId, facilityGroupId, isAdminUser, payload)
    },

    async fetchFacilities(partyId: string, facilityGroupId: string, isAdminUser: boolean, payload: any): Promise <any> {
      let facilityIds: Array<string> = [];
      let filters: any = {};
      let resp = {} as any

      // Fetch the facilities associated with party
      if(partyId) {
        try {
          resp = await this.fetchFacilitiesByParty(partyId)

          facilityIds = resp.map((facility: any) => facility.facilityId);
          if (!facilityIds.length) {
            return Promise.reject({
              code: 'error',
              message: 'Failed to fetch user facilities',
              serverResponse: resp.data
            })
          }
        } catch(error) {
          return Promise.reject({
            code: 'error',
            message: 'Failed to fetch user facilities',
            serverResponse: error
          })
        }
      }

      // Fetch the facilities associated with group
      if(facilityGroupId) {
        try {
          resp = await this.fetchFacilitiesByGroup(facilityGroupId, filters)

          facilityIds = resp.map((facility: any) => facility.facilityId);
          if (!facilityIds.length) {
            return Promise.reject({
              code: 'error',
              message: 'Failed to fetch user facilities',
              serverResponse: resp.data
            })
          }
        } catch(error) {
          return Promise.reject({
            code: 'error',
            message: 'Failed to fetch user facilities',
            serverResponse: error
          })
        }
      }

      if(facilityIds.length) {
        filters = {
          facilityId: facilityIds.join(","),
          facilityId_op: "in",
          pageSize: facilityIds.length
        }
      }

      const params = {
        url: "oms/facilities",
        method: "GET",
        params: {
          pageSize: 500,
          ...payload,
          ...filters
        }
      }

      let facilities: Array<any> = []

      try {
        resp = await api(params);
        facilities = resp.data
      } catch(error) {
        return Promise.reject({
          code: "error",
          message: "Failed to fetch facilities",
          serverResponse: error
        })
      }

      return Promise.resolve(facilities)
    },

    async fetchFacilitiesByGroup(facilityGroupId: string, payload?: any): Promise <any> {
      const params = {
        url: "oms/groupFacilities",
        method: "GET",
        params: {
          facilityGroupId,
          pageSize: 500,
          ...payload
        }
      }
    
      let resp = {} as any;
    
      try {
        resp = await api(params);    
        // Filtering facilities on which thruDate is set, as we are unable to pass thruDate check in the api payload
        // Considering that the facilities will always have a thruDate of the past.
        const facilities = resp.data.filter((facility: any) => !facility.thruDate)
        return Promise.resolve(facilities)
      } catch(error) {
        return Promise.reject({
          code: "error",
          message: "Failed to fetch facilities for group",
          serverResponse: error
        })
      }
    },
    
    async fetchFacilitiesByParty(partyId: string, payload?: any): Promise <Array<any> | Response> {
      const params = {
        url: `inventory-cycle-count/user/${partyId}/facilities`,
        method: "GET",
        params: {
          ...payload,
          pageSize: 500
        }
      }
    
      let resp = {} as any;
    
      try {
        resp = await api(params);    
        // Filtering facilities on which thruDate is set, as we are unable to pass thruDate check in the api payload
        // Considering that the facilities will always have a thruDate of the past.
        const facilities = resp.data.filter((facility: any) => !facility.thruDate)
        return Promise.resolve(facilities)
      } catch(error) {
        return Promise.reject({
          code: "error",
          message: "Failed to fetch user associated facilities",
          serverResponse: error
        })
      }
    },

    async getEComStores(pageSize = 100): Promise <any> {
      const params = {
        url: "oms/productStores",
        method: "GET",
        params: {
          pageSize
        }
      }

      let resp = {} as any;
      let stores: Array<any> = []

      try {
        resp = await api(params);

        stores = resp.data
      } catch(error) {
        return Promise.reject({
          code: "error",
          message: "Failed to fetch product stores",
          serverResponse: error
        })
      }

      return Promise.resolve(stores)
    },

    async getEComStoresByFacility(pageSize = 100, facilityId?: any): Promise <any> {
      const params = {
        url: `oms/facilities/${facilityId}/productStores`,
        method: "GET",
        params: {
          pageSize,
          facilityId
        }
      }

      let resp = {} as any;
      let stores: Array<any> = []

      try {
        resp = await api(params);

        // Filtering stores on which thruDate is set, as we are unable to pass thruDate check in the api payload
        // Considering that the stores will always have a thruDate of the past.
        stores = resp.data.filter((store: any) => !store.thruDate)
      } catch(error) {
        return Promise.reject({
          code: "error",
          message: "Failed to fetch facility associated product stores",
          serverResponse: error
        })
      }

      if(!stores.length) return Promise.resolve(stores)

      // Fetching all stores for the store name
      const productStoresMap = {} as any;
      try {
        const productStores = await this.getEComStores(200);
        productStores.map((store: any) => productStoresMap[store.productStoreId] = store.storeName)
      } catch(error) {
        console.error(error);
      }

      stores.map((store: any) => store.storeName = productStoresMap[store.productStoreId])
      return Promise.resolve(stores)
    },

    async getProductIdentificationPreference(productStoreId: any): Promise<any> {
      const productIdentifications = {
        primaryId: "productId",
        secondaryId: ""
      }

      try {
        const resp = await api({
          url: `oms/productStores/${productStoreId}/settings`,
          method: "GET",
          params: {
            productStoreId,
            settingTypeEnumId: "PRDT_IDEN_PREF"
          }
        }) as any;

        const settings = resp.data
        if(settings[0]?.settingValue) {
          const respValue = JSON.parse(settings[0].settingValue)
          productIdentifications['primaryId'] = respValue['primaryId']
          productIdentifications['secondaryId'] = respValue['secondaryId']
        } else {
          await this.createProductIdentificationPref(productStoreId)
        }
      } catch(error: any) {
        return Promise.reject({
          code: "error",
          message: "Failed to get product identification pref",
          serverResponse: error
        })
      }

      return productIdentifications;
    },

    async createProductIdentificationPref(productStoreId: string): Promise<any> {
      const prefValue = {
        primaryId: "productId",
        secondaryId: ""
      }

      try {
        await api({
          url: `oms/productStores/${productStoreId}/settings`,
          method: "POST",
          data: {
            productStoreId,
            settingTypeEnumId: "PRDT_IDEN_PREF",
            settingValue: JSON.stringify(prefValue)
          }
        });
      } catch(err) {
        console.error(err)
      }

      // not checking for resp success and fail case as every time we need to update the state with the
      // default value when creating a pref
      return prefValue;
    },

    async setProductIdentificationPref(productStoreId: string, productIdentificationPref: any): Promise<any> {
      let resp = {} as any, isSettingExists = false;

      try {
        resp = await api({
          url: `oms/productStores/${productStoreId}/settings`,
          method: "GET",
          params: {
            productStoreId,
            settingTypeEnumId: "PRDT_IDEN_PREF"
          }
        });

        if(resp.data[0]?.settingTypeEnumId) isSettingExists = true
      } catch(err) {
        console.error(err)
      }

      if(!isSettingExists) {
        return Promise.reject({
          code: "error",
          message: "product store setting is missing",
          serverResponse: resp.data
        })
      }

      try {
        resp = await api({
          url: `oms/productStores/${productStoreId}/settings`,
          method: "POST",
          data: {
            productStoreId,
            settingTypeEnumId: "PRDT_IDEN_PREF",
            settingValue: JSON.stringify(productIdentificationPref)
          }
        });

        return Promise.resolve(productIdentificationPref)
      } catch(error) {
        return Promise.reject({
          code: "error",
          message: "Failed to set product identification pref",
          serverResponse: error
        })
      }
    }
  },

  persist: true
})
