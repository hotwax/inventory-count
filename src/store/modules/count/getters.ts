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
  }
};

export default getters;