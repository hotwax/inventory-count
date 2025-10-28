import { GetterTree } from "vuex";
import CountState from "./CountState";
import RootState from "../../RootState";

const getters: GetterTree<CountState, RootState> = {
  getAssignedWorkEfforts(state) {
    return state.assignedWorkEfforts ? JSON.parse(JSON.stringify(state.assignedWorkEfforts)) : []
  },
  getCycleCountsList(state) {
    return state.cycleCounts.list ? JSON.parse(JSON.stringify(state.cycleCounts.list)) : []
  },
  isCountDetailPageActive(state) {
    return state.isCountDetailPageActive;
  },
  getCycleCountImportSystemMessages(state) {
    return state.cycleCountImportSystemMessages
  },
  getDraftWorkEfforts(state) {
    return state.draftWorkEfforts ? JSON.parse(JSON.stringify(state.draftWorkEfforts)) : []
  },
  getInReviewCounts(state) {
    return state.inReviewWorkEfforts ? JSON.parse(JSON.stringify(state.inReviewWorkEfforts)) : []
  },
  getClosedCounts(state) {
    return state.closedWorkEfforts ? JSON.parse(JSON.stringify(state.closedWorkEfforts)) : [];
  },
  isScrollable(state) {
    return state.isScrollable;
  }
};

export default getters;