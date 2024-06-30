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
  getCycleCounts(state) {
    return state.cycleCounts.list ? JSON.parse(JSON.stringify(state.cycleCounts.list)) : []
  },
  isCycleCountScrollable(state) {
    return state.cycleCounts.isScrollable
  },
  getCycleCountItems(state) {
    return state.cycleCountItems
  }
};

export default getters;