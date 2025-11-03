import { MutationTree } from 'vuex'
import * as types from './mutation-types'
import UtilState from './UtilState';

const mutations: MutationTree <UtilState> = {
  [types.UTIL_FACILITY_GROUPS_UPDATED] (state, payload) {
    state.facilityGroups = payload
  },
  [types.UTIL_STATUS_UPDATED] (state, payload) {
    state.statusDesc = payload
  }
}
export default mutations;