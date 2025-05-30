import { MutationTree } from "vuex"	
import CountState from "./CountState"
import * as types from "./mutation-types"

const mutations: MutationTree <CountState> = {	
  [types.COUNT_LIST_UPDATED](state, payload) {
    state.list = payload.counts
    state.total = payload.total
    state.isScrollable = payload.isScrollable;
  },
  [types.COUNT_QUERY_UPDATED](state, payload) {
    (state.query as any)[payload.key] = payload.value
  },
  [types.COUNT_QUERY_CLEARED](state) {
    state.query = {
      facilityIds: [],
      noFacility: false,
      queryString: '',
      sortBy: 'dueDate asc',
      createdDate_from: '',
      createdDate_thru: '',
      closedDate_from: '',
      closedDate_thru: ''
    }
  },
  [types.COUNT_STATS_UPDATED](state, payload) {
    payload.map((count: any) => {
      state.stats[count.inventoryCountImportId] = count
    })
  },
  [types.COUNT_UPDATED] (state, payload) {
    state.cycleCounts.list = payload.cycleCount
    state.cycleCounts.isScrollable = payload.isScrollable;
  },
  [types.COUNT_ITEMS_UPDATED] (state, payload) {
    state.cycleCountItems = payload
  },
  [types.COUNT_IMPORT_SYSTEM_MESSAGES_UPDATED] (state, payload) {
    state.cycleCountImportSystemMessages = payload
  },
  [types.COUNT_CACHED_UNMATCH_PRODUCTS_UPDATED] (state, payload) {
    state.cachedUnmatchProducts = payload
  },
  [types.COUNT_CLOSED_CYCLE_COUNTS_TOTAL_UPDATED] (state, payload) {
    state.closedCycleCountsTotal = payload
  },
  [types.COUNT_ON_FIRST_SCAN_UPDATED] (state, payload) {
    state.isFirstScanCountEnabled = payload
  }
  
}	
export default mutations;	
