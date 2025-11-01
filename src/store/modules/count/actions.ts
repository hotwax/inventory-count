import { ActionTree } from "vuex"
import RootState from "@/store/RootState"
import CountState from "./CountState"
import * as types from "./mutation-types"
import { useInventoryCountImport } from "@/composables/useInventoryCountImport"
import { hasError } from "@/utils"
import logger from "@/logger";
import { DateTime } from "luxon"
const { getInventoryCountImportsByWorkEffort, fetchCycleCountImportSystemMessages, getWorkEfforts } = useInventoryCountImport();
const actions: ActionTree<CountState, RootState> = {
  async getAssignedWorkEfforts({ commit, state }, params) {
    let assignedWorkEfforts = (params.pageIndex > 0 && state.assignedWorkEfforts) ? JSON.parse(JSON.stringify(state.assignedWorkEfforts)) : []   
    let total = 0
    let isScrollable = true

    if (state.query.facilityIds.length) {
      params["facilityId"] = state.query.facilityIds.join(",")
      params["facilityId_op"] = "in"
    }
    params["orderByField"] = "lastUpdatedStamp"

    try {
      const resp = await getWorkEfforts(params)
      if (!hasError(resp) && resp.data.length > 0) {
        const workEfforts = resp.data

        // For each workEffort, fetch InventoryCountImport details
        for (const workEffort of workEfforts) {
          try {
            const inventoryResp = await getInventoryCountImportsByWorkEffort({
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
  async fetchCycleCountImportSystemMessages({ commit }) {
    let systemMessages;
    try {
      const twentyFourHoursEarlier = DateTime.now().minus({ hours: 24 });
      const resp = await fetchCycleCountImportSystemMessages({
        systemMessageTypeId: "ImportInventoryCounts",
        initDate_from: twentyFourHoursEarlier.toMillis(),
        orderByField: 'initDate desc, processedDate desc',
        pageSize: 100
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
  setCountDetailPageActive({ commit }, isPageActive) {
    commit(types.COUNT_DETAIL_PAGE_ACTIVE_UPDATED, isPageActive);
  },
  async getCycleCounts ({ commit, state }, payload) {
    
    // Deep clone and initialize total
    let counts = state.list ? JSON.parse(JSON.stringify(state.list)) : [];
    let total = 0;
    let isScrollable = true

    const params = {
      ...payload,
    }

    try {
      const resp = await getWorkEfforts(params);
      if(!hasError(resp) && resp.data.length > 0) {
        if(payload.pageIndex && payload.pageIndex > 0) {
          counts = counts.concat(resp.data)
        } else {
          counts = resp.data
        }
        total = resp.data.length
        // Determine if more data can be fetched
        isScrollable = resp.data.length >= payload.pageSize
      } else {
        if (payload.pageIndex > 0) isScrollable = false
        throw "Failed to fetch the counts"
      }
    } catch(err) {
      isScrollable = false
      if(payload.pageIndex == 0) counts = []
      logger.error(err)
    }
    commit(types.COUNT_LIST_UPDATED, { list: counts, total, isScrollable });
  },
  async clearCycleCountList({ commit }) {
    commit(types.COUNT_LIST_UPDATED, { list: [], total: 0 });
  }
}

export default actions;	
