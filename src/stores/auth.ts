import { defineStore } from 'pinia';
import { DateTime } from 'luxon';
import api, { client, initialise } from '@/services/RemoteAPI';
import { getConfig } from '@/services/RemoteAPI';
import emitter from '@/event-bus';
import { loader } from '@/user-utils';

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

const hasError = (response: any): boolean => {
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
    getBaseUrl: (state) => {
      const baseURL = state.oms
      const appConfig = getConfig()

      console.log("This is app config: ", appConfig);

      if (baseURL && appConfig.systemType === "MOQUI") return baseURL.startsWith('http') ? baseURL.includes('/rest/s1') ? baseURL : `${baseURL}/rest/s1/` : `https://${baseURL}.hotwax.io/rest/s1/`;
      else if (baseURL) return baseURL.startsWith('http') ? baseURL.includes('/api') ? baseURL : `${baseURL}/api/` : `https://${baseURL}.hotwax.io/api/`;

      return "";
    },
  },
  actions: {
    setOMS(oms: string) {
      this.oms = oms;
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

      if(payload.token && payload.token !== null) requestBody.token = payload.token;
      else { requestBody.username = payload.username; requestBody.password = payload.password }

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
        console.log(resp.data);
        if(resp?.status === 200 && resp.data.token) {
          console.log("This is token: ", resp.data.token);
          this.token.value = resp.data.token;
          this.token.expiration = resp.data.expirationTime;
        } else {
          throw "Sorry, login failed. Please try again";
        }
      } catch(err) {
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

      try {
        const profileResp = await api({
          url: 'admin/user/profile',
          method: 'get',
        });
        if (profileResp?.status === 200 && profileResp.data) {
          this.current = profileResp.data;
        } else {
          throw new Error('Unable to load profile.');
        }
      } catch (error) {
        console.error('Failed to fetch user profile', error);
      }
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
