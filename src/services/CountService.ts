import api from '@/api';

const fetchCycleCounts = async (): Promise<any> => {
  return api({
    url: "cycleCounts",
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

export const CountService = {
  createCycleCount,
  fetchCycleCounts
}