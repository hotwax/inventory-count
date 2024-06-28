import api from '@/api';

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

export const CountService = {
  addProductToCount,
  createCycleCount,
  deleteCycleCountItem,
  fetchCycleCount,
  fetchCycleCountStats,
  fetchCycleCounts,
  fetchCycleCountItems,
  recountItems,
  updateCycleCount,
  updateProductsInCount
}