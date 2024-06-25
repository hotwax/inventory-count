import { MutationTree } from "vuex"	
import CountState from "./CountState"
import * as types from "./mutation-types"

const mutations: MutationTree <CountState> = {	
  [types.COUNT_LIST_UPDATED](state, payload) {
    state.list = payload.counts
    state.total = payload.total
  },
  [types.COUNT_QUERY_UPDATED](state, payload) {
    (state.query as any)[payload.key] = payload.value
  }
}	
export default mutations;	
