import api from '@/api';

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
    method: "GET",
    params: { inventoryCountImportIds: JSON.stringify(payload.inventoryCountImportIds)}
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
  return api({
    url: `cycleCounts/${payload.inventoryCountImportId}`,
    method: "PUT",
    data: payload
  })
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

export const CountService = {
  addProductToCount,
  createCycleCount,
  deleteCycleCountItem,
  fetchCycleCount,
  fetchCycleCountStats,
  fetchCycleCounts,
  fetchCycleCountItems,
  updateCycleCount
}