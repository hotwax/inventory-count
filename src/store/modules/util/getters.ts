import { GetterTree } from "vuex";
import RootState from "../../RootState";
import UtilState from "./UtilState";

const getters: GetterTree<UtilState, RootState> = {
  getFacilityGroups(state) {
    return state.facilityGroups
  }
};
export default getters;