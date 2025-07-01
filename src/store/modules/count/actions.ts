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

const actions: ActionTree<CountState, RootState> = {
  async fetchCycleCounts({ commit, dispatch, state }, payload) {
    let counts = state.list ? JSON.parse(JSON.stringify(state.list)) : [], total = 0;
    let isScrollable = true

    const params = {
      ...payload,
    }
    // TODO: Currently, the search functionality works only on the count name. Once the API supports searching across 
    // multiple fields, we should include the count ID in the search parameters.
    if(state.query.queryString.length) {
      params["countImportName"] = state.query.queryString
      params["countImportName_op"] = "contains"
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

    if(state.query.sortBy) {
      params["orderByField"] = state.query.sortBy
    }

    // created after date
    if(state.query.createdDate_from) {
      params["createdDate_from"] = convertIsoToMillis(state.query.createdDate_from, "from");
    }
    // created before date
    if(state.query.createdDate_thru) {
      params["createdDate_thru"] = convertIsoToMillis(state.query.createdDate_thru, "thru");
    }
    // closed after date
    if(state.query.closedDate_from) {
      params["closedDate_from"] = convertIsoToMillis(state.query.closedDate_from, "from");
    }
    // closed before date
    if(state.query.closedDate_thru) {
      params["closedDate_thru"] = convertIsoToMillis(state.query.closedDate_thru, "thru");
    }

    try {
      const resp = await CountService.fetchCycleCounts(params);
      if(!hasError(resp) && resp.data.length > 0) {
        if(payload.pageIndex && payload.pageIndex > 0) {
          counts = counts.concat(resp.data)
        } else {
          counts = resp.data
        }
        total = resp.data.length
        dispatch("fetchCycleCountStats", counts.map((count: any) => count.inventoryCountImportId))
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
    commit(types.COUNT_LIST_UPDATED, { counts, total , isScrollable })
  },

  async fetchClosedCycleCountsTotal({ commit, state }) {
    const params = {
      statusId: "INV_COUNT_COMPLETED, INV_COUNT_REJECTED",
      statusId_op: "in"
    } as any;
    // TODO: Currently, the search functionality works only on the count name. Once the API supports searching across 
    // multiple fields, we should include the count ID in the search parameters.
    if(state.query.queryString.length) {
      params["countImportName"] = state.query.queryString
      params["countImportName_op"] = "contains"
    }

    if(state.query.facilityIds.length) {
      params["facilityId"] = state.query.facilityIds.join(",")
      params["facilityId_op"] = "in"
    }

    // created after date
    if(state.query.createdDate_from) {
      params["createdDate_from"] = convertIsoToMillis(state.query.createdDate_from, "from");
    }
    // created before date
    if(state.query.createdDate_thru) {
      params["createdDate_thru"] = convertIsoToMillis(state.query.createdDate_thru, "thru");
    }
    // closed after date
    if(state.query.closedDate_from) {
      params["closedDate_from"] = convertIsoToMillis(state.query.closedDate_from, "from");
    }
    // closed before date
    if(state.query.closedDate_thru) {
      params["closedDate_thru"] = convertIsoToMillis(state.query.closedDate_thru, "thru");
    }

    let total = "";
    try {
      const resp = await CountService.fetchCycleCountsTotal(params);
      if(!hasError(resp)) {
        total = resp.data.count;
      } else {
        throw resp;
      }
    } catch(err) {
      logger.error(err)
    }

    commit(types.COUNT_CLOSED_CYCLE_COUNTS_TOTAL_UPDATED, total)
  },

  async fetchCycleCountStats({ commit, state }, inventoryCountImportIds) {
    const cachedProducts = JSON.parse(JSON.stringify(state.cachedUnmatchProducts))
    try {
      const resp = await CountService.fetchCycleCountStats({ inventoryCountImportIds });

      if(!hasError(resp) && resp.data?.importStats?.length > 0) {

        // Sorting the statusHistory based on statusDate, as in response we are getting this information sorted on statusId
        resp.data.importStats.map((stats: any) => {
          stats["totalItems"] = stats["totalItems"] + (cachedProducts[stats.inventoryCountImportId]?.length || 0)
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
        return resp.data.inventoryCountImportId
      } else {
        throw "Failed to create cycle count"
      }
    } catch(err) {
      logger.error(err)
      showToast(translate("Failed to create cycle count"))
      return undefined
    }
  },

  async updateQuery({ commit, dispatch }, payload) {
    commit(types.COUNT_QUERY_UPDATED, payload)

    // After updating query we need to fetch the counts and thus need to pass the statusId for the counts to be fetched
    // hence added check to decide the statusId on the basis of currently selected router
    let statusId = "INV_COUNT_CREATED"
    let statusId_op = "equals"
    if(router.currentRoute.value.name === "PendingReview") {
      statusId = "INV_COUNT_REVIEW"
    } else if(router.currentRoute.value.name === "Assigned") {
      statusId = "INV_COUNT_ASSIGNED"
    } else if(router.currentRoute.value.name === "Closed") {
      statusId = "INV_COUNT_COMPLETED, INV_COUNT_REJECTED",
      statusId_op = "in"
    }
    // append 'statusId_op' operator to support multiple status IDs filtering & equals for single status ID
    dispatch("fetchCycleCounts", { pageSize: process.env.VUE_APP_VIEW_SIZE, pageIndex: 0, statusId, statusId_op })
    if(payload.key && statusId.includes("INV_COUNT_COMPLETED")) dispatch("fetchClosedCycleCountsTotal")
  },

  async updateQueryString({ commit }, payload) {
    commit(types.COUNT_QUERY_UPDATED, payload)
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
        // Determine if more data can be fetched
        isScrollable = resp.data.length >= payload.pageSize
      } else {
        if (payload.pageIndex > 0) isScrollable = false
        throw "Failed to fetch the counts list"
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

  // Fetches cycle count items in batches, updates item status, optionally fetches stock & product data, and applies sorting if required
  async fetchCycleCountItems({commit, state} ,params) {
    let items = [] as any, resp, pageIndex = 0;
    const productStoreSettings = store.getters["user/getProductStoreSettings"];
    
    try {
      do {
        const payload = {
          "customParametersMap": {
            "inventoryCountImportId": params.inventoryCountImportId,
            "pageIndex": pageIndex,
            "pageSize": 100
          },
          "selectedEntity": "co.hotwax.warehouse.InventoryCountImportItem",
        }
        resp = await CountService.fetchCycleCountItems({ ...payload })
        if(!hasError(resp) && resp.data.entityValueList?.length) {
          items = items.concat(resp.data.entityValueList)
          // dispatch progress update after each batch
          commit(types.COUNT_ITEMS_UPDATED, { itemList: items })
        } else {
          throw resp.data;
        }
        pageIndex++;
      } while(resp.data.entityValueList?.length >= 100)
      } catch(err: any) {
      logger.error(err)
    }
    // Renaming 'statusId' to 'itemStatusId'
    items.forEach((item: any) => { item.itemStatusId = item.statusId; delete item.statusId; });
    // Fetch product stock if QOH display is enabled in store settings.
    if(productStoreSettings['showQoh']) this.dispatch("product/fetchProductStock", items[0].productId)
    this.dispatch("product/fetchProducts", { productIds: [...new Set(items.map((item: any) => item.productId))] })

    // If sorting is required, attach parentProductName and sort the list
    if(params.isSortingRequired) {
      const productList = store.getters["product/getCachedProducts"];
      items.forEach((item: any) => {
        const product = productList?.[item.productId];
        if(product?.parentProductName) item.parentProductName = product.parentProductName;
      });
      items = sortListByField(items, "parentProductName");
    }

    if(params.isHardCount) {
      const cachedProducts = state.cachedUnmatchProducts[params.inventoryCountImportId]?.length ? JSON.parse(JSON.stringify(state.cachedUnmatchProducts[params.inventoryCountImportId])) : [];
      if(cachedProducts?.length) items = items.concat(cachedProducts)
    }
    commit(types.COUNT_ITEMS_UPDATED, { itemList: items })
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
      const twentyFourHoursEarlier = DateTime.now().minus({ hours: 24 });
      const resp = await CountService.fetchCycleCountImportSystemMessages({
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

  async updateCachedUnmatchProducts({commit, state}, payload) {
    const cachedUnmatchProducts = JSON.parse(JSON.stringify(state.cachedUnmatchProducts));
    cachedUnmatchProducts[payload.id] = payload.unmatchedProducts;
    commit(types.COUNT_CACHED_UNMATCH_PRODUCTS_UPDATED, cachedUnmatchProducts)
  },

  async clearCurrentCountFromCachedUnmatchProducts({commit, state}, id) {
    const cachedUnmatchProducts = JSON.parse(JSON.stringify(state.cachedUnmatchProducts));
    if(Object.hasOwn(cachedUnmatchProducts, id)) {
      delete cachedUnmatchProducts[id]
      commit(types.COUNT_CACHED_UNMATCH_PRODUCTS_UPDATED, cachedUnmatchProducts)
    }
  },
}	

export default actions;	
