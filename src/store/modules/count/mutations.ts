import { MutationTree } from "vuex"	
import CountState from "./CountState"
import * as types from "./mutation-types"
import { ToastPluginWeb } from "@capacitor/core";

const mutations: MutationTree <CountState> = {
  [types.COUNT_DETAIL_PAGE_ACTIVE_UPDATED](state, payload) {
    state.isCountDetailPageActive = payload;
  },
  [types.COUNT_ASSIGNED_WORK_EFFORTS_UPDATED](state, payload) {
    state.assignedWorkEfforts = payload.assignedWorkEfforts
    state.total = payload.total
    state.isScrollable = payload.isScrollable;
  },
  [types.COUNT_IMPORT_SYSTEM_MESSAGES_UPDATED] (state, payload) {
    state.cycleCountImportSystemMessages = payload
  },
  [types.COUNT_DRAFT_WORK_EFFORTS_UPDATED] (state, payload) {
    state.draftWorkEfforts = payload.draftWorkEfforts
    state.total = payload.total
    state.isScrollable = payload.isScrollable;
  },
  [types.COUNT_IN_REVIEW_WORK_EFFORTS_UPDATED] (state, payload) {
    state.inReviewWorkEfforts = payload.inReviewWorkEfforts
    state.total = payload.total
    state.isScrollable = payload.isScrollable;
  },
  [types.COUNT_CLOSED_WORK_EFFORTS_UPDATED] (state, payload) {
    state.closedWorkEfforts = payload.closedWorkEfforts
    state.total = payload.total
    state.isScrollable = payload.isScrollable;
  },
  [types.COUNT_LIST_UPDATED] (state, payload) {
    state.list = payload.list
    state.total = payload.total
    state.isScrollable = payload.isScrollable
  }
}	
export default mutations;	
