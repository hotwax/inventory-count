import { api } from '@/adapter';
import { hasError } from "@/utils";

const fetchProducts = async (query: any): Promise <any>  => {
  return api({
    url: "solr-query", 
    method: "post",
    data: query,
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

const getCurrentFacilityLocation = async (facilityId: string): Promise<any> => {
  let locationSeqId;
  try {
    const params = {
      "inputFields": {
        facilityId
      },
      "viewSize": 1,
      "entityName": "FacilityLocation",
      "fieldList": ["areaId", "aisleId", "sectionId", "levelId", "positionId", "locationSeqId"]
    }

    const resp = await ProductService.getFacilityLocations(params);
    if (!hasError(resp) && resp.data.docs.length) {
      locationSeqId = resp.data.docs[0].locationSeqId
    }
  } catch (err) {
    console.error(err);
  }
  return locationSeqId;
}

const createProductFacilityLocation = async (payload: any): Promise<any> => {
  return api({
    url: "service/createProductFacilityLocation",
    method: "post",
    data: payload
  });
}

export const ProductService = {
  addProductToFacility,
  createProductFacilityLocation,
  fetchProducts,
  importInventoryCount,
  isProductFacilityAssocExists,
  getCurrentFacilityLocation,
  getFacilityLocations,
  updateVariance
}