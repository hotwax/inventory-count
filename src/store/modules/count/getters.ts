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
  getCountStats: (state) => (id: string) =>  {
    return state.stats[id]
  }
};

export default getters;