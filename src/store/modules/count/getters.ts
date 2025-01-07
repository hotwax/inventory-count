import { GetterTree } from "vuex";
import CountState from "./CountState";
import RootState from "../../RootState";

const getters: GetterTree<CountState, RootState> = {
  getCounts(state) {
    return state.list
  },
  getQuery(state) {
    return state.query
  },
  getCycleCountStats: (state) => (id: string) =>  {
    return state.stats[id]
  },
  getCycleCountsList(state) {
    return state.cycleCounts.list ? JSON.parse(JSON.stringify(state.cycleCounts.list)) : []
  },
  isCycleCountListScrollable(state) {
    return state.isScrollable
  },
  isCycleCountScrollable(state) {
    return state.cycleCounts.isScrollable
  },
  getCycleCountItems(state) {
    return state.cycleCountItems
  },
  getCycleCountImportSystemMessages(state) {
    return state.cycleCountImportSystemMessages
  },
  getDefaultRecountUpdateBehaviour(state) {
    return state.defaultRecountUpdateBehaviour
  },
  getCachedUnmatchProducts: (state) => (id: string) => {
    return state.cachedUnmatchProducts[id]
  }
};

export default getters;