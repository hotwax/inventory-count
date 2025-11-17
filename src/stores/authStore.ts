import { defineStore } from 'pinia';
import { DateTime } from 'luxon';
import { useUserProfile } from './userProfileStore';
import { getServerPermissionsFromRules, prepareAppPermissions, setPermissions } from '@/authorization';
import logger from '@/logger';
import { showToast } from '@/services/uiUtils';
import { translate } from '@/i18n';
import { useInventoryCountRun } from '@/composables/useInventoryCountRun';
import { useProductStore } from './productStore';

export interface LoginPayload {
  token: any;
  oms: any;
  omsRedirectionUrl: any;
  expirationTime: any;
}

type TokenState = {
  value: string;
  expiration?: number;
};

export const hasError = (response: any): boolean => {
  const data = response?.data ?? response;
  if (!data || typeof data !== 'object') return false;
  if (typeof data._ERROR_MESSAGE_ === 'string' && data._ERROR_MESSAGE_.length) {
    return true;
  }
  if (
    Array.isArray(data._ERROR_MESSAGE_LIST_) &&
    data._ERROR_MESSAGE_LIST_.length > 0
  ) {
    return true;
  }
  return false;
};

export const useAuthStore = defineStore('authStore', {
  state: () => ({
    current: null as any,
    oms: '',
    omsRedirectionUrl: '',
    token: {
      value: '',
      expiration: undefined,
    } as TokenState,
  }),
  getters: {
    isAuthenticated: (state) => {
      let isTokenExpired = false;
      if (state.token.expiration) {
        const currTime = DateTime.now().toMillis();
        isTokenExpired = state.token.expiration < currTime;
      }
      return !!(state.token.value && !isTokenExpired);
    },
    getOMS: (state) => state.oms,
    getOmsRedirectionUrl: (state) => {
      const baseURL = state.omsRedirectionUrl;
      if (baseURL) return baseURL.startsWith('http') ? baseURL.includes('/api') ? baseURL : `${baseURL}/api/` : `https://${baseURL}.hotwax.io/api/`;
      return ""
    },
    getBaseUrl: (state) => {
      const baseURL = state.oms
      if (baseURL) return baseURL.startsWith('http') ? baseURL.includes('/rest/s1') ? baseURL : `${baseURL}/rest/s1/` : `https://${baseURL}.hotwax.io/rest/s1/`;
      return "";
    },
  },
  actions: {
    setOMS(oms: string) {
      this.oms = oms;
    },
    setOmsRedirectionUrl(url: string) {
      this.omsRedirectionUrl = url;
    },
    checkAuthenticated() {
      const { value, expiration } = this.token;
      if (!value) return false;
      if (expiration && expiration < DateTime.now().toMillis()) return false;
      return true;
    },
    async login(payload: LoginPayload) {
      try {
        this.setOMS(payload.oms);
        this.token.value = payload.token;
        this.token.expiration = payload.expirationTime;
        this.omsRedirectionUrl = payload.omsRedirectionUrl;

        const permissionId = process.env.VUE_APP_PERMISSION_ID;
        this.current = await useUserProfile().getProfile(this.token.value, this.getBaseUrl);

        const serverPermissionsFromRules = getServerPermissionsFromRules();
        if (permissionId) serverPermissionsFromRules.push(permissionId);

        const serverPermissions = await useUserProfile().loadUserPermissions(
          { permissionIds: [...new Set(serverPermissionsFromRules)] },
          this.omsRedirectionUrl || this.oms,
          this.token.value
        )

        const appPermissions = prepareAppPermissions(serverPermissions);


        // Checking if the user has permission to access the app
        // If there is no configuration, the permission check is not enabled
        if (permissionId) {
          // As the token is not yet set in the state passing token headers explicitly
          // TODO Abstract this out, how token is handled should be part of the method not the callee
          const hasPermission = appPermissions.some((appPermission: any) => appPermission.action === permissionId);
          // If there are any errors or permission check fails do not allow user to login
          if (!hasPermission) {
            const permissionError = 'You do not have permission to access the app.';
            showToast(translate(permissionError));
            logger.error("error", permissionError);
            return Promise.reject(new Error(permissionError));
          }
        }

        const isAdminUser = appPermissions.some((appPermission: any) => appPermission?.action === "APP_DRAFT_VIEW")
        const facilities = await useProductStore().getDxpUserFacilities(isAdminUser ? "" : this.current.partyId, "", isAdminUser, {
          parentTypeId: "VIRTUAL_FACILITY",
          parentTypeId_not: "Y",
          facilityTypeId: "VIRTUAL_FACILITY",
          facilityTypeId_not: "Y"
        });
        await useProductStore().getFacilityPreference("SELECTED_FACILITY", this.current?.userId)
        if (!facilities.length) throw "Unable to login. User is not associated with any facility"
        const currentFacility: any = useProductStore().getCurrentFacility
        isAdminUser ? await useProductStore().getDxpEComStores() : await useProductStore().getDxpEComStoresByFacility(currentFacility?.facilityId)
        await useProductStore().getEComStorePreference("SELECTED_BRAND", this.current?.userId)
        const preferredStore: any = useProductStore().getCurrentProductStore

        setPermissions(appPermissions);

        await useProductStore().getDxpIdentificationPref(preferredStore.productStoreId)
        await useProductStore().loadProductIdentifierSettings();
        await useInventoryCountRun().loadStatusDescription();

      } catch (err) {
        console.error("Error in Login: ", err);
        throw `Login failed. Please try again`;
      }
    },
    async logout() {
      try {
        useProductStore().$reset();
        useUserProfile().$reset();
        useAuthStore().$reset();
      } catch (error) {
        console.warn('Logout request failed', error);
      } finally {
        this.current = null;
        this.token = {
          value: '',
          expiration: undefined,
        };
      }
    },
    setToken(token: string, expirationTime?: number) {
      this.token = {
        value: token,
        expiration: expirationTime,
      };
    },
    setCurrent(current: any) {
      this.current = current;
    },
  },
  persist: true,
});