import { defineStore } from 'pinia';
import { DateTime } from 'luxon';
import api, { client, initialise, updateToken } from '@/services/RemoteAPI';
import { getConfig } from '@/services/RemoteAPI';
import emitter from '@/event-bus';
import { loader } from '@/services/uiUtils';
import { useUserProfileNew } from './useUserProfile';
import { getServerPermissionsFromRules, prepareAppPermissions, setPermissions } from '@/authorization';
import logger from '@/logger';
import { showToast } from '@/services/uiUtils';
import { translate } from '@/i18n';
import { useProductIdentificationStore } from './productIdentification';
import { useProductStoreSettings } from '@/composables/useProductStoreSettings';
import { useInventoryCountRun } from '@/composables/useInventoryCountRun';
import { useProductStore } from './useProductStore';
import { useFacilityStore } from './useFacilityStore';

export interface LoginPayload {
  username: string | null;
  password: string | null;
  token: string | null;
  oms: string | null;
  omsRedirectionUrl: string | null
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
    systemType: 'MOQUI' as string,
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
      const appConfig = getConfig()

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
      this.setOMS(payload.oms as any);
      const baseURL = this.getBaseUrl;

      const requestBody = {} as any;
      // const omsRedirectionUrl = payload.omsRedirectionUrl as any;

      if (payload.token && payload.token !== null) requestBody.token = payload.token;
      else { requestBody.username = payload.username; requestBody.password = payload.password }

      const permissionId = process.env.VUE_APP_PERMISSION_ID;

      try {
        const resp = await client({
          url: "admin/login",
          method: "post",
          baseURL,
          data: requestBody,
          headers: {
            "Content-Type": "application/json"
          }
        }) as any;
        if (resp?.status === 200 && resp.data.token) {
          this.token.value = resp.data.token;
          this.token.expiration = resp.data.expirationTime;
          this.omsRedirectionUrl = payload.omsRedirectionUrl as any;
        } else {
          throw "Sorry, login failed. Please try again";
        }

        this.current = await useUserProfileNew().fetchUserProfile(resp.data.api_key, this.getBaseUrl);

        const serverPermissionsFromRules = getServerPermissionsFromRules();
        if (permissionId) serverPermissionsFromRules.push(permissionId);

        const serverPermissions = await useUserProfileNew().loadUserPermissions(
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
      const facilities = await useFacilityStore().getDxpUserFacilities(isAdminUser ? "" : this.current.partyId, "", isAdminUser, {
        parentTypeId: "VIRTUAL_FACILITY",
        parentTypeId_not: "Y",
        facilityTypeId: "VIRTUAL_FACILITY",
        facilityTypeId_not: "Y"
      });
      await useFacilityStore().getFacilityPreference("SELECTED_FACILITY", this.current?.userId)
      if (!facilities.length) throw "Unable to login. User is not associated with any facility"
      const currentFacility: any = useFacilityStore().getCurrentFacility
      isAdminUser ? await useProductStore().getDxpEComStores() : await useProductStore().getDxpEComStoresByFacility(currentFacility?.facilityId)
      await useProductStore().getEComStorePreference("SELECTED_BRAND", this.current?.userId)
      const preferredStore: any = useProductStore().getCurrentProductStore

      setPermissions(appPermissions);

      // Get product identification from api using dxp-component
      await useProductIdentificationStore().getDxpIdentificationPref(preferredStore.productStoreId)

      } catch (err) {
        return Promise.reject("Sorry, login failed. Please try again");
      }

      initialise({
        token: this.token.value,
        instanceUrl: this.getBaseUrl.replace("inventory-cycle-count/", ""),
        events: {
          responseError: () => setTimeout(() => function dismissLoader() {
            if (loader.value) {
              loader.value.dismiss();
              loader.value = null as any;
            }
          }, 100),
          queueTask: (payload: any) => emitter.emit("queueTask", payload)
        },
        systemType: "MOQUI"
      });
      await useProductStoreSettings().init();
      await useInventoryCountRun().loadStatusDescription();
    },
    async logout() {
      try {
        await api({
          url: 'logout',
          method: 'post',
        });
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