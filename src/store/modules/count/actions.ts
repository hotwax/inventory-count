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
                sessions: inventoryResp.data || []
              })
            }
          } catch (err) {
            logger.error(`Error fetching inventory imports for workEffortId ${workEffort.workEffortId}:`, err)
          }
        }
        console.log("These are counts: ", assignedWorkEfforts);
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
  async getCycleCounts ({commit}, payload) {
    let workEfforts = [];
    console.log("This is payload again from the: ", payload);
    try {
      const resp = await CountService.getWorkEfforts(payload);
      if (!resp || resp.status !== 200 || hasError(resp)) {
        console.error(resp);
        return;
      }

      workEfforts = resp.data;
      const total = workEfforts?.length;
      const isScrollable = total > payload.pageSize;
    
      if (payload.currentStatusId === 'CYCLE_CNT_IN_CMPLTD') {
        console.log("In Review");
        commit(types.COUNT_IN_REVIEW_WORK_EFFORTS_UPDATED, { inReviewWorkEfforts: workEfforts, total, isScrollable })
      } else if (payload.currentStatusId === 'CYCLE_CNT_CREATED') {
        console.log("In Created");
        commit(types.COUNT_DRAFT_WORK_EFFORTS_UPDATED, { draftWorkEfforts: workEfforts, total, isScrollable })
      } else if (payload.currentStatusId === 'CYCLE_CNT_IN_PRGS') {
        console.log("In Progress");
        commit(types.COUNT_ASSIGNED_WORK_EFFORTS_UPDATED, { assignedWorkEfforts: workEfforts, total, isScrollable })
      } else if (payload.currentStatusId === "CYCLE_CNT_IN_CLOSED") {
        console.log("In Closed");
        commit(types.COUNT_CLOSED_WORK_EFFORTS_UPDATED, { closedWorkEfforts: workEfforts, total, isScrollable })
      }
    } catch (error) {
      console.error(error);
    }
  },
  setCountDetailPageActive({ commit }, isPageActive) {
    commit(types.COUNT_DETAIL_PAGE_ACTIVE_UPDATED, isPageActive);
  }
}

export default actions;	
