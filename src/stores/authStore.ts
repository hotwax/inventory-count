import emitter from '@/event-bus';
import { defineStore } from 'pinia';
import { DateTime } from 'luxon';
import { useUserProfile } from './userProfileStore';
import { getServerPermissionsFromRules, prepareAppPermissions, setPermissions } from '@/authorization';
import logger from '@/logger';
import { showToast } from '@/services/uiUtils';
import { translate } from '@common';
import { useInventoryCountRun } from '@/composables/useInventoryCountRun';
import { useProductStore } from './productStore';
import { Settings } from 'luxon';
import { initialize } from '@/services/appInitializer';
import { updateInstanceUrl, updateToken } from '@common';
import { UserService } from '@/services/UserService';
import router from '@/router';

export interface LoginPayload {
  token: any;
  oms: any;
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
    oms: '',
    maarg: '',
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
    getOmsUrl: (state) => {
      const baseURL = state.oms;
      if (baseURL) return baseURL.startsWith('http') ? baseURL.includes('/api') ? baseURL : `${baseURL}/api/` : `https://${baseURL}.hotwax.io/api/`;
      return ""
    },
    getMaargUrl: (state) => {
      const baseURL = state.maarg;
      if (baseURL) return baseURL.startsWith('http') ? baseURL.includes('/rest/s1') ? baseURL : `${baseURL}/rest/s1/` : `https://${baseURL}.hotwax.io/rest/s1/`;
      return "";
    }
  },
  actions: {
    setOMS(oms: string) {
      this.oms = oms;
    },
    setMaarg(url: string) {
      this.maarg = url
    },
    checkAuthenticated() {
      const { value, expiration } = this.token;
      if (!value) return false;
      if (expiration && expiration < DateTime.now().toMillis()) return false;
      return true;
    },
    async loginWithCredentials(username: string, password: string) {
      try {
        const resp = await UserService.login(username, password);
        if (hasError(resp)) {
          showToast(translate('Sorry, your username or password is incorrect. Please try again.'));
          console.error("error", resp.data._ERROR_MESSAGE_);
          return Promise.reject(new Error(resp.data._ERROR_MESSAGE_));
        }

        const token = resp.data.token;
        const expirationTime = resp.data.expirationTime;

        // Login success, set the state
        await this.login({
          token,
          oms: this.oms,
          expirationTime
        })

        // Handling case for warnings like password may expire in few days
        if (resp.data._EVENT_MESSAGE_ && resp.data._EVENT_MESSAGE_.startsWith("Alert:")) {
          showToast(translate(resp.data._EVENT_MESSAGE_));
        }

      } catch (error: any) {
        showToast(translate('Something went wrong while login. Please contact administrator.'));
        console.error("error: ", error);
        return Promise.reject(new Error(error))
      }
    },
    async samlLogin(token: string, expirationTime: string) {
      try {
        await this.login({
          token,
          oms: this.oms,
          expirationTime
        })
      } catch (error: any) {
        showToast(translate('Something went wrong while login. Please contact administrator.'));
        console.error("error: ", error);
        return Promise.reject(new Error(error))
      }
    },
    async login(payload: LoginPayload) {
      try {
        this.setOMS(payload.oms);
        this.token.value = payload.token;
        this.token.expiration = payload.expirationTime;

        const permissionId = import.meta.env.VITE_PERMISSION_ID;
        const current = await useUserProfile().getProfile(this.token.value, this.getMaargUrl);
        Settings.defaultZone = current.timeZone;

        const serverPermissionsFromRules = getServerPermissionsFromRules();
        if (permissionId) serverPermissionsFromRules.push(permissionId);

        const serverPermissions = await useUserProfile().loadUserPermissions(
          { permissionIds: [...new Set(serverPermissionsFromRules)] },
          this.getOmsUrl || this.oms,
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
        const facilities = await useProductStore().getDxpUserFacilities(isAdminUser ? "" : current.partyId, "", isAdminUser, {
          parentTypeId: "VIRTUAL_FACILITY",
          parentTypeId_not: "Y",
          facilityTypeId: "VIRTUAL_FACILITY",
          facilityTypeId_not: "Y"
        });
        if (!facilities.length) throw "Unable to login. User is not associated with any facility"

        await useProductStore().getFacilityPreference("SELECTED_FACILITY", current?.userId)
        const currentFacility: any = useProductStore().getCurrentFacility
        isAdminUser ? await useProductStore().getDxpEComStores() : await useProductStore().getDxpEComStoresByFacility(currentFacility?.facilityId)
        await useProductStore().getEComStorePreference("SELECTED_BRAND", current?.userId)

        setPermissions(appPermissions);
        // Fetch and set product identifier settings based on current product store
        await useProductStore().getProductIdentifierSettings();
        await useProductStore().getSettings(useProductStore().getCurrentProductStore?.productStoreId);
        await useProductStore().prepareProductIdentifierOptions();
        await useInventoryCountRun().loadStatusDescription();

        await initialize();

      } catch (err) {
        console.error("Error in Login: ", err);
        throw `Login failed. Please try again`;
      }
    },
    async logout() {
      // store the url on which we need to redirect the user after logout api completes in case of SSO enabled
      let redirectionUrl = ""

      emitter.emit("presentLoader", { message: "Logging out...", backdropDismiss: false });
      let resp;

      // wrapping the parsing logic in try catch as in some case the logout api makes redirection, or fails when logout from maarg based apps, thus the logout process halts
      try {
        resp = await UserService.logout();

        // Added logic to remove the `//` from the resp as in case of get request we are having the extra characters and in case of post we are having 403
        resp = JSON.parse(resp.startsWith('//') ? resp.replace('//', '') : resp)
      } catch (err) {
        console.error('Error parsing data', err)
      }

      if (resp?.logoutAuthType == 'SAML2SSO') {
        redirectionUrl = resp.logoutUrl
      }

      useProductStore().$reset();
      useUserProfile().$reset();
      useAuthStore().$reset();

      updateToken('');
      updateInstanceUrl('');
      this.oms = '';
      this.maarg = '';

      // If we get any url in logout api resp then we will redirect the user to the url
      if (redirectionUrl) {
        window.location.href = redirectionUrl
      } else {
        router.push('/login')
      }

      emitter.emit('dismissLoader')
      return redirectionUrl;
    },
    setToken(token: string, expirationTime?: number) {
      this.token = {
        value: token,
        expiration: expirationTime,
      };
    },

  },
  persist: true,
});