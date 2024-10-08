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
      facilityIds: [],
      noFacility: false
    },
    stats: {},
    cycleCountImportSystemMessages:[],
    cycleCounts: {
      list: [],
      isScrollable: true
    },
    cycleCountItems: {}
  },
  getters,
  actions,
  mutations
}

export default countModule;
