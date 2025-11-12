import { defineStore } from 'pinia'
import api from '@/services/RemoteAPI';
import { hasError } from '@/stores/useAuthStore';
import logger from '@/logger'
import { useAuthStore } from './useAuthStore';
import { fetchGoodIdentificationTypes, getEComStores, getEComStoresByFacility, getProductIdentificationPref, getUserPreference, setProductIdentificationPref, setUserPreference } from '@/adapter';
import { useUserProfileNew } from './useUserProfile';

export const useProductStore = defineStore('productStore', {
  state: () => ({
    productStores: [] as any[],
    current: null as any,
    statusDesc: [] as any[],
    productIdentificationPref: {
      primaryId: '',
      secondaryId: ''
    },
    productIdentificationOptions: [],
    goodIdentificationOptions: []
  }),
  getters: {
    getCurrentProductStore: (state) => state.current,
    getProductStores: (state) => state.productStores,
    getStatusDescriptions: (state) => state.statusDesc,
    getProductIdentificationPref: (state) => state.productIdentificationPref,
    getProductIdentificationOptions: (state) => state.productIdentificationOptions,
    getGoodIdentificationOptions: (state) => state.goodIdentificationOptions
  },
  actions: {
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
    // ECom store api calls - fetch stores by facility & get/set user store preferences
    async getDxpEComStoresByFacility(facilityId?: any) {
      const authStore = useAuthStore();
    
      try {
        const response = await getEComStoresByFacility(authStore.token.value, authStore.getBaseUrl, 100, facilityId);
        this.productStores = response;
      } catch (error) {
        console.error(error);
      }
      return this.productStores
    },
    async getDxpEComStores() {
      const authStore = useAuthStore();
    
      try {
        const response = await getEComStores(authStore.token.value, authStore.getBaseUrl, 100);
        this.productStores = response;
      } catch (error) {
        console.error(error);
      }
      return this.productStores
    },
    async getEComStorePreference(userPrefTypeId: any, userId = "") {
      const authStore = useAuthStore();

      if(!this.productStores.length) {
        return;
      }
      let preferredStore = this.productStores[0];
      try {
        const preferredStoreId = await getUserPreference(authStore.token.value, authStore.getBaseUrl, userPrefTypeId, userId);

        if(preferredStoreId) {
          const store = this.productStores.find((store: any) => store.productStoreId === preferredStoreId);
          store && (preferredStore = store)
        }
      } catch (error) {
        console.error(error);
      }
      this.current = preferredStore;
    },
    async setEComStorePreference(payload: any) {
    //   const appState = appContext.config.globalProperties.$store;
      const userProfile = useUserProfileNew().getUserProfile;

      try {
        await setUserPreference({
          userPrefTypeId: 'SELECTED_BRAND',
          userPrefValue: payload.productStoreId,
          userId: userProfile.userId
        }) 
      } catch (error) {
        console.error('error', error)
      }
      this.current = payload;
    },
    setStatusDescriptions(statuses: any[]) {
      this.statusDesc = statuses || [];
    },
    getStatusDescription(statusId: string): string {
      const found = this.statusDesc.find((s: any) => s.statusId === statusId);
      return found?.description || statusId;
    },
    async setDxpProductIdentificationPref(id: string, value: string, eComStoreId: string) {
      const productIdentificationPref = JSON.parse(JSON.stringify(this.getProductIdentificationPref))

      // When eComStoreId is not available then make the values change to what selected previously
      if(!eComStoreId) {
        this.productIdentificationPref = productIdentificationPref
        return;
      }

      productIdentificationPref[id] = value

      try {
        this.productIdentificationPref = await setProductIdentificationPref(eComStoreId, productIdentificationPref)
      } catch(err) {
        // TODO: display a toast message in failed scenario
        console.error('error', err)
      }
    },
    async getDxpIdentificationPref(eComStoreId: string) {
      // when selecting none as ecom store, not fetching the pref as it returns all the entries with the pref id
      if(!eComStoreId) {
        return this.productIdentificationPref = {
          primaryId: 'productId',
          secondaryId: ''
        };
      }

      this.productIdentificationPref = await getProductIdentificationPref(eComStoreId)
    },
    async prepareProductIdentifierOptions() {
      //static identifications 
      const productIdentificationOptions = [
        { goodIdentificationTypeId: "productId", description: "Product ID" },
        { goodIdentificationTypeId: "groupId", description: "Group ID" },
        { goodIdentificationTypeId: "groupName", description: "Group Name" },
        { goodIdentificationTypeId: "internalName", description: "Internal Name" },
        { goodIdentificationTypeId: "parentProductName", description: "Parent Product Name" },
        { goodIdentificationTypeId: "primaryProductCategoryName", description: "Primary Product Category Name" },
        { goodIdentificationTypeId: "title", description: "Title" }
      ]
      //good identification types
      const fetchedGoodIdentificationTypes = await fetchGoodIdentificationTypes("HC_GOOD_ID_TYPE");
      const fetchedGoodIdentificationOptions = fetchedGoodIdentificationTypes || []
      // Merge the arrays and remove duplicates
      this.productIdentificationOptions = Array.from(new Set([...productIdentificationOptions, ...fetchedGoodIdentificationOptions])).sort() as any;
      this.goodIdentificationOptions = fetchedGoodIdentificationOptions
    }
  },
  persist: true,
})
