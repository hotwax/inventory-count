import { GetterTree } from "vuex";
import CountState from "./CountState";
import RootState from "../../RootState";

const getters: GetterTree<CountState, RootState> = {
  getCounts(state) {
    return state.list
  }
};

export default getters;