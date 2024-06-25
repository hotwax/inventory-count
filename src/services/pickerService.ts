import api from '@/api';

const fetchCycleCounts = async (query: any): Promise <any> => {
  return api({
    url: "cycleCounts",
    method: "get",
    params: query
  })
}

const fetchCycleCount = async (query: any): Promise <any> => {
  return api({
    url: `cycleCounts/${query}`,
    method: "get",
  })
}

const fetchCycleCountItems = async (payload: any): Promise<any> => {
  return api({
    url: `cycleCounts/${payload}/items`,
    method: "get"
  })
}

const updateCount = async (payload: any): Promise<any> => {
  return api({
    url: `cycleCounts/${payload.inventoryCountImportId}/items/${payload.importItemSeqId}`,
    method: "put",
    data: payload
  })
}


export const pickerService = {
  fetchCycleCounts,
  fetchCycleCountItems,
  fetchCycleCount,
  updateCount,
}