import api from '@/api';

const fetchCycleCount = async (query: any): Promise <any> => {
  return api({
    url: "cycleCounts",
    method: "get",
    data: query
  })
}


export const pickerService = {
  fetchCycleCount
}