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
    getUserToken (state) {
        return state.token
    },
    getUserProfile (state) {
        return state.current
    },
    getCurrentFacility (state) {
        return state.currentFacility;
    },
    getInstanceUrl (state) {
        return state.instanceUrl;
    },
    getCurrentEComStore(state) {
        return state.currentEComStore
    }
}
export default getters;