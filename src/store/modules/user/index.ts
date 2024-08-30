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
      facilities: [],
      currentFacility: {},
      permissions: [],
      productStores: [],
      currentProductStore: {},
      fieldMappings: {},
      currentMapping: {
        id: '',
        mappingType: '',
        name: '',
        value: {}
      },
      settings: {
        forceScan: false,
        showQoh: false,
        productIdentificationPref: {
          primaryId: 'productId',
          secondaryId: ''
        },
      }
    },
    getters,
    actions,
    mutations,
}

export default userModule;

// TODO
// store.registerModule('user', userModule);