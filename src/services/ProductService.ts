import { api } from '@/adapter';

const fetchProducts = async (query: any): Promise <any>  => {
  return api({
    url: "searchProducts", 
    method: "get",
    params: query,
    cache: true
  });
}

const importInventoryCount = async (query: any): Promise <any> => {
  return api({
    url: "importInventoryCount",
    method: "post",
    data: query
  })
}

const getFacilityLocations = async (payload: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "get",
    params: payload,
    cache: true
  });
}

const updateVariance = async (query: any): Promise<any> => {
  return api({
    url: "updateInventory",
    method: "post",
    data: query
  })
}

export const ProductService = {
  fetchProducts,
  importInventoryCount,
  getFacilityLocations,
  updateVariance
}