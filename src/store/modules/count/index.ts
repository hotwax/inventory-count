import actions from './actions'
import getters from './getters'
import mutations from './mutations'
import { Module } from 'vuex'
import CountState from './CountState'
import RootState from '../../RootState'

const countModule: Module<CountState, RootState> = {
  namespaced: true,
  state: {
    assignedWorkEfforts: [],
    total: 0,
    isScrollable: true,
    query: {
      facilityIds: [],
      noFacility: false,
      queryString: '',
      sortBy: 'dueDate asc',
      createdDate_from: '',
      createdDate_thru: '',
      closedDate_from: '',
      closedDate_thru: ''
    },
    stats: {},
    cycleCountImportSystemMessages:[],
    cycleCounts: {
      list: [],
      isScrollable: true
    },
    cycleCountItems: {},
    defaultRecountUpdateBehaviour: "add",
    cachedUnmatchProducts: {},
    closedCycleCountsTotal: "",
    isCountDetailPageActive: false
  },
  getters,
  actions,
  mutations
}

export default countModule;
