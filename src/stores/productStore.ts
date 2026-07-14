import { defineStore } from 'pinia'
import { api, client, commonUtil, logger, useEmbeddedAppStore } from '@common'
import { useProductMaster } from '@/composables/useProductMaster'
import { useUserProfile } from './userProfileStore'
import { translate } from '@common'

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
    /** ---------- Internal Helpers ---------- */
    async fetchGoodIdentificationTypes(parentTypeId = "HC_GOOD_ID_TYPE"): Promise <any>  {
      try {
        const resp: any = await api({
          url: "oms/goodIdentificationTypes",
          method: "get",
          params: { parentTypeId, pageSize: 50 }
        });
        return Promise.resolve(resp.data)
      } catch(error) {
        return Promise.reject({ code: 'error', message: 'Failed to fetch good identification types', serverResponse: error })
      }
    },

    async createProductIdentificationPref(productStoreId: string): Promise<any> {
      const prefValue = { primaryId: "productId", secondaryId: "" }
      try {
        await api({
          url: `admin/productStores/${productStoreId}/settings`,
          method: "POST",
          data: { productStoreId, settingTypeEnumId: "PRDT_IDEN_PREF", settingValue: JSON.stringify(prefValue) }
        });
      } catch(err) { console.error(err) }
      return prefValue;
    },

    async fetchProductIdentificationPref(productStoreId: any): Promise<any> {
      const productIdentifications = { primaryId: "productId", secondaryId: "" }
      try {
        const resp = await api({
          url: `admin/productStores/${productStoreId}/settings`,
          method: "GET",
          params: { productStoreId, settingTypeEnumId: "PRDT_IDEN_PREF" }
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
        return Promise.reject({ code: "error", message: "Failed to get product identification pref", serverResponse: error })
      }
      return productIdentifications;
    },

    async saveProductIdentificationPref(productStoreId: string, productIdentificationPref: any): Promise<any> {
      let resp = {} as any, isSettingExists = false;
      try {
        resp = await api({ url: `admin/productStores/${productStoreId}/settings`, method: "GET", params: { productStoreId, settingTypeEnumId: "PRDT_IDEN_PREF" } });
        if(resp.data[0]?.settingTypeEnumId) isSettingExists = true
      } catch(err) { console.error(err) }
      if(!isSettingExists) {
        return Promise.reject({ code: "error", message: "product store setting is missing", serverResponse: resp.data })
      }
      try {
        resp = await api({
          url: `admin/productStores/${productStoreId}/settings`, method: "POST",
          data: { productStoreId, settingTypeEnumId: "PRDT_IDEN_PREF", settingValue: JSON.stringify(productIdentificationPref) }
        });
        return Promise.resolve(productIdentificationPref)
      } catch(error) {
        return Promise.reject({ code: "error", message: "Failed to set product identification pref", serverResponse: error })
      }
    },

    async fetchUserFacilities() {
      const userStore = useUserProfile();
      const partyId = userStore.getUserProfile?.partyId;
      const isAdminUser = userStore.hasPermission("COMMON_ADMIN OR INV_COUNT_ADMIN");
      const facilityGroupId = "" //Not used in cycle count, just kept the logic consistent with other apps, if needed in future

      this.currentFacility = {
        ...this.currentFacility,
        productStores: []
      };

      let facilityIds: Array<string> = [];

      try {
        // 1. Fetch party-associated facilities for regular users
        if (partyId && !isAdminUser) {
          let partyResp: any;
          try {
            partyResp = await api({
              url: `admin/user/${partyId}/facilities`,
              method: "GET",
              params: { pageSize: 500 }
            } as any);
          } catch (error) {
            logger.error(error);
            throw new Error(translate("Failed to fetch user facilities."));
          }

          // Filter out expired associations
          const activePartyFacilities = partyResp.data.filter((facility: any) => !facility.thruDate);
          facilityIds = activePartyFacilities.map((facility: any) => facility.facilityId);

          if (!facilityIds.length) {
            throw new Error(translate("User is not associated with any facility."));
          }
        }

        // 2. Filter or Fetch Group-associated facilities (Fulfillment Group)
        if (facilityGroupId) {
          let groupFilters: any = {};
          if (facilityIds.length) {
            groupFilters = {
              facilityId: facilityIds.join(","),
              facilityId_op: "in",
              pageSize: facilityIds.length
            };
          }

          let groupResp: any;
          try {
            groupResp = await api({
              url: "oms/groupFacilities",
              method: "GET",
              params: {
                facilityGroupId,
                pageSize: 500,
                ...groupFilters
              }
            } as any);
          } catch (error) {
            logger.error(error);
            throw new Error(translate("Failed to fetch fulfillment group facilities."));
          }

          const activeGroupFacilities = groupResp.data.filter((facility: any) => !facility.thruDate);
          facilityIds = activeGroupFacilities.map((facility: any) => facility.facilityId);

          if (!facilityIds.length) {
            throw new Error(translate("No active facilities found in the fulfillment group."));
          }
        }

        // 3. Shopify POS Location filtering (if embedded in POS)
        const shopifyLocationId = useEmbeddedAppStore().getPosLocationId;
        if (commonUtil.isAppEmbedded() && shopifyLocationId) {
          let locationFacilityId: string | null = null;
          try {
            locationFacilityId = await this.fetchShopifyShopLocation({
              shopifyLocationId,
              pageSize: 1
            });
          } catch (error) {
            logger.error(error);
            throw new Error(translate("Failed to fetch user facilities for Shopify POS location."));
          }

          if (locationFacilityId) {
            facilityIds = facilityIds.filter((id: any) => id === locationFacilityId);
          } else {
            facilityIds = [];
          }

          if (!facilityIds.length) {
            throw new Error(translate("Failed to fetch user facilities for Shopify POS location."));
          }
        }

        // 4. Fetch the final details for resolved facilities
        let finalFilters: any = {};
        if (facilityIds.length) {
          finalFilters = {
            facilityId: facilityIds.join(","),
            facilityId_op: "in",
            pageSize: facilityIds.length
          };
        }

        let finalResp: any;
        try {
          finalResp = await api({
            url: "oms/facilities",
            method: "GET",
            params: {
              pageSize: 500,
              facilityTypeId: "VIRTUAL_FACILITY",
              facilityTypeId_not: "Y",
              parentTypeId: "VIRTUAL_FACILITY",
              parentTypeId_not: "Y",
              ...finalFilters
            }
          });
        } catch (error) {
          logger.error(error);
          throw new Error(translate("Failed to fetch user facilities."));
        }

        this.facilities = finalResp.data;
        this.setCurrentFacility(finalResp.data[0]);

      } catch (error: any) {
        return Promise.reject(error);
      }
    },

    async fetchProductStores() {
      try {
        const isAdminUser = useUserProfile().hasPermission("COMMON_ADMIN OR INV_COUNT_ADMIN");
        const pageSize = 200;
        let productStoreFilters: any = {};

        if (!isAdminUser) {
          const facilityId = this.currentFacility.facilityId;

          const resp = await api({
            url: `oms/facilities/${facilityId}/productStores`,
            method: "GET",
            params: {
              pageSize,
              facilityId
            }
          }) as any;

          const facilityProductStoreIds = resp.data
            .filter((store: any) => !store.thruDate)
            .map((store: any) => store.productStoreId);

          if (facilityProductStoreIds?.length) {
              productStoreFilters = {
                productStoreId: facilityProductStoreIds.join(","),
                productStoreId_op: "in"
              };
          }
        }

        const productStoresResp = await api({
          url: "oms/productStores",
          method: "GET",
          params: {
            pageSize,
            ...productStoreFilters
          }
        }) as any;

        const stores = productStoresResp.data;
        this.productStores = stores;
        if (stores?.length) {
          this.currentProductStore = stores[0]
        }
      } catch (error: any) {
        logger.error("error", error);
        return Promise.reject(new Error(error));
      }
    },

    async fetchShopifyShopLocation(payload: { shopifyLocationId: string, pageSize: number }): Promise<any> {
      try {
        const resp = await api({ url: "oms/shopifyShops/locations", method: "GET", params: payload }) as any;
        return Promise.resolve(resp.data[0]?.facilityId)
      } catch(error) {
        return Promise.reject({ code: "error", message: "Failed to fetch location information", serverResponse: error })
      }
    },

    setCurrent(productStore: any) {
      this.currentProductStore = productStore
    },

    async fetchProductStorePreference() {
      const userStore = useUserProfile();
      try {
        const preferredStoreResp = await api({
          url: "admin/user/preferences",
          method: "GET",
          params: {
            pageSize: 1,
            userId: userStore.current.userId,
            preferenceKey: "SELECTED_BRAND"
          },
        }) as any;
        const preferredStoreId = preferredStoreResp.data?.[0]?.preferenceValue
        if (preferredStoreId) {
          const store = this.currentFacility.productStores?.find((store: any) => store.productStoreId === preferredStoreId);
          if (store) {
            this.currentProductStore = store;
          }
        }
      } catch (err) {
        logger.error('Favourite product store not found', err)
      }
    },

    async setProductStorePreference(payload: any) {
      const userStore = useUserProfile();
      try {
        await api({
          url: "admin/user/preferences",
          method: "PUT",
          data: {
            userId: userStore.current.userId,
            preferenceKey: 'SELECTED_BRAND',
            preferenceValue: payload.productStoreId,
          }
        });
      } catch (error) {
        console.error('error', error)
      }
      this.currentProductStore = payload;
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
        this.settings.productIdentifier.productIdentificationPref = await this.saveProductIdentificationPref(
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
      this.settings.productIdentifier.productIdentificationPref = await this.fetchProductIdentificationPref(eComStoreId)
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
          url: `admin/productStores/${productStoreId}/settings`,
          method: 'GET',
          params: {
            settingTypeEnumId: ['INV_FORCE_SCAN', 'BARCODE_IDEN_PREF'],
            settingTypeEnumId_op: 'in',
            pageSize: 5
          }
        })

        if (!commonUtil.hasError(resp) && resp?.data?.length) {
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
          url: `admin/productStores/${productStoreId}/settings`,
          method: 'POST',
          data: {
            productStoreId,
            settingTypeEnumId: enumId,
            settingValue: value
          }
        })
        if (!commonUtil.hasError(resp)) {
          if (key === 'forceScan') this.settings.forceScan = value
          if (key === 'barcodeIdentificationPref') this.settings.productIdentifier.barcodeIdentificationPref = value
          commonUtil.showToast(translate('Store preference updated successfully.'))
        } else {
          throw resp
        }
      } catch (err) {
        commonUtil.showToast(translate('Failed to update Store preference.'))
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

        if (!commonUtil.hasError(resp) && resp?.data?.length) {
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

    setCurrentFacility(facility: any) {
      this.currentFacility = facility
    },

    async fetchFacilityPreference() {
      if (!this.facilities.length) return;
      let facilityId: string | undefined;
      try {
        const locationId = useEmbeddedAppStore().getPosLocationId;
        if (commonUtil.isAppEmbedded() && locationId) {
          facilityId = await this.fetchShopifyShopLocation({
            shopifyLocationId: locationId,
            pageSize: 1,
          });
          if (!facilityId) {
            throw new Error("Failed to fetch location information. Please contact the administrator.");
          }
        } else {
          const preferredFacilityResp = await api({
            url: "admin/user/preferences",
            method: "GET",
            params: {
              pageSize: 1,
              userId: useUserProfile().current.userId,
              preferenceKey: "SELECTED_FACILITY"
            },
          }) as any;
          facilityId = preferredFacilityResp.data?.[0]?.preferenceValue;
        }
        if (facilityId) {
          const facility = this.facilities.find((f: any) => f.facilityId === facilityId);
          if (!facility && commonUtil.isAppEmbedded() && locationId) {
            throw new Error(
              "User is not associated with this location. Please contact the administrator."
            );
          }
          if (facility) {
            this.setCurrentFacility(facility)
            return;
          }
        }
      } catch (error) {
        console.error("Failed to resolve facility preference:", error);
      }
      // In case app is not embedded and user has no facility preference on server
      this.currentFacility = this.facilities[0];
    },

    async setFacilityPreference(payload: any) {
      const userProfileStore = useUserProfile()
      const userProfile = userProfileStore.getUserProfile
      try {
        await userProfileStore.setUserPreference({
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
