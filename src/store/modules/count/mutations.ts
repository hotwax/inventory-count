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
  },
  [types.COUNT_DRAFT_WORK_EFFORTS_UPDATED] (state, payload) {
    state.draftWorkEfforts = payload.draftWorkEfforts
    state.isScrollable = payload.isScrollable;
  },
  [types.COUNT_IN_REVIEW_WORK_EFFORTS_UPDATED] (state, payload) {
    state.inReviewWorkEfforts = payload.inReviewWorkEfforts
    state.isScrollable = payload.isScrollable;
  },
  [types.COUNT_CLOSED_WORK_EFFORTS_UPDATED] (state, payload) {
    state.closedWorkEfforts = payload.closedWorkEfforts
    state.isScrollable = payload.isScrollable;
  }
}	
export default mutations;	
