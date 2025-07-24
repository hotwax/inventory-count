import { GetterTree } from 'vuex'
import UserState from './UserState'
import RootState from '@/store/RootState'

const getters: GetterTree <UserState, RootState> = {
  isAuthenticated(state) {
    return !!state.token;
  },
  isUserAuthenticated(state) {
    return state.token && state.current
  },
  getUserToken(state) {
    return state.token
  },
  getUserProfile(state) {
    return state.current
  },
  getInstanceUrl(state) {
    return state.instanceUrl;
  },
  getBaseUrl(state) {
    const baseURL = state.instanceUrl;
    return baseURL.startsWith("http") ? `${baseURL}/rest/s1/` : `https://${baseURL}.hotwax.io/rest/s1/`;
  },
  getOmsRedirectionInfo(state) {
    return state.omsRedirectionInfo;
  },
  getUserPermissions (state) {
    return state.permissions;
  },
  getProductStoreSettings(state) {
    return state.settings
  },
  getFieldMappings: (state) => (type?: string) => {
    if (type) {
        const fieldMapping = (state.fieldMappings as any)[type];
        return fieldMapping ? fieldMapping : {} 
    }
    return state.fieldMappings;
  },
  isScrollingAnimationEnabled(state) {
    return state.isScrollingAnimationEnabled
  },
  getWebSocketUrl(state) {
    let baseURL = state.instanceUrl
    if(baseURL.startsWith("http")) {
      baseURL = baseURL.replace(/https?:\/\/|\/api|\/+/g, "");
    }
    return `ws://${baseURL}/notws?api_key=${state.token}`;
  },
}
export default getters;