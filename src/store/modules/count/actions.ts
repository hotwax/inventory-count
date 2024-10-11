import { ActionTree } from "vuex"	
import RootState from "@/store/RootState"	
import CountState from "./CountState"
import * as types from "./mutation-types"
import { CountService } from "@/services/CountService"
import { hasError, showToast } from "@/utils"
import emitter from "@/event-bus"
import { translate } from "@/i18n"
import router from "@/router"
import logger from "@/logger";
import { DateTime } from "luxon"

const actions: ActionTree<CountState, RootState> = {
  async fetchCycleCounts({ commit, dispatch, state }, payload) {
    emitter.emit("presentLoader", { message: "Fetching cycle counts..." })
    let counts: Array<any> = [], total = 0;

    const params = {
      ...payload,
      pageSize: 100
    }

    if(state.query.facilityIds.length) {
      params["facilityId"] = state.query.facilityIds.join(",")
      params["facilityId_op"] = "in"
    }

    if(state.query.noFacility) {
      if(params["facilityId"]) {
        params["facilityId"] = params["facilityId"].concat(",''")
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

        dispatch("fetchCycleCountStats", counts.map((count) => count.inventoryCountImportId))
      } else {
        throw "Failed to fetch the counts"
      }
    } catch(err) {
      logger.error(err)
    }
    commit(types.COUNT_LIST_UPDATED, { counts, total })
    emitter.emit("dismissLoader")
  },

  async fetchCycleCountStats({ commit }, inventoryCountImportIds) {
    try {
      const resp = await CountService.fetchCycleCountStats({ inventoryCountImportIds });

      if(!hasError(resp) && resp.data?.importStats?.length > 0) {

        // Sorting the statusHistory based on statusDate, as in response we are getting this information sorted on statusId
        resp.data.importStats.map((stats: any) => {
          stats.statusHistory.sort((a: any, b: any) => {
            if(a["statusDate"] === b["statusDate"]) return 0;

            // Sort undefined values at last
            if(a["statusDate"] == undefined) return 1;
            if(b["statusDate"] == undefined) return -1;

            return a["statusDate"] - b["statusDate"]
          })
        })

        commit(types.COUNT_STATS_UPDATED, resp.data.importStats)
      } else {
        throw "Failed to fetch the count stats"
      }
    } catch(err) {
      logger.error(err)
    }
  },

  async clearCycleCountList({ commit }) {
    commit(types.COUNT_LIST_UPDATED, { counts: [], total: 0 })
  },

  async createCycleCount({ dispatch }, payload) {
    try {
      const resp = await CountService.createCycleCount(payload);

      if(!hasError(resp) && resp.data.inventoryCountImportId) {
        showToast(translate("Cycle Count created successfully"))
        await dispatch("fetchCycleCounts", {
          statusId: "INV_COUNT_CREATED"
        })
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

    // After updating query we need to fetch the counts and thus need to pass the statusId for the counts to be fetched
    // hence added check to decide the statusId on the basis of currently selected router
    let statusId = "INV_COUNT_CREATED"
    if(router.currentRoute.value.name === "PendingReview") {
      statusId = "INV_COUNT_REVIEW"
    } else if(router.currentRoute.value.name === "Assigned") {
      statusId = "INV_COUNT_ASSIGNED"
    } else if(router.currentRoute.value.name === "Closed") {
      statusId = "INV_COUNT_COMPLETED"
    }
    dispatch("fetchCycleCounts", { statusId })
  },

  async clearQuery({ commit }) {
    commit(types.COUNT_QUERY_CLEARED)
  },

  async fetchCycleCountsLists({ commit, state }, payload) {
    let counts = state.cycleCounts.list ? JSON.parse(JSON.stringify(state.cycleCounts.list)) : []
    let isScrollable = true

    try {
      const resp = await CountService.fetchCycleCounts(payload)
      if(!hasError(resp) && resp.data.length) {

        if(payload.pageIndex && payload.pageIndex > 0) {
          counts = counts.concat(resp.data)
        } else {
          counts = resp.data
        }

        // Fetching stats information for the counts
        this.dispatch("count/fetchCycleCountStats", resp.data.map((count: any) => count.inventoryCountImportId))

        if(resp.data.length == payload.pageSize) isScrollable = true
        else isScrollable = false
      } else {
        throw resp.data;
      }
    } catch (err: any) {
      if(payload.pageIndex == 0) {
        counts = []
        isScrollable = false
      }
      logger.error(err)
    }
    commit(types.COUNT_UPDATED, {cycleCount: counts, isScrollable})
  },
  
  async clearCycleCounts ({ commit }) {
    commit(types.COUNT_UPDATED, {})
  },

  async fetchCycleCountItems({commit} ,payload) {
    let items;
    try {
      const resp = await CountService.fetchCycleCountItems(payload)
      if(!hasError(resp)) {
        items = resp.data

        this.dispatch("product/fetchProducts", { productIds: [...new Set(resp.data.itemList.map((item: any) => item.productId))] })
      } else {
        throw resp.data;
      }
    } catch (err: any) {
      logger.error(err)
    }
    commit(types.COUNT_ITEMS_UPDATED, items)
  },

  async updateCycleCountItems ({ commit }, payload) {
    commit(types.COUNT_ITEMS_UPDATED, { itemList: payload })
  },

  async clearCycleCountItems ({ commit }) {
    commit(types.COUNT_ITEMS_UPDATED, [])
  },

  async fetchCycleCountImportSystemMessages({commit} ,payload) {
    let systemMessages;
    try {
      const fifteenMinutesEarlier = DateTime.now().minus({ minutes: 15 });
      const resp = await CountService.fetchCycleCountImportSystemMessages({
        systemMessageTypeId: "ImportInventoryCounts",
        initDate_from: fifteenMinutesEarlier.toMillis(),
        orderByField: 'initDate desc, processedDate desc',
        pageSize: 10
      })
      if (!hasError(resp)) {
        systemMessages = resp.data
      } else {
        throw resp.data;
      }
    } catch (err: any) {
      logger.error(err)
    }
    commit(types.COUNT_IMPORT_SYSTEM_MESSAGES_UPDATED, systemMessages)
  },
}	

export default actions;	
