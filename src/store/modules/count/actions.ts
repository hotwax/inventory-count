import { ActionTree } from "vuex"
import RootState from "@/store/RootState"
import CountState from "./CountState"
import * as types from "./mutation-types"
import { CountService } from "@/services/CountService"
import { convertIsoToMillis, hasError, showToast, sortListByField } from "@/utils"
import { translate } from "@/i18n"
import router from "@/router"
import logger from "@/logger";
import { DateTime } from "luxon"
import store from "@/store";
import { readTable, syncItem } from "@/utils/indexeddb"

const actions: ActionTree<CountState, RootState> = {
  async getAssignedWorkEfforts({ commit, dispatch, state }, params) {
    let assignedWorkEfforts = []
    let total = 0
    let isScrollable = true

    if (state.query.facilityIds.length) {
      params["facilityId"] = state.query.facilityIds.join(",")
      params["facilityId_op"] = "in"
    }
    params["orderByField"] = "lastUpdatedStamp"

    try {
      const resp = await CountService.getAssignedWorkEfforts(params)
      if (!hasError(resp) && resp.data.length > 0) {
        const workEfforts = resp.data

        // For each workEffort, fetch InventoryCountImport details
        for (const workEffort of workEfforts) {
          try {
            const inventoryResp = await CountService.getInventoryCountImportsByWorkEffort({
              workEffortId: workEffort.workEffortId
            })
            if (!hasError(inventoryResp)) {
              assignedWorkEfforts.push({
                ...workEffort,
                inventoryCountImports: inventoryResp.data || []
              })
            }
          } catch (err) {
            logger.error(`Error fetching inventory imports for workEffortId ${workEffort.workEffortId}:`, err)
          }
        }

        total = assignedWorkEfforts.length
        isScrollable = workEfforts.length >= params.pageSize
      } else {
        if (params.pageIndex > 0) isScrollable = false
        throw "Failed to fetch the assigned work efforts"
      }
    } catch (err) {
      isScrollable = false
      if (params.pageIndex == 0) assignedWorkEfforts = []
      logger.error(err)
    }

    commit(types.COUNT_ASSIGNED_WORK_EFFORTS_UPDATED, { assignedWorkEfforts, total, isScrollable })
  },
  setCountDetailPageActive({ commit }, isPageActive) {
    commit(types.COUNT_DETAIL_PAGE_ACTIVE_UPDATED, isPageActive);
  }
}

export default actions;	
