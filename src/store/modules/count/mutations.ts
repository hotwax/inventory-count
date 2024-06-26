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
  },
  [types.COUNT_STATS_UPDATED](state, payload) {
    payload.map((count: any) => {
      // Parsing the id as in api response we are getting the id in the format `"\"100255\""`
      state.stats[JSON.parse(count.inventoryCountImportId)] = count
    })
  }
}	
export default mutations;	
