import { defineStore } from 'pinia'
import api from '@/services/RemoteAPI';
import { hasError } from '@/stores/useAuthStore';
import logger from '@/logger'
import { useAuthStore } from './useAuthStore';
import { getEComStores, getEComStoresByFacility, getUserPreference, setUserPreference } from '@/adapter';
import { useUserProfileNew } from './useUserProfile';

export const useProductStore = defineStore('productStore', {
  state: () => ({
    productStores: [] as any[],
    current: null as any,
    statusDesc: [] as any[]
  }),
  getters: {
    getCurrentProductStore: (state) => state.current,
    getProductStores: (state) => state.productStores,
    getStatusDescriptions: (state) => state.statusDesc
  },
  persist: true,

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
    }
  }
})
