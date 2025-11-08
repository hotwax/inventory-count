import { defineStore } from "pinia";
import { DateTime } from "luxon";
import { showToast } from "@/utils";
import store from "@/store";
import { useAuthStore } from "@/stores/auth";
import { getAvailableTimeZones, getUserFacilities, getUserPreference, setUserPreference, setUserTimeZone, getEComStores, getEComStoresByFacility } from "@/adapter";
import { translate } from "@/i18n";
import i18n from '@/i18n'

declare let process: any;

export const useUserStore = defineStore('user', {
  state: () => {
    return {
      eComStores: [],
      currentEComStore: {} as any,
      localeOptions: process.env.VUE_APP_LOCALES ? JSON.parse(process.env.VUE_APP_LOCALES) : { "en-US": "English" },
      locale: 'en-US',
      currentTimeZoneId: '',
      timeZones: [],
      facilities: [],
      currentFacility: {} as any
    }
  },
  getters: {
    getLocale: (state) => state.locale,
    getLocaleOptions: (state) => state.localeOptions,
    getTimeZones: (state) => state.timeZones,
    getCurrentTimeZone: (state) => state.currentTimeZoneId,
    getFacilities: (state) => state.facilities,
    getCurrentFacility: (state) => state.currentFacility,
    getProductStores: (state) => state.eComStores,
    getCurrentEComStore: (state) => state.currentEComStore,
  },
  actions: {
    async setLocale(locale: string) {
      let newLocale, matchingLocale
      newLocale = this.locale
      // handling if locale is not coming from userProfile
      try {
        // const appState = appContext.config.globalProperties.$store;
        const userProfile = store.getters['user/getUserProfile']
        if (locale) {
          matchingLocale = Object.keys(this.localeOptions).find((option: string) => option === locale)
          // If exact locale is not found, try to match the first two characters i.e primary code
          matchingLocale = matchingLocale || Object.keys(this.localeOptions).find((option: string) => option.slice(0, 2) === locale.slice(0, 2))
          newLocale = matchingLocale || this.locale
          // update locale in state and globally
        //   if(userContext.setUserLocale) await userContext.setUserLocale({ userId: userProfile.userId, newLocale })
        }
      } catch (error) {
        console.error(error)
      } finally {
        i18n.global.locale = newLocale
        this.locale = newLocale
      }
    },
    async setDxpUserTimeZone(tzId: string) {
      // Do not make any api call if the user clicks the same timeZone again that is already selected
      if(this.currentTimeZoneId === tzId) {
        return;
      }

      try {
        // const appState = appContext.config.globalProperties.$store;
        const userProfile = store.getters['user/getUserProfile']

        await setUserTimeZone({ userId: userProfile.userId, tzId })
        this.currentTimeZoneId = tzId

        showToast(translate("Time zone updated successfully"));
        return Promise.resolve(tzId)
      } catch(err) {
        console.error('Error', err)
        return Promise.reject('')
      }
    },
    async getDxpAvailableTimeZones() {
      // Do not fetch timeZones information, if already available
      if(this.timeZones.length) {
        return;
      }

      try {
        // const resp = await userContext.getAvailableTimeZones()
        const resp = await getAvailableTimeZones();
        this.timeZones = resp.filter((timeZone: any) => DateTime.local().setZone(timeZone.id).isValid);
      } catch(err) {
        console.error('Error', err)
      }
    },
    updateTimeZone(tzId: string) {
      this.currentTimeZoneId = tzId
    },
    // Facility api calls - retrieve user facilities & get/set preferred facility
    async getDxpUserFacilities(partyId: any, facilityGroupId: any, isAdminUser: boolean, payload = {}) {
      const authStore = useAuthStore();

      console.log("Auth Store: ", authStore);

      try {
        const response = await getUserFacilities(authStore.token.value, authStore.getOmsRedirectionUrl, partyId, facilityGroupId, isAdminUser, payload);
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
        const preferredFacilityId = await getUserPreference(authStore.token.value, authStore.getOmsRedirectionUrl, userPrefTypeId, userId);
        if(preferredFacilityId) {
          const facility = this.facilities.find((facility: any) => facility.facilityId === preferredFacilityId);
          facility && (preferredFacility = facility)
        }
      } catch (error) {
        console.error(error);
      }
      this.currentFacility = preferredFacility;
    },
    async setFacilityPreference(payload: any) {
    //   const appState = store.config.globalProperties.$store;
      const userProfile = store.getters['user/getUserProfile']

      try {
        await setUserPreference({
          userPrefTypeId: 'SELECTED_FACILITY',
          userPrefValue: payload.facilityId,
          userId: userProfile.userId
        }) 
      } catch (error) {
        console.error('error', error)
      }
      this.currentFacility = payload;
    },
    // ECom store api calls - fetch stores by facility & get/set user store preferences
    async getDxpEComStoresByFacility(facilityId?: any) {
      const authStore = useAuthStore();
    
      try {
        const response = await getEComStoresByFacility(authStore.token.value, authStore.getBaseUrl, 100, facilityId);
        this.eComStores = response;
      } catch (error) {
        console.error(error);
      }
      return this.eComStores
    },
    async getDxpEComStores() {
      const authStore = useAuthStore();
    
      try {
        const response = await getEComStores(authStore.token.value, authStore.getOmsRedirectionUrl, 100);
        this.eComStores = response;
      } catch (error) {
        console.error(error);
      }
      return this.eComStores
    },
    async getEComStorePreference(userPrefTypeId: any, userId = "") {
      const authStore = useAuthStore();

      if(!this.eComStores.length) {
        return;
      }
      let preferredStore = this.eComStores[0];
      try {
        const preferredStoreId = await getUserPreference(authStore.token.value, authStore.getOmsRedirectionUrl, userPrefTypeId, userId);

        if(preferredStoreId) {
          const store = this.eComStores.find((store: any) => store.productStoreId === preferredStoreId);
          store && (preferredStore = store)
        }
      } catch (error) {
        console.error(error);
      }
      this.currentEComStore = preferredStore;
    },
    async setEComStorePreference(payload: any) {
    //   const appState = appContext.config.globalProperties.$store;
      const userProfile = store.getters['user/getUserProfile']

      try {
        await setUserPreference({
          userPrefTypeId: 'SELECTED_BRAND',
          userPrefValue: payload.productStoreId,
          userId: userProfile.userId
        }) 
      } catch (error) {
        console.error('error', error)
      }
      this.currentEComStore = payload;
    }
  },
  persist: true
})