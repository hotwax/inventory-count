import actions from './actions'
import getters from './getters'
import mutations from "./mutations";
import { Module } from 'vuex'
import UserState from './UserState'
import RootState from '@/store/RootState'

const userModule: Module<UserState, RootState> = {
    namespaced: true,
    state: {
      token: "",
      current: null,
      instanceUrl: "",
      omsRedirectionInfo: {
        url: "",
        token: ""
      },
      permissions: [],
      fieldMappings: {},
      currentMapping: {
        id: '',
        mappingType: '',
        name: '',
        value: {}
      },
      settings: {
        isFirstScanCountEnabled: false,
        forceScan: false,
        showQoh: false,
        barcodeIdentificationPref: ""
      },
      isScrollingAnimationEnabled: false
    },
    getters,
    actions,
    mutations,
}

export default userModule;

// TODO
// store.registerModule('user', userModule);