import { ref, computed } from "vue";
import { DateTime, Settings } from "luxon";
import { useUserProfile } from "@/stores/userProfileStore";

import { api, translate, cookieHelper, commonUtil, logger, emitter, useEmbeddedAppStore } from "@common";
import { useInventoryCountRun } from "@/composables/useInventoryCountRun";
import { useProductStore } from "@/stores/productStore";
import { initialize } from "@/services/appInitializer";
import router from "@/router";

export interface LoginPayload {
  token: any;
  oms: any;
  expirationTime: any;
}

const oms = ref(cookieHelper().get('oms') || '');
const maarg = ref(cookieHelper().get('maarg') || '');
const token = ref({
  value: cookieHelper().get('token') || '',
  expiration: cookieHelper().get('expirationTime') ? parseInt(cookieHelper().get('expirationTime')!) : undefined
});

export const useAuth = () => {

  const clearAuth = () => {
    cookieHelper().remove('token');
    cookieHelper().remove('expirationTime');
    cookieHelper().remove('maarg');
    cookieHelper().remove('oms');
  }

  const isAuthenticated = computed(() => {
    let isTokenExpired = false;
    const expirationTime = Number(commonUtil.getTokenExpiration());
    if (expirationTime) {
      const currTime = DateTime.now().toMillis();
      isTokenExpired =  expirationTime < currTime;
    }
    return !!(commonUtil.getToken() && !isTokenExpired);
  });

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
        cookieHelper().set('expirationTime', expirationTime.toString());
    } else {
        cookieHelper().remove('expirationTime');
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
        url: "admin/login",
        method: "post",
        baseURL: commonUtil.getMaargURL(),
        data: {
          'username': username,
          'password': password
        }
      });

      if (commonUtil.hasError(resp)) {
        commonUtil.showToast(translate('Sorry, your username or password is incorrect. Please try again.'));
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
        commonUtil.showToast(translate(resp.data._EVENT_MESSAGE_));
      }

    } catch (error: any) {
      commonUtil.showToast(translate('Something went wrong while login. Please contact administrator.'));
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
      commonUtil.showToast(translate('Something went wrong while login. Please contact administrator.'));
      console.error("error: ", error);
      return Promise.reject(new Error(error));
    }
  }

  async function login(payload: LoginPayload) {
    try {
      setOMS(payload.oms);
      setToken(payload.token, payload.expirationTime);

      const current = await useUserProfile().getProfile(token.value.value, commonUtil.getMaargURL());
      Settings.defaultZone = current.timeZone;

      await useUserProfile().loadUserPermissions();

      const isAdminUser = useUserProfile().hasPermission("COMMON_ADMIN OR INV_COUNT_ADMIN");
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

      // Fetch and set product identifier settings based on current product store
      await useProductStore().getProductIdentifierSettings();
      await useProductStore().getSettings(useProductStore().getCurrentProductStore?.productStoreId);
      await useProductStore().prepareProductIdentifierOptions();
      await useInventoryCountRun().loadStatusDescription();

      await initialize();

    } catch (err) {
      console.error("Error in Login: ", err);
      clearAuth();
      throw `Login failed. Please try again`;
    }
  }

  async function checkLoginOptions() {
    return api({
      url: "checkLoginOptions",
      method: "get",
      baseURL: commonUtil.getOmsURL()
    });
  }

  async function logout(payload: any) {
    let redirectionUrl = "";

    if (!payload.isUserUnauthorised) {
      let resp: any;
      emitter.emit("presentLoader", { message: "Logging out...", backdropDismiss: false });
      try {
        resp = await api({
          url: "logout",
          method: "get",
          baseURL: commonUtil.getOmsURL()
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
      emitter.emit('dismissLoader');
    }

    if (commonUtil.isAppEmbedded()) {
      redirectionUrl = window.location.origin + `/shopify-login?shop=${useEmbeddedAppStore().getShop}&host=${useEmbeddedAppStore().getHost}&embedded=1`;
      useEmbeddedAppStore().$reset();
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
    cookieHelper().remove('expirationTime');

    if (redirectionUrl) {
      window.location.href = redirectionUrl;
    } else {
      router.push('/login');
    }

    return redirectionUrl;
  }
  
  return {
    clearAuth,
    oms,
    maarg,
    token,
    isAuthenticated,
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

