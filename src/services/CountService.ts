import api from '@/api';
import { client } from '@/api';
import store from '@/store';
import logger from '@/logger';
import { hasError } from '@/utils';

const fetchCycleCounts = async (payload: any): Promise<any> => {
  return api({
    url: "cycleCounts",
    method: "GET",
    params: payload
  })
}

const fetchCycleCountStats = async (payload: any): Promise<any> => {
  return api({
    url: "cycleCounts/stats",
    method: "POST",
    data: payload
  })
}

const fetchCycleCount = async (inventoryCountImportId: string): Promise<any> => {
  return api({
    url: `cycleCounts/${inventoryCountImportId}`,
    method: "GET"
  })
}

const fetchCycleCountItems = async (payload: any): Promise<any> => {
  return api({
    url: `cycleCounts/${payload.inventoryCountImportId}/items`,
    method: "GET",
    params: payload
  })
}

const fetchCycleCountItemsView = async (payload: any): Promise <any>  => {
  const url = store.getters["user/getBaseUrl"];
  const token = store.getters["user/getUserToken"]
  const baseURL = url.startsWith("http") ? url.includes("/rest/s1/inventory-cycle-count") ? url.replace("/inventory-cycle-count", "") : `${url}/rest/s1` : `https://${url}.hotwax.io/rest/s1`;

  return await client({
    url: `/oms/entityData`,
    method: "POST",
    baseURL,
    data: payload,
    headers: {
      Api_Key: token,
      'Content-Type': 'application/json'
    }
  });
}

const fetchCycleCountItemsCount = async (payload: any): Promise<any> => {
  return api({
    url: `cycleCounts/${payload.inventoryCountImportId}/items/count`,
    method: "GET",
    params: payload
  })
}

const fetchBulkCycleCountItems = async (payload: any): Promise<any> => {
  return api({
    url: "cycleCounts/items",
    method: "GET",
    params: payload
  })
}

const createCycleCount = async (payload: any): Promise<any> => {
  return api({
    url: "cycleCounts",
    method: "POST",
    data: payload
  })
}

const updateCycleCount = async (payload: any): Promise<any> => {
  try {
    const resp = await api({
      url: `cycleCounts/${payload.inventoryCountImportId}`,
      method: "PUT",
      data: payload
    }) as any

    if(!hasError(resp)) {
      return Promise.resolve(resp.data?.inventoryCountImportId)
    } else {
      throw "Failed to update cycle count information"
    }
  } catch(err) {
    logger.error(err)
    return Promise.reject("Failed to update cycle count information")
  }
}

const deleteCycleCountItem = async (payload: any): Promise<any> => {
  return api({
    url: `cycleCounts/${payload.inventoryCountImportId}/items/${payload.importItemSeqId}`,
    method: "DELETE"
  })
}

const addProductToCount = async (payload: any): Promise<any> => {
  return api({
    url: `cycleCounts/${payload.inventoryCountImportId}/items/add`,
    method: "POST",
    data: payload
  })
}

const updateProductsInCount = async (payload: any): Promise<any> => {
  return api({
    url: `cycleCounts/${payload.inventoryCountImportId}/items/update`,
    method: "POST",
    data: payload
  })
}

const recountItems = async (payload: any): Promise<any> => {
  return api({
    url: `cycleCounts/${payload.inventoryCountImportId}/items/recount`,
    method: "POST",
    data: payload
  })
}

const updateCount = async (payload: any): Promise<any> => {
  return api({
    url: `cycleCounts/${payload.inventoryCountImportId}/items/${payload.importItemSeqId}`,
    method: "put",
    data: payload
  })
}

const acceptItem = async (payload: any): Promise<any> => {
  return api({
    url: `cycleCounts/${payload.inventoryCountImportId}/items/${payload.importItemSeqId}/accept`,
    method: "POST",
    data: payload
  })
}

const bulkUploadInventoryCounts = async (payload: any): Promise <any>  => {
  return api({
    url: `cycleCounts/upload`,
    method: "post",
    ...payload
  });
}
const fetchCycleCountImportSystemMessages = async (payload: any): Promise <any>  => {
  return api({
    url: `cycleCounts/systemMessages`,
    method: "get",
    params: payload
  });
}
const cancelCycleCountFileProcessing = async (payload: any): Promise <any>  => {
  return api({
    url: `cycleCounts/systemMessages/${payload.systemMessageId}`,
    method: "post",
    data: payload
  });
}

const fetchCycleCountImportErrors = async (payload: any): Promise <any>  => {
  return api({
    url: `cycleCounts/systemMessages/${payload.systemMessageId}/errors`,
    method: "get",
    data: payload
  });
}

const fetchCycleCountUploadedFileData = async (payload: any): Promise <any> => {
  return api({
    url: `cycleCounts/systemMessages/${payload.systemMessageId}/downloadFile`,
    method: "get",
    data: payload
  });
}

const fetchCycleCountsTotal = async (payload: any): Promise<any> => {
  return api({
    url: "cycleCounts/count",
    method: "get",
    params: payload
  })
}

export const CountService = {
  acceptItem,
  addProductToCount,
  bulkUploadInventoryCounts,
  cancelCycleCountFileProcessing,
  createCycleCount,
  deleteCycleCountItem,
  fetchBulkCycleCountItems,
  fetchCycleCountImportErrors,
  fetchCycleCountImportSystemMessages,
  fetchCycleCountUploadedFileData,
  fetchCycleCount,
  fetchCycleCountStats,
  fetchCycleCounts,
  fetchCycleCountItems,
  fetchCycleCountItemsView,
  fetchCycleCountItemsCount,
  fetchCycleCountsTotal,
  recountItems,
  updateCount,
  updateCycleCount,
  updateProductsInCount
}