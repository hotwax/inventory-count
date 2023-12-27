import { api } from '@/adapter';
import { hasError } from "@/utils";

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

const isProductFacilityAssocExists = async (productId: string, facilityId: string): Promise<any> => {
  try {

    const resp = await api({
      url: 'performFind',
      method: 'POST',
      data: {
        "inputFields": {
          facilityId: facilityId,
          productId: productId,
        },
        "viewSize": 1,
        "entityName": "ProductFacility",
        "fieldList": ["productId", "facilityId"],
        noConditionFind: 'Y'
      }
    }) as any
    if (!hasError(resp) && resp.data.docs.length) {
      return true
    }
    return false
  } catch (err) {
    return false
  }
}

const addProductToFacility = async (payload: any): Promise<any> => {
  return api({
    url: "service/addProductToFacility",
    method: "post",
    data: payload
  });
}

export const ProductService = {
  addProductToFacility,
  fetchProducts,
  importInventoryCount,
  isProductFacilityAssocExists,
  getFacilityLocations,
  updateVariance
}