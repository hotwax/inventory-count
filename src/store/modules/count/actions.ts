import { ActionTree } from "vuex"	
import RootState from "@/store/RootState"	
import CountState from "./CountState"
import * as types from "./mutation-types"
import { CountService } from "@/services/CountService"
import logger from "@/logger"
import { hasError, showToast } from "@/utils"
import emitter from "@/event-bus"
import { translate } from "@/i18n"

const actions: ActionTree<CountState, RootState> = {
  async fetchCycleCounts({ commit, state }, payload) {
    emitter.emit("presentLoader", { message: "Fetching cycle counts" })
    let counts: Array<any> = [], total = 0;

    const params = {
      ...payload
    }

    if(state.query.facilityId) {
      params["facilityId"] = state.query.facilityId
    }

    if(state.query.noFacility) {
      if(params["facilityId"]) {
        params["facilityId"] = params["facilityId"].concat(", ''")
        params["facilityId_op"] = "in"
      } else {
        params["facilityId_op"] = "empty"
      }
    }

    try {
      const resp = await CountService.fetchCycleCounts(params);

      if(!hasError(resp) && resp.data.length > 0) {
        counts = resp.data
        total = resp.data.length
      } else {
        throw "Failed to fetch the counts"
      }
    } catch(err) {
      logger.error(err)
    }
    commit(types.COUNT_LIST_UPDATED, { counts, total })
    emitter.emit("dismissLoader")
  },

  async createCycleCount({ commit }, payload) {    
    try {
      const resp = await CountService.createCycleCount(payload);

      if(!hasError(resp)) {
        showToast(translate("Cycle Count created successfully"))
      } else {
        throw "Failed to create cycle count"
      }

    } catch(err) {
      logger.error(err)
      showToast(translate("Failed to create cycle count"))
    }
  },

  async updateQuery({ commit, dispatch }, payload) {
    commit(types.COUNT_QUERY_UPDATED, payload)
    dispatch("fetchCycleCounts")
  }
}	

export default actions;	
