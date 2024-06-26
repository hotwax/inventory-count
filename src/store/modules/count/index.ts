import actions from './actions'
import getters from './getters'
import mutations from './mutations'
import { Module } from 'vuex'
import CountState from './CountState'
import RootState from '../../RootState'

const countModule: Module<CountState, RootState> = {
  namespaced: true,
  state: {
    list: [],
    total: 0,
    query: {
      facilityId: '',
      noFacility: false
    }
  },
  getters,
  actions,
  mutations
}

export default countModule;
