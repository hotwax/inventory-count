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
  async getCreatedAndAssignedWorkEfforts({ commit, state }, params) {
  let assignedWorkEfforts =
    params.pageIndex > 0 && state.assignedWorkEfforts
      ? JSON.parse(JSON.stringify(state.assignedWorkEfforts))
      : []

  let total = 0
  let isScrollable = true

  // Filter setup
  if (state.query.facilityIds.length) {
    params["facilityId"] = state.query.facilityIds.join(",")
    params["facilityId_op"] = "in"
  }

  try {
    // --- Single optimized API call ---
    const resp = await getWorkEfforts({
      pageSize: params.pageSize || process.env.VUE_APP_VIEW_SIZE,
      pageIndex: params.pageIndex || 0,
      facilityId: params.facilityId,
      currentStatusId: params.currentStatusId,
      currentStatusId_op: params.currentStatusId_op
    })

    if (!hasError(resp) && resp.data?.cycleCounts?.length > 0) {
      const workEfforts = resp.data.cycleCounts
      const totalCount = resp.data.cycleCountsCount || 0

      // --- Push fetched work efforts directly (sessions + lock already included) ---
      for (const workEffort of workEfforts) {
        assignedWorkEfforts.push({
          ...workEffort,
          sessions: workEffort.sessions || []
        })
      }

      total = totalCount

      // If total records <= current length, stop scrolling
      isScrollable = assignedWorkEfforts.length < totalCount
    } else {
      // Empty or failed fetch
      if (params.pageIndex > 0) {
        isScrollable = false
      } else {
        assignedWorkEfforts = []
      }
      throw resp.data;
    }
  } catch (err) {
    logger.error("Error fetching work efforts:", err)
    isScrollable = false
    if (params.pageIndex === 0) assignedWorkEfforts = []
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
  async getCycleCounts({ commit, state }, payload) {
  // Deep clone existing list if paging
  let counts =
    payload.pageIndex && payload.pageIndex > 0 && state.list
      ? JSON.parse(JSON.stringify(state.list))
      : []

  let total = 0
  let isScrollable = true

  const params = { ...payload }

  try {
    const resp = await getWorkEfforts(params)

    if (!hasError(resp) && resp.data?.cycleCounts?.length > 0) {
      const newCycleCounts = resp.data.cycleCounts

      if (payload.pageIndex && payload.pageIndex > 0) {
        counts = counts.concat(newCycleCounts)
      } else {
        counts = newCycleCounts
      }

      total = resp.data.cycleCountsCount || 0

      // Use total from backend to determine if scrolling should continue
      isScrollable = counts.length < total
    } else {
      // No data or failed fetch
      if (payload.pageIndex > 0) isScrollable = false
      else counts = []
      throw resp.data;
    }
  } catch (err) {
    isScrollable = false
    if (payload.pageIndex === 0) counts = []
    logger.error("Error fetching cycle counts:", err)
  }

  commit(types.COUNT_LIST_UPDATED, { list: counts, total, isScrollable })
},
  async clearCycleCountList({ commit }) {
    commit(types.COUNT_LIST_UPDATED, { list: [], total: 0 });
  }
}

export default actions;	
