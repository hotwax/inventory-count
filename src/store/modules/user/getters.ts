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
    return baseURL.startsWith("http") ? baseURL : `https://${baseURL}.hotwax.io/rest/s1/inventory-cycle-count/`;
  },
  getOmsRedirectionInfo(state) {
    return state.omsRedirectionInfo;
  },
  getFacilities(state) {
    return state.facilities;
  },
  getCurrentFacility(state) {
    return state.currentFacility;
  },
  getUserPermissions (state) {
    return state.permissions;
  },
  getProductStores(state) {
    return state.productStores
  },
  getCurrentProductStore(state) {
    return state.currentProductStore
  },
  getProductStoreSettings(state) {
    return state.settings
  }
}
export default getters;