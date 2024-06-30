import api from '@/api';
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
  const params = new URLSearchParams();

  payload.inventoryCountImportIds.map((id: string) => {
    params.append("inventoryCountImportIds", id)
  })

  return api({
    url: "cycleCounts/stats",
    method: "GET",
    params
  })
}

const fetchCycleCount = async (inventoryCountImportId: string): Promise<any> => {
  return api({
    url: `cycleCounts/${inventoryCountImportId}`,
    method: "GET"
  })
}

const fetchCycleCountItems = async (inventoryCountImportId: string): Promise<any> => {
  return api({
    url: `cycleCounts/${inventoryCountImportId}/items`,
    method: "GET"
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

export const CountService = {
  addProductToCount,
  createCycleCount,
  deleteCycleCountItem,
  fetchCycleCount,
  fetchCycleCountStats,
  fetchCycleCounts,
  fetchCycleCountItems,
  recountItems,
  updateCount,
  updateCycleCount,
  updateProductsInCount
}