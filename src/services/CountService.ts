import api from '@/api';
import logger from '@/logger';
import { hasError } from '@/utils';

const fetchCycleCounts = async (payload: any): Promise<any> => {
  return api({
    url: "inventory-cycle-count/cycleCounts",
    method: "GET",
    params: payload
  })
}

const fetchCycleCountStats = async (payload: any): Promise<any> => {
  return api({
    url: "inventory-cycle-count/cycleCounts/stats",
    method: "POST",
    data: payload
  })
}

const fetchCycleCount = async (inventoryCountImportId: string): Promise<any> => {
  return api({
    url: `inventory-cycle-count/cycleCounts/${inventoryCountImportId}`,
    method: "GET"
  })
}

const fetchCycleCountItems = async (payload: any): Promise<any> => {
  return api({
    url: `inventory-cycle-count/cycleCounts/${payload.inventoryCountImportId}/items`,
    method: "GET",
    params: payload
  })
}

const fetchCycleCountItem = async (payload: any): Promise<any> => {
  try {
    const resp = await api({
      url: `inventory-cycle-count/cycleCounts/${payload.inventoryCountImportId}/items`,
      method: "GET",
      params: payload
    }) as any;
    if(!hasError(resp) && resp.data?.itemList?.length) {
      return resp.data.itemList[0]
    } else {
      throw resp.data;
    }
  } catch(error: any) {
    logger.error(error)
  }

  return {}
}
const fetchCycleCountItemsSummary = async (payload: any): Promise <any>  => {
  return api({
    url: `inventory-cycle-count/cycleCounts/${payload.inventoryCountImportId}/items/summary`,
    method: "GET",
    params: payload
  });
}

const fetchCycleCountItemsCount = async (payload: any): Promise<any> => {
  return api({
    url: `inventory-cycle-count/cycleCounts/${payload.inventoryCountImportId}/items/count`,
    method: "GET",
    params: payload
  })
}

const fetchBulkCycleCountItems = async (payload: any): Promise<any> => {
  return api({
    url: "inventory-cycle-count/cycleCounts/items",
    method: "GET",
    params: payload
  })
}

const createCycleCount = async (payload: any): Promise<any> => {
  return api({
    url: "inventory-cycle-count/cycleCounts",
    method: "POST",
    data: payload
  })
}

const updateCycleCount = async (payload: any): Promise<any> => {
  try {
    const resp = await api({
      url: `inventory-cycle-count/cycleCounts/${payload.inventoryCountImportId}`,
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
    url: `inventory-cycle-count/cycleCounts/${payload.inventoryCountImportId}/items/${payload.importItemSeqId}`,
    method: "DELETE"
  })
}

const addProductToCount = async (payload: any): Promise<any> => {
  return api({
    url: `inventory-cycle-count/cycleCounts/${payload.inventoryCountImportId}/items/add`,
    method: "POST",
    data: payload
  })
}

const updateProductsInCount = async (payload: any): Promise<any> => {
  return api({
    url: `inventory-cycle-count/cycleCounts/${payload.inventoryCountImportId}/items/update`,
    method: "POST",
    data: payload
  })
}

const recountItems = async (payload: any): Promise<any> => {
  return api({
    url: `inventory-cycle-count/cycleCounts/${payload.inventoryCountImportId}/items/recount`,
    method: "POST",
    data: payload
  })
}

const updateCount = async (payload: any): Promise<any> => {
  return api({
    url: `inventory-cycle-count/cycleCounts/${payload.inventoryCountImportId}/items/${payload.importItemSeqId}`,
    method: "put",
    data: payload
  })
}

const acceptItem = async (payload: any): Promise<any> => {
  return api({
    url: `inventory-cycle-count/cycleCounts/${payload.inventoryCountImportId}/items/${payload.importItemSeqId}/accept`,
    method: "POST",
    data: payload
  })
}

const bulkUploadInventoryCounts = async (payload: any): Promise <any>  => {
  return api({
    url: `inventory-cycle-count/cycleCounts/upload`,
    method: "post",
    ...payload
  });
}
const fetchCycleCountImportSystemMessages = async (payload: any): Promise <any>  => {
  return api({
    url: `inventory-cycle-count/cycleCounts/systemMessages`,
    method: "get",
    params: payload
  });
}
const cancelCycleCountFileProcessing = async (payload: any): Promise <any>  => {
  return api({
    url: `inventory-cycle-count/cycleCounts/systemMessages/${payload.systemMessageId}`,
    method: "post",
    data: payload
  });
}

const fetchCycleCountImportErrors = async (payload: any): Promise <any>  => {
  return api({
    url: `inventory-cycle-count/cycleCounts/systemMessages/${payload.systemMessageId}/errors`,
    method: "get",
    data: payload
  });
}

const fetchCycleCountUploadedFileData = async (payload: any): Promise <any> => {
  return api({
    url: `inventory-cycle-count/cycleCounts/systemMessages/${payload.systemMessageId}/downloadFile`,
    method: "get",
    data: payload
  });
}

const fetchCycleCountsTotal = async (payload: any): Promise<any> => {
  return api({
    url: "inventory-cycle-count/cycleCounts/count",
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
  fetchCycleCountItem,
  fetchCycleCountItems,
  fetchCycleCountItemsCount,
  fetchCycleCountItemsSummary,
  fetchCycleCountsTotal,
  recountItems,
  updateCount,
  updateCycleCount,
  updateProductsInCount
}