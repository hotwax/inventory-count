import { defineStore } from 'pinia';
import { DateTime } from 'luxon';
import api, { updateToken, updateInstanceUrl, client } from '@/services/RemoteAPI';

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
      const baseURL = state.oms;
      if (!baseURL) return '';
      if (baseURL.startsWith('http')) {
        return baseURL.includes('/api') ? baseURL : `${baseURL}/api/`;
      }
      return `https://${baseURL}.hotwax.io/api/`;
    },
  },
  actions: {
    setOMS(oms: string) {
      this.oms = oms;
      updateInstanceUrl(oms);
    },
    checkAuthenticated() {
      const { value, expiration } = this.token;
      if (!value) return false;
      if (expiration && expiration < DateTime.now().toMillis()) return false;
      return true;
    },
    async login(payload: LoginPayload) {

      const baseURL = "https://dev-maarg.hotwax.io/rest/s1/"

      const requestBody = {} as any;

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
      updateToken(this.token.value);

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
        updateToken('');
      }
    },
    setToken(token: string, expirationTime?: number) {
      this.token = {
        value: token,
        expiration: expirationTime,
      };
      updateToken(token);
    },
    setCurrent(current: any) {
      this.current = current;
    },
  },
  persist: true,
});
