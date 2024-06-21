import { GetterTree } from "vuex";
import pickerCountState from "./pickerCountState";
import RootState from "../../RootState";

const getters: GetterTree<pickerCountState, RootState> = {
  getCycleCount (state) {
    return state.cycleCounts
  }
};
export default getters;