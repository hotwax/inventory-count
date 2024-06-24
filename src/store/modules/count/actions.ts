import { ActionTree } from "vuex"	
import RootState from "@/store/RootState"	
import CountState from "./CountState"
import * as types from "./mutation-types"
import { CountService } from "@/services/CountService"
import logger from "@/logger"

const actions: ActionTree<CountState, RootState> = {
  async fetchCycleCounts({ commit }) {    
    let counts: Array<any> = [], total = 0;
    try {
      const resp = await CountService.fetchCycleCounts();
      counts = [], total = 0
      console.log('resp', resp)
    } catch(err) {
      logger.error(err)
    }
    commit(types.COUNT_LIST_UPDATED, { counts, total })
  },

  async createCycleCount({ commit }, payload) {    
    try {
      const resp = await CountService.createCycleCount(payload);
      console.log('resp', resp)
    } catch(err) {
      logger.error(err)
    }
  }
}	

export default actions;	
