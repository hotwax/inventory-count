import { GetterTree } from "vuex";
import pickerCountState from "./pickerCountState";
import RootState from "../../RootState";

const getters: GetterTree<pickerCountState, RootState> = {
  getCycleCount (state) {
    return state.cycleCounts.list ? JSON.parse(JSON.stringify(state.cycleCounts.list)) : []
  },
  isCycleCountScrollable(state) {
    return state.cycleCounts.isScrollable
  }

};
export default getters;