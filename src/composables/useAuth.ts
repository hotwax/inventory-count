import { ref, computed } from "vue";
import { DateTime, Settings } from "luxon";
import { useUserProfile } from "@/stores/userProfileStore";
import { getServerPermissionsFromRules, prepareAppPermissions, setPermissions } from "@/authorization";
import logger from "@/logger";
import { showToast } from "@/services/uiUtils";
import { api, translate, cookieHelper, hasError } from "@common";
import { useInventoryCountRun } from "@/composables/useInventoryCountRun";
import { useProductStore } from "@/stores/productStore";
import { initialize } from "@/services/appInitializer";
import router from "@/router";
import emitter from "@/event-bus";

export interface LoginPayload {
  token: any;
  oms: any;
  expirationTime: any;
}

const oms = ref(cookieHelper().get('oms') || '');
const maarg = ref(cookieHelper().get('maarg') || '');
const token = ref({
  value: cookieHelper().get('token') || '',
  expiration: cookieHelper().get('tokenExpiration') ? parseInt(cookieHelper().get('tokenExpiration')!) : undefined
});

export const useAuth = () => {

  const isAuthenticated = computed(() => {
    let isTokenExpired = false;
    if (token.value.expiration) {
      const currTime = DateTime.now().toMillis();
      isTokenExpired = token.value.expiration < currTime;
    }
    return !!(token.value.value && !isTokenExpired);
  });

  const getOMS = computed(() => oms.value);
  
  const getOmsUrl = computed(() => {
    const baseURL = oms.value;
    if (baseURL) return baseURL.startsWith('http') ? baseURL.includes('/api') ? baseURL : `${baseURL}/api/` : `https://${baseURL}.hotwax.io/api/`;
    return "";
  });

  const getMaargUrl = computed(() => {
    const baseURL = maarg.value;
    if (baseURL) return baseURL.startsWith('http') ? baseURL.includes('/rest/s1') ? baseURL : `${baseURL}/rest/s1/` : `https://${baseURL}.hotwax.io/rest/s1/`;
    return "";
  });

  const getToken = computed(() => token.value.value);

  function setOMS(newOms: string) {
    oms.value = newOms;
    cookieHelper().set('oms', newOms);
  }

  function setMaarg(url: string) {
    maarg.value = url;
    cookieHelper().set('maarg', url);
  }

  function setToken(newToken: string, expirationTime?: number) {
    token.value = {
      value: newToken,
      expiration: expirationTime,
    };
    cookieHelper().set('token', newToken);
    if (expirationTime) {
        cookieHelper().set('tokenExpiration', expirationTime.toString());
    } else {
        cookieHelper().remove('tokenExpiration');
    }
  }

  function checkAuthenticated() {
    const { value, expiration } = token.value;
    if (!value) return false;
    if (expiration && expiration < DateTime.now().toMillis()) return false;
    return true;
  }

  async function loginWithCredentials(username: string, password: string) {
    try {
      const resp = await api({
        url: "login",
        method: "post",
        baseURL: getOmsUrl.value,
        data: {
          'USERNAME': username,
          'PASSWORD': password
        }
      });

      if (hasError(resp)) {
        showToast(translate('Sorry, your username or password is incorrect. Please try again.'));
        console.error("error", resp.data._ERROR_MESSAGE_);
        return Promise.reject(new Error(resp.data._ERROR_MESSAGE_));
      }

      const receivedToken = resp.data.token;
      const expirationTime = resp.data.expirationTime;

      // Login success, set the state
      await login({
        token: receivedToken,
        oms: oms.value,
        expirationTime
      });

      // Handling case for warnings like password may expire in few days
      if (resp.data._EVENT_MESSAGE_ && resp.data._EVENT_MESSAGE_.startsWith("Alert:")) {
        showToast(translate(resp.data._EVENT_MESSAGE_));
      }

    } catch (error: any) {
      showToast(translate('Something went wrong while login. Please contact administrator.'));
      console.error("error: ", error);
      return Promise.reject(new Error(error));
    }
  }

  async function samlLogin(receivedToken: string, expirationTime: string) {
    try {
      await login({
        token: receivedToken,
        oms: oms.value,
        expirationTime
      });
    } catch (error: any) {
      showToast(translate('Something went wrong while login. Please contact administrator.'));
      console.error("error: ", error);
      return Promise.reject(new Error(error));
    }
  }

  async function login(payload: LoginPayload) {
    try {
      setOMS(payload.oms);
      setToken(payload.token, payload.expirationTime);

      const permissionId = import.meta.env.VITE_PERMISSION_ID;
      const current = await useUserProfile().getProfile(token.value.value, getMaargUrl.value);
      Settings.defaultZone = current.timeZone;

      const serverPermissionsFromRules = getServerPermissionsFromRules();
      if (permissionId) serverPermissionsFromRules.push(permissionId);

      const serverPermissions = await useUserProfile().loadUserPermissions(
        { permissionIds: [...new Set(serverPermissionsFromRules)] },
        getOmsUrl.value || oms.value,
        token.value.value
      );

      const appPermissions = prepareAppPermissions(serverPermissions);

      // Checking if the user has permission to access the app
      if (permissionId) {
        const hasPermission = appPermissions.some((appPermission: any) => appPermission.action === permissionId);
        if (!hasPermission) {
          const permissionError = 'You do not have permission to access the app.';
          showToast(translate(permissionError));
          logger.error("error", permissionError);
          return Promise.reject(new Error(permissionError));
        }
      }

      const isAdminUser = appPermissions.some((appPermission: any) => appPermission?.action === "APP_DRAFT_VIEW");
      const facilities = await useProductStore().getDxpUserFacilities(isAdminUser ? "" : current.partyId, "", isAdminUser, {
        parentTypeId: "VIRTUAL_FACILITY",
        parentTypeId_not: "Y",
        facilityTypeId: "VIRTUAL_FACILITY",
        facilityTypeId_not: "Y"
      });
      if (!facilities.length) throw "Unable to login. User is not associated with any facility";

      await useProductStore().getFacilityPreference("SELECTED_FACILITY", current?.userId);
      const currentFacility: any = useProductStore().getCurrentFacility;
      isAdminUser ? await useProductStore().getDxpEComStores() : await useProductStore().getDxpEComStoresByFacility(currentFacility?.facilityId);
      await useProductStore().getEComStorePreference("SELECTED_BRAND", current?.userId);

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
  }

  async function checkLoginOptions() {
    return api({
      url: "checkLoginOptions",
      method: "get",
      baseURL: getOmsUrl.value
    });
  }

  async function logout() {
    let redirectionUrl = "";

    emitter.emit("presentLoader", { message: "Logging out...", backdropDismiss: false });
    let resp: any;

    try {
      resp = await api({
        url: "logout",
        method: "get",
        baseURL: getOmsUrl.value
      });

      if (resp.data) {
        resp = resp.data;
      }
      
      if (typeof resp === 'string') {
        resp = JSON.parse(resp.startsWith('//') ? resp.replace('//', '') : resp);
      }
    } catch (err) {
      console.error('Error parsing data', err);
    }

    if (resp?.logoutAuthType == 'SAML2SSO') {
      redirectionUrl = resp.logoutUrl;
    }

    useProductStore().$reset();
    useUserProfile().$reset();
    
    // Clear state/cookies
    oms.value = '';
    maarg.value = '';
    token.value = { value: '', expiration: undefined };
    
    cookieHelper().remove('oms');
    cookieHelper().remove('maarg');
    cookieHelper().remove('token');
    cookieHelper().remove('tokenExpiration');

    if (redirectionUrl) {
      window.location.href = redirectionUrl;
    } else {
      router.push('/login');
    }

    emitter.emit('dismissLoader');
    return redirectionUrl;
  }
  
  return {
    oms,
    maarg,
    token,
    isAuthenticated,
    getOMS,
    getOmsUrl,
    getMaargUrl,
    getToken,
    setOMS,
    setMaarg,
    checkAuthenticated,
    loginWithCredentials,
    samlLogin,
    login,
    logout,
    checkLoginOptions,
    setToken
  };
};

