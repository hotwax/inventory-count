import { GetterTree } from 'vuex'
import UserState from './UserState'
import RootState from '@/store/RootState'

const getters: GetterTree <UserState, RootState> = {
    isAuthenticated (state) {
        return !!state.token;
    },
    isUserAuthenticated(state) {
        return state.token && state.current
    },
    getBaseUrl (state) {
        const baseURL = state.instanceUrl;
        return baseURL.startsWith('http') ? baseURL : `https://${baseURL}.hotwax.io/api/`;
    },
    getUserToken (state) {
        return state.token
    },
    getUserProfile (state) {
        return state.current
    },
    getCurrentFacility (state) {
        return state.currentFacility;
    },
    getUserPermissions (state) {
        return state.permissions;
    },
    getInstanceUrl (state) {
        const baseUrl = state.instanceUrl;
        return baseUrl ? baseUrl : state.instanceUrl;
    },
    getCurrentEComStore(state) {
        return state.currentEComStore;
    },
    getViewQOHConfig (state) {
        return state.config.viewQOH;
    }
}
export default getters;