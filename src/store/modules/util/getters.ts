import { GetterTree } from "vuex";
import RootState from "../../RootState";
import UtilState from "./UtilState";

const getters: GetterTree<UtilState, RootState> = {
  getFacilityGroups(state) {
    return state.facilityGroups
  },
  getStatusDesc: (state) => (statusId: string) => {
    return state.statusDesc.find(status => status.statusId === statusId)?.description || statusId
  }
};
export default getters;