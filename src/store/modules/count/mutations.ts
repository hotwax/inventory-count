import { MutationTree } from "vuex"	
import CountState from "./CountState"
import * as types from "./mutation-types"

const mutations: MutationTree <CountState> = {
  [types.COUNT_DETAIL_PAGE_ACTIVE_UPDATED](state, payload) {
    state.isCountDetailPageActive = payload;
  },
  [types.COUNT_ASSIGNED_WORK_EFFORTS_UPDATED](state, payload) {
    state.assignedWorkEfforts = payload.assignedWorkEfforts
    state.total = payload.total
    state.isScrollable = payload.isScrollable;
  }
}	
export default mutations;	
