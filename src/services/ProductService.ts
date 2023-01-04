import api from '@/api';

const importInventoryCount = async (query: any): Promise <any> => {
  return api({
    url: "importInventoryCount",
    method: "post",
    data: query
  })
}

const getFacilityLocations = async (payload: any): Promise<any> => {
  return api({
    url: "/performFind",
    method: "POST",
    data: payload
  });
}

export const ProductService = {
  importInventoryCount,
  getFacilityLocations
}