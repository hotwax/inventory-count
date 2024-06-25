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

export const CountService = {
  createCycleCount,
  fetchCycleCounts,
  fetchCycleCountItems,
  updateCycleCount
}