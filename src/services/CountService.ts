import api from '@/api';

const fetchCycleCounts = async (payload: any): Promise<any> => {
  return api({
    url: "cycleCounts",
    method: "GET",
    params: payload
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

export const CountService = {
  createCycleCount,
  deleteCycleCountItem,
  fetchCycleCounts,
  fetchCycleCountItems,
  updateCycleCount
}