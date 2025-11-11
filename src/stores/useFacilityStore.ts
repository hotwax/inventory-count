import { defineStore } from 'pinia'
import api from '@/services/RemoteAPI';
import { hasError } from '@/stores/auth'
import logger from '@/logger'
import { useAuthStore } from './auth';
import { getUserFacilities, getUserPreference, setUserPreference } from '@/adapter';
import { useUserProfileNew } from './useUserProfile';

export const useFacilityStore = defineStore('facilityStore', {
  state: () => ({
    facilities: [] as any[],
    current: null as any
  }),
  getters: {
    getFacilities: (state) => state.facilities,
    getCurrentFacility: (state) => state.current
  },
  persist: true,
  actions: {
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

    setCurrent(facility: any) {
      this.current = facility
    },
    // Facility api calls - retrieve user facilities & get/set preferred facility
    async getDxpUserFacilities(partyId: any, facilityGroupId: any, isAdminUser: boolean, payload = {}) {
      const authStore = useAuthStore();

      try {
        const response = await getUserFacilities(authStore.token.value, authStore.getBaseUrl, partyId, facilityGroupId, isAdminUser, payload);
        this.facilities = response;
      } catch (error) {
        console.error(error);
      }
      return this.facilities
    },
    async getFacilityPreference(userPrefTypeId: any, userId = "") {
      const authStore = useAuthStore();

      if (!this.facilities.length) {
        return;
      }
      let preferredFacility = this.facilities[0];
   
      try {
        const preferredFacilityId = await getUserPreference(authStore.token.value, authStore.getBaseUrl, userPrefTypeId, userId);
        if(preferredFacilityId) {
          const facility = this.facilities.find((facility: any) => facility.facilityId === preferredFacilityId);
          facility && (preferredFacility = facility)
        }
      } catch (error) {
        console.error(error);
      }
      this.current = preferredFacility;
    },
    async setFacilityPreference(payload: any) {
    //   const appState = store.config.globalProperties.$store;
      const userProfile = useUserProfileNew().getUserProfile;

      try {
        await setUserPreference({
          userPrefTypeId: 'SELECTED_FACILITY',
          userPrefValue: payload.facilityId,
          userId: userProfile.userId
        }) 
      } catch (error) {
        console.error('error', error)
      }
      this.current = payload;
    },
  }
})