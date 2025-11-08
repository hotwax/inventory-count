import api, { client, getConfig } from '@/services/RemoteAPI';
import { hasError } from '@/utils';
import { transform } from 'node-json-transform';

const stockTransformRule = {
  item: {
    productId: "productId",
    availableToPromiseTotal: "atp",
    facilityId: "facilityId"
  }
}

enum OPERATOR {
  AND = 'AND',
  BETWEEN = 'between',
  CONTAINS = 'contains',
  EQUALS = 'equals',
  GREATER_THAN = 'greaterThan',
  GREATER_THAN_EQUAL_TO = 'greaterThanEqualTo',
  IN = 'in',
  LESS_THAN = 'lessThan',
  LESS_THAN_EQUAL_TO = 'lessThanEqualTo',
  LIKE = 'like',
  NOT = 'not',
  NOT_EMPTY = 'not-empty',
  NOT_EQUAL = 'notEqual',
  NOT_LIKE = 'notLike',
  OR = 'OR',
}
interface Response {
  code: string;
  message: string;
  messageList?: Array<string>;
  serverResponse?: any;
}
function jsonParse(value: any): any {
  let parsedValue;
  try {
    parsedValue = JSON.parse(value);
  } catch (e) {
    parsedValue = value;
  }
  return parsedValue;
}

interface RequestPayload {
  url: string;
  method: string;
  params?: any;
  baseURL?: string;
  headers?: any;
  data?: any;
}

const getAvailableTimeZones = async (): Promise <any>  => {
  try {
    const resp: any = await api({
      url: "admin/user/getAvailableTimeZones",
      method: "get",
      cache: true
    });

    return Promise.resolve(resp.data?.timeZones)
  } catch(error) {
    return Promise.reject({
      code: "error",
      message: "Failed to fetch available timezones",
      serverResponse: error
    })
  }
}

async function fetchFacilitiesByGroup(facilityGroupId: string, baseURL?: string, token?: string, payload?: any): Promise <any> {
  let params: RequestPayload = {
    url: "oms/groupFacilities",
    method: "GET",
    params: {
      facilityGroupId,
      pageSize: 500,
      ...payload
    }
  }

  let resp = {} as any;

  try {
    if(token && baseURL) {
      params = {
        ...params,
        baseURL,
        headers: {
          "api_key": token,
          "Content-Type": "application/json"
        }
      }
  
      resp = await client(params);
    } else {
      resp = await api(params);
    }

    // Filtering facilities on which thruDate is set, as we are unable to pass thruDate check in the api payload
    // Considering that the facilities will always have a thruDate of the past.
    const facilities = resp.data.filter((facility: any) => !facility.thruDate)
    return Promise.resolve(facilities)
  } catch(error) {
    return Promise.reject({
      code: "error",
      message: "Failed to fetch facilities for group",
      serverResponse: error
    })
  }
}

async function fetchFacilitiesByParty(partyId: string, baseURL?: string, token?: string, payload?: any): Promise <Array<any> | Response> {
  let params: RequestPayload = {
    url: `inventory-cycle-count/user/${partyId}/facilities`,
    method: "GET",
    params: {
      ...payload,
      pageSize: 500
    }
  }

  let resp = {} as any;

  try {
    if(token && baseURL) {
      params = {
        ...params,
        baseURL,
        headers: {
          "api_key": token,
          "Content-Type": "application/json"
        }
      }
  
      resp = await client(params);
    } else {
      resp = await api(params);
    }

    // Filtering facilities on which thruDate is set, as we are unable to pass thruDate check in the api payload
    // Considering that the facilities will always have a thruDate of the past.
    const facilities = resp.data.filter((facility: any) => !facility.thruDate)
    return Promise.resolve(facilities)
  } catch(error) {
    return Promise.reject({
      code: "error",
      message: "Failed to fetch user associated facilities",
      serverResponse: error
    })
  }
}

async function fetchFacilities(token: string, baseURL: string, partyId: string, facilityGroupId: string, isAdminUser: boolean, payload: Object): Promise <any> {
  let facilityIds: Array<string> = [];
  let filters: any = {};
  let resp = {} as any

  // Fetch the facilities associated with party
  if(partyId) {
    try {
      resp = await fetchFacilitiesByParty(partyId, baseURL, token)

      facilityIds = resp.map((facility: any) => facility.facilityId);
    } catch(error) {
      return error
    }
  }

  // Fetch the facilities associated with group
  if(facilityGroupId) {
    try {
      resp = await fetchFacilitiesByGroup(facilityGroupId, baseURL, token, filters)

      facilityIds = resp.map((facility: any) => facility.facilityId);
    } catch(error) {
      return error
    }
  }

  if(facilityIds.length) {
    filters = {
      facilityId: facilityIds.join(","),
      facilityId_op: "in",
      pageSize: facilityIds.length
    }
  }

  let params: RequestPayload = {
    url: "oms/facilities",
    method: "GET",
    params: {
      pageSize: 500,
      ...payload,
      ...filters
    }
  }

  let facilities: Array<any> = []

  try {
    if(token && baseURL) {
      params = {
        ...params,
        baseURL,
        headers: {
          "api_key": token,
          "Content-Type": "application/json"
        }
      }
  
      resp = await client(params);
    } else {
      resp = await api(params);
    }

    facilities = resp.data
  } catch(error) {
    return Promise.reject({
      code: "error",
      message: "Failed to fetch facilities",
      serverResponse: error
    })
  }

  return Promise.resolve(facilities)
}

async function getEComStores(token?: string, baseURL?: string, pageSize = 100): Promise <any> {
  let params: RequestPayload = {
    url: "oms/productStores",
    method: "GET",
    params: {
      pageSize
    }
  }

  let resp = {} as any;
  let stores: Array<any> = []

  try {
    if(token && baseURL) {
      params = {
        ...params,
        baseURL,
        headers: {
          "api_key": token,
          "Content-Type": "application/json"
        }
      }
  
      resp = await client(params);
    } else {
      resp = await api(params);
    }

    stores = resp.data
  } catch(error) {
    return Promise.reject({
      code: "error",
      message: "Failed to fetch product stores",
      serverResponse: error
    })
  }

  return Promise.resolve(stores)
}

async function getEComStoresByFacility(token?: string, baseURL?: string, pageSize = 100, facilityId?: any): Promise <any> {
  let params: RequestPayload = {
    url: `oms/facilities/${facilityId}/productStores`,
    method: "GET",
    params: {
      pageSize,
      facilityId
    }
  }

  let resp = {} as any;
  let stores: Array<any> = []

  try {
    if(token && baseURL) {
      params = {
        ...params,
        baseURL,
        headers: {
          "api_key": token,
          "Content-Type": "application/json"
        }
      }
  
      resp = await client(params);
    } else {
      resp = await api(params);
    }

    // Filtering stores on which thruDate is set, as we are unable to pass thruDate check in the api payload
    // Considering that the stores will always have a thruDate of the past.
    stores = resp.data.filter((store: any) => !store.thruDate)
  } catch(error) {
    return Promise.reject({
      code: "error",
      message: "Failed to fetch facility associated product stores",
      serverResponse: error
    })
  }

  if(!stores.length) return Promise.resolve(stores)

  // Fetching all stores for the store name
  let productStoresMap = {} as any;
  try {
    const productStores = await getEComStores(token, baseURL, 200);
    productStores.map((store: any) => productStoresMap[store.productStoreId] = store.storeName)
  } catch(error) {
    console.error(error);
  }

  stores.map((store: any) => store.storeName = productStoresMap[store.productStoreId])
  return Promise.resolve(stores)
}

async function getUserPreference(token: any, baseURL: string, preferenceKey: string, userId: any): Promise <any> {
  let params: RequestPayload = {
    url: "admin/user/preferences",
    method: "GET",
    params: {
      pageSize: 1,
      userId,
      preferenceKey
    }
  }

  let resp = {} as any;
  try {
    if(token && baseURL) {
      params = {
        ...params,
        baseURL,
        headers: {
          "api_key": token,
          "Content-Type": "application/json"
        }
      }
  
      resp = await client(params);
    } else {
      resp = await api(params);
    }

    return Promise.resolve(resp.data[0]?.preferenceValue ? jsonParse(resp.data[0]?.preferenceValue) : "")
  } catch(error) {
    return Promise.reject({
      code: "error",
      message: "Failed to get user preference",
      serverResponse: error
    })
  }
}

async function updateUserPreference(payload: any): Promise<any> {
  try {
    const resp = await api({
      url: "admin/user/preferences",
      method: "PUT",
      data: {
        userId: payload.userId,
        preferenceKey: payload.userPrefTypeId,
        preferenceValue: payload.userPrefValue,
      },
    }) as any;
    return Promise.resolve(resp.data)
  } catch(error: any) {
    return Promise.reject({
      code: "error",
      message: "Failed to update user preference",
      serverResponse: error
    })
  }
}

async function getProductIdentificationPref(productStoreId: any): Promise<any> {
  const productIdentifications = {
    primaryId: "productId",
    secondaryId: ""
  }

  try {
    const resp = await api({
      url: `oms/productStores/${productStoreId}/settings`,
      method: "GET",
      params: {
        productStoreId,
        settingTypeEnumId: "PRDT_IDEN_PREF"
      }
    }) as any;

    const settings = resp.data
    if(settings[0]?.settingValue) {
      const respValue = JSON.parse(settings[0].settingValue)
      productIdentifications['primaryId'] = respValue['primaryId']
      productIdentifications['secondaryId'] = respValue['secondaryId']
    } else {
      await createProductIdentificationPref(productStoreId)
    }
  } catch(error: any) {
    return Promise.reject({
      code: "error",
      message: "Failed to get product identification pref",
      serverResponse: error
    })
  }

  return productIdentifications;
}

async function createProductIdentificationPref(productStoreId: string): Promise<any> {
  const prefValue = {
    primaryId: "productId",
    secondaryId: ""
  }

  try {
    await api({
      url: `oms/productStores/${productStoreId}/settings`,
      method: "POST",
      data: {
        productStoreId,
        settingTypeEnumId: "PRDT_IDEN_PREF",
        settingValue: JSON.stringify(prefValue)
      }
    });
  } catch(err) {
    console.error(err)
  }

  // not checking for resp success and fail case as every time we need to update the state with the
  // default value when creating a pref
  return prefValue;
}


async function setProductIdentificationPref(productStoreId: string, productIdentificationPref: any): Promise<any> {
  let resp = {} as any, isSettingExists = false;

  try {
    resp = await api({
      url: `oms/productStores/${productStoreId}/settings`,
      method: "GET",
      params: {
        productStoreId,
        settingTypeEnumId: "PRDT_IDEN_PREF"
      }
    });

    if(resp.data[0]?.settingTypeEnumId) isSettingExists = true
  } catch(err) {
    console.error(err)
  }

  if(!isSettingExists) {
    return Promise.reject({
      code: "error",
      message: "product store setting is missing",
      serverResponse: resp.data
    })
  }

  try {
    resp = await api({
      url: `oms/productStores/${productStoreId}/settings`,
      method: "POST",
      data: {
        productStoreId,
        settingTypeEnumId: "PRDT_IDEN_PREF",
        settingValue: JSON.stringify(productIdentificationPref)
      }
    });

    return Promise.resolve(productIdentificationPref)
  } catch(error) {
    return Promise.reject({
      code: "error",
      message: "Failed to set product identification pref",
      serverResponse: error
    })
  }
}
export interface User {
  userId: string;
  username: string;
  userFullName: string;
  locale?: string;
  timeZone?: string;
  externalUserId?: string;
  emailAddress?: string;
  partyId?: string;
  facilities?: Array<{
    facilityId?: string;
    facilityName?: string;
    roleTypeId?: string;
    roleTypeDescription?: string;
  }>
}

const userProfileTransformRule = {
  item: {
    userId: "userLoginId",
    username: "userLoginId",
    userFullName: "partyName",
    emailAddress: "email",
    partyId: "partyId",
    timeZone: "userTimeZone",
    facilities: "facilities"
  },
  operate: [{
    run: function(facilities: any) {
      return facilities.map((facility: any) => ({
        facilityId: facility.facilityId,
        facilityName: facility.name,
        roleTypeId: facility.roleTypeId,
        roleTypeDescription: facility.roleTypeDescription
      }))
    },
    on: "facilities"
  }]
}

export { userProfileTransformRule }

async function getProfile(): Promise<User | Response> {
  try {
    const resp = await api({
      url: "user-profile", 
      method: "get",
    }) as any;

    if (resp.status === 200 && !hasError(resp)) {
      const user: User = transform(resp.data, userProfileTransformRule)

      return Promise.resolve(user);
    } else {
      return Promise.reject({
        code: 'error',
        message: 'Failed to fetch user profile information',
        serverResponse: resp.data
      })
    }
  } catch(err) {
    return Promise.reject({
      code: 'error',
      message: 'Something went wrong',
      serverResponse: err
    })
  }
}

async function omsSetProductIdentificationPref(eComStoreId: string, productIdentificationPref: any): Promise<any> {

  let isSettingExists = false;

  const payload = {
    "inputFields": {
      "productStoreId": eComStoreId,
      "settingTypeEnumId": "PRDT_IDEN_PREF"
    },
    "entityName": "ProductStoreSetting",
    "fieldList": ["productStoreId", "settingTypeEnumId"],
    "viewSize": 1
  }

  try {
    const resp = await api({
      url: "performFind",
      method: "get",
      params: payload,
      cache: true
    }) as any;
    if(!hasError(resp) && resp.data.docs?.length) {
      isSettingExists = true
    }
  } catch(err) {
    console.error(err)
  }

  // when fromDate is not found then reject the call with a message
  if(!isSettingExists) {
    return Promise.reject('product store setting is missing');
  }

  const params = {
    "productStoreId": eComStoreId,
    "settingTypeEnumId": "PRDT_IDEN_PREF",
    "settingValue": JSON.stringify(productIdentificationPref)
  }

  try {
    const resp = await api({
      url: "service/updateProductStoreSetting",
      method: "post",
      data: params
    }) as any;

    if(!hasError(resp)) {
      return Promise.resolve(productIdentificationPref)
    } else {
      return Promise.reject({
        code: 'error',
        message: 'Failed to set product identification pref',
        serverResponse: resp.data
      })
    }
  } catch(err) {
    return Promise.reject({
      code: 'error',
      message: 'Something went wrong',
      serverResponse: err
    })
  }
}

async function omsCreateProductIdentificationPref(eComStoreId: string): Promise<any> {
  const prefValue = {
    primaryId: 'productId',
    secondaryId: ''
  }

  const params = {
    "productStoreId": eComStoreId,
    "settingTypeEnumId": "PRDT_IDEN_PREF",
    "settingValue": JSON.stringify(prefValue)
  }

  try {
    await api({
      url: "service/createProductStoreSetting",
      method: "post",
      data: params
    });
  } catch(err) {
    console.error(err)
  }

  // not checking for resp success and fail case as every time we need to update the state with the
  // default value when creating a pref
  return prefValue;
}

async function omsGetProductIdentificationPref(eComStoreId: string): Promise<any> {

  const productIdentifications = {
    'primaryId': 'productId',
    'secondaryId': ''
  }

  const payload = {
    "inputFields": {
      "productStoreId": eComStoreId,
      "settingTypeEnumId": "PRDT_IDEN_PREF"
    },
    "entityName": "ProductStoreSetting",
    "fieldList": ["settingValue", "settingTypeEnumId"],
    "viewSize": 1
  }

  try {
    const resp = await api({
      url: "performFind",
      method: "get",
      params: payload,
      cache: true
    }) as any;

    if(!hasError(resp) && resp.data.docs[0].settingValue) {
      const respValue = JSON.parse(resp.data.docs[0].settingValue)
      productIdentifications['primaryId'] = respValue['primaryId']
      productIdentifications['secondaryId'] = respValue['secondaryId']
    } else if(resp.data.error === "No record found") {  // TODO: remove this check once we have the data always available by default
      await omsCreateProductIdentificationPref(eComStoreId)
    }
  } catch(err) {
    console.error(err)
  }

  return productIdentifications
}


async function logout(): Promise<any> {
  try {
    const resp: any = await api({
      url: "logout",
      method: "get"
    });

    if(resp.status != 200) {
      throw resp.data;
    }

    return Promise.resolve(resp.data)
  } catch(err) {
    return Promise.reject({
      code: 'error',
      message: 'Something went wrong',
      serverResponse: err
    })
  }
}

async function omsGetUserFacilities(token: any, baseURL: string, partyId: string, facilityGroupId: any, isAdminUser = false, payload?: any): Promise<any> {
  try {
    const params = {
      "inputFields": {} as any,
      "filterByDate": "Y",
      "viewSize": 200,
      "distinct": "Y",
      "noConditionFind" : "Y",
    } as any
    
    if (facilityGroupId) {
      params.entityName = "FacilityGroupAndParty";
      params.fieldList = ["facilityId", "facilityName", "sequenceNum"];
      params.fromDateName = "FGMFromDate";
      params.thruDateName = "FGMThruDate";
      params.orderBy = "sequenceNum ASC | facilityName ASC";
      params.inputFields["facilityGroupId"] = facilityGroupId;
    } else {
      params.entityName = "FacilityAndParty";
      params.fieldList = ["facilityId", "facilityName"];
      params.inputFields["facilityParentTypeId"] = "VIRTUAL_FACILITY";
      params.inputFields["facilityParentTypeId_op"] = "notEqual";
      params.orderBy = "facilityName ASC";
    }
    if (!isAdminUser) {
      params.inputFields["partyId"] = partyId;
    }
    let resp = {} as any;
    resp = await client({
      url: "performFind",
      method: "get",
      baseURL,
      params,
      headers: {
        Authorization:  'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    });
    if (resp.status === 200 && !hasError(resp)) {
      return Promise.resolve(resp.data.docs);
    } else {
      return Promise.reject({
        code: 'error',
        message: 'Failed to fetch user facilities',
        serverResponse: resp.data
      })
    }
  } catch(error: any) {
    return Promise.reject({
      code: 'error',
      message: 'Something went wrong',
      serverResponse: error
    })

  }
}

async function omsGetUserPreference(token: any, baseURL: string, userPrefTypeId: string): Promise<any> {
  try {
    const resp = await client({
      url: "service/getUserPreference",
      method: "post",
      data: { userPrefTypeId },
      baseURL,
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    });
    if (hasError(resp)) {
      throw resp.data
    }
    return Promise.resolve(jsonParse(resp.data.userPrefValue));
  } catch (err) {
    return Promise.reject({
      code: 'error',
      message: 'Something went wrong',
      serverResponse: err
    })
  }
}

async function omsSetUserPreference(payload: any): Promise<any> {
  try {
    const resp: any = await api({
      url: "service/setUserPreference",
      method: "post",
      data: {
        userPrefTypeId: payload.userPrefTypeId,
        userPrefValue: payload.userPrefValue,
      }
    });

    if (!hasError(resp)) {
      return Promise.resolve(resp.data)
    } else {
      throw resp.data
    }
  } catch (err) {
    return Promise.reject({
      code: 'error',
      message: 'Something went wrong',
      serverResponse: err
    })
  }
}

const setUserLocale = async (payload: any): Promise<any> => {
  try {
    const resp: any = await api({
      url: "setUserLocale",
      method: "post",
      data: payload
    })

    if (!hasError(resp)) {
      return Promise.resolve(resp.data)
    } else {
      throw resp.data
    }
  } catch (error) {
    return Promise.reject({
      code: 'error',
      message: 'Something went wrong',
      serverResponse: error
    })
  }
}

const setUserTimeZone = async (payload: any): Promise<any> => {
  try {
    const resp: any = await api({
      url: "setUserTimeZone",
      method: "post",
      data: payload
    });

    if (!hasError(resp)) {
      return Promise.resolve(resp.data)
    } else {
      throw resp.data
    }
  } catch (error) {
    return Promise.reject({
      code: 'error',
      message: 'Something went wrong',
      serverResponse: error
    })
  }
}

const omsGetAvailableTimeZones = async (): Promise <any>  => {
  try {
    const resp: any = await api({
      url: "getAvailableTimeZones",
      method: "get",
      cache: true
    });

    if (!hasError(resp)) {
      return Promise.resolve(resp.data)
    } else {
      throw resp.data
    }
  } catch (error) {
    return Promise.reject({
      code: 'error',
      message: 'Something went wrong',
      serverResponse: error
    })
  }
}

async function omsGetEComStoresByFacility(token: any, baseURL: string, vSize = 100, facilityId?: string): Promise<Response> {

  if (!facilityId) {
    return Promise.reject({
      code: 'error',
      message: 'FacilityId is missing',
      serverResponse: 'FacilityId is missing'
    });
  }

  const filters = {
    facilityId: facilityId
  } as any;

  const params = {
    "inputFields": {
      "storeName_op": "not-empty",
      ...filters
    },
    "viewSize": vSize,
    "fieldList": ["productStoreId", "storeName", "productIdentifierEnumId"],
    "entityName": "ProductStoreFacilityDetail",
    "distinct": "Y",
    "noConditionFind": "Y",
    "filterByDate": 'Y',
  };

  try {
    const resp = await client({
      url: "performFind",
      method: "get",
      baseURL,
      params,
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    });
    if (resp.status === 200 && !hasError(resp)) {
      return Promise.resolve(resp.data.docs);
    } else {
      throw resp.data
    }
  } catch(error) {
    return Promise.reject({
      code: 'error',
      message: 'Something went wrong',
      serverResponse: error
    })
  }
}

async function omsGetEComStores(token: any, baseURL: string, vSize = 100): Promise<any> {
  const params = {
    "viewSize": vSize,
    "fieldList": ["productStoreId", "storeName", "productIdentifierEnumId"],
    "entityName": "ProductStore",
    "distinct": "Y",
    "noConditionFind": "Y"
  };

  try {
    const resp = await client({
      url: "performFind",
      method: "get",
      baseURL,
      params,
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    }) as any;
    if(!hasError(resp)) {
      return Promise.resolve(resp.data.docs);
    } else {
      throw resp.data
    }
  } catch(error) {
    return Promise.reject({
      code: 'error',
      message: 'Something went wrong',
      serverResponse: error
    })
  }
}

export interface Uom {
  uomId: string;
  uomTypeEnumId?: string;
  abbreviation?: string;
  description?: string;
}

export interface Enumeration {
  enumId?: string;
  enumTypeId?: string;
  parentEnumId?: string;
  enumCode?: string;
  sequenceNum?: number;
  description?: string;
  optionValue?: string;
  optionIndicator?: string;
  relatedEnumId?: string;
  relatedEnumTypeId?: string;
  statusFlowId?: string;
}

export interface Geo {
  geoId?: string;
  geoTypeEnumId?: string;
  geoName?: string;
  geoNameLocal?: string;
  geoCodeAlpha2?: string;
  geoCodeAlpha3?: string;
  geoCodeNumeric?: string;
  wellKnownText?: string;
}
export interface Stock {
  assetId?: string;
  parentAssetId?: string;
  assetTypeEnumId?: Enumeration;
  classEnumId?: Enumeration;
  statusId?: string;
  ownerPartyId?: string;
  assetPoolId?: string;
  productId?: string;
  hasQuantity?: string;
  quantityOnHandTotal?: number;
  availableToPromiseTotal?: number;
  originalQuantity?: number;
  originalQuantityUomId?: Uom;
  assetName?: string;
  comments?: string;
  serialNumber?: string;
  softIdentifier?: string;
  activationNumber?: string;
  capacity?: number;
  capacityUomId?: string;
  facilityId?: string;
  locationSeqId?: string;
  containerId?: string;
  shipmentBoxTypeId?: string;
  lotId?: string;
  geoPointId?: string;
  originId?: string;
  originFacilityId?: string;
  acquireOrderId?: string;
  acquireOrderItemSeqId?: string;
  acquireShipmentId?: string;
  acquireCost?: string;
  acquireCostUomId?: string;
}

async function fetchProductsStockAtFacility(productIds: Array<string>, facilityId?: string): Promise<Array<Stock> | Response> {
  // There is a limitation at API level to handle only 100 records
  // but as we will always fetch data for the fetched records which will be as per the viewSize
  // assuming that the value will never be 100 to show

  // When facility is not being passed stock for all the facilities will be fetched
  const query = {
    "filters": {
      "productId": productIds,
      "productId_op": OPERATOR.IN
    },
    "viewSize": productIds.length * 10, // TODO: find a better way to find viewSize, currently assuming that a single product can be at most available on 10 facilities
    "fieldsToSelect": ["productId", "atp", "facilityId"]
  } as any

  // support to get stock for a specific facility
  if (facilityId) {
    query.filters["facilityId"] = facilityId
    query.viewSize = productIds.length // kept viewSize equal to productsIds length as we only want stock at a single facility and at max we can find all the products
  }

  try {
    const resp = await api({
      url: "checkInventory",
      method: "get",
      params: query
    }) as any;

    if (resp.status === 200 && !hasError(resp) && resp.data.count > 0) {
      const productsStock: Array<Stock> = transform(resp.data.docs, stockTransformRule)

      return Promise.resolve(productsStock)
    } else {
      return Promise.reject({
        code: "error",
        message: "Unable to find the stock for products",
        serverResponse: resp.data
      })
    }
  } catch(err) {
    return Promise.reject({
      code: "error",
      message: "Something went wrong",
      serverResponse: err
    })
  }
}

/*
Fetches sum of stock for products on all the facilities
*/
async function fetchProductsStock(productIds: Array<string>): Promise<Array<Stock> | Response> {
  // There is a limitation at API level to handle only 100 records
  // but as we will always fetch data for the fetched records which will be as per the viewSize
  // assuming that the value will never be 100 to show

  const query = {
    "filters": {
      "productId": productIds,
      "productId_op": OPERATOR.IN
    },
    "viewSize": productIds.length,
    "fieldsToSelect": ["productId", "atp"]
  } as any

  try {
    const resp = await api({
      url: "checkInventory",
      method: "get",
      params: query
    }) as any;

    if (resp.status === 200 && !hasError(resp) && resp.data.count > 0) {
      const productsStock: Array<Stock> = transform(resp.data.docs, stockTransformRule)

      return Promise.resolve(productsStock)
    } else {
      return Promise.reject({
        code: "error",
        message: "Unable to find the stock for products",
        serverResponse: resp.data
      })
    }
  } catch(err) {
    return Promise.reject({
      code: "error",
      message: "Something went wrong",
      serverResponse: err
    })
  }
}

async function fetchProducts(params: any): Promise<any | Response> {

  const payload = {
    "json": {
      "params": {
        "rows": params.viewSize,
        "start": params.viewIndex
      },
      "query": "*:*",
      "filter": "docType: PRODUCT"
    } as any
  }

  const queryFields = params.queryFields ? params.queryFields : "productId productName internalName";

  // checking that if the params has filters, and then adding the filter values in the payload filter
  // for each key present in the params filters
  if (params.filters) {
    Object.keys(params.filters).map((key: any) => {
      const filterValue = params.filters[key].value;

      if (Array.isArray(filterValue)) {
        const filterOperator = params.filters[key].op ? params.filters[key].op : OPERATOR.OR ;
        payload.json.filter += ` ${OPERATOR.AND} ${key}: (${filterValue.join(' ' + filterOperator + ' ')})`
      } else {
        payload.json.filter += ` ${OPERATOR.AND} ${key}: ${filterValue}`
      }
    })
  }

  if (params.queryString) {
    // TODO: need to check how to handle the case when we want to make exact search match
    payload.json.query = `(*${params.queryString}*)`
    payload.json.params['qf'] = queryFields
    payload.json.params['defType'] = "edismax"
  }

  try {
    const resp = await api({
      url: "solr-query",
      method: "post",
      data: payload,
      cache: true
    }) as any;

    if (resp.status == 200 && !hasError(resp) && resp.data?.response?.numFound > 0) {

      const product: Array<Product> = transform(resp.data.response.docs, productTransformRule)

      return {
        products: product,
        total: resp.data?.response?.numFound
      }
    } else {
      return {
        products: {},
        total: 0
      }
    }
  } catch (err) {
    return Promise.reject({
      code: 'error',
      message: 'Something went wrong',
      serverResponse: err
    })
  }
}

export interface ProductAssoc {
  productId?: string;
  toProductId?: string;
  productAssocTypeEnumId?: string;
  fromDate?: string;
  thruDate?: string;
  sequenceNum?: number;
  reason?: string;
  quantity?: number;
  scrapFactor?: number;
  instruction?: string;
  routingWorkEffortId?: string;
  type?: Enumeration;
  toProduct?: Product;
}
export interface Status {
  statusId: string;
  statusTypeId?: string;
  statusCode?: string;
  description?: string;
}
export interface PartyIdentification {
  partyId: string;
  partyIdTypeEnumId: string;
  idValue?: string;
  issuedBy?: string;
  issuedByPartyId?: string;
  expireDate?: string;
  type?: Enumeration;
}
export interface Party {
  partyId?: string;
  pseudoId?: string;
  partyTypeEnumId?: string;
  disabled?: string;
  customerStatusId?: string;
  ownerPartyId?: string;
  externalId?: string;
  dataSourceId?: string;
  gatewayCimId?: string;
  comments?: string;
  shippingInstructions?: string;
  hasDuplicates?: string;
  lastDupCheckDate?: string;
  mergedToPartyId?: string;
  type?: Enumeration;
  organization?: {
    partyId: string;
    organizationName?: string;
  };
  person?: {
    partyId: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
  };
  identifications?: Array<PartyIdentification>;
  contactMechs?: Array<{
    partyId: string;
    contactMechId: string;
    contactMechPurposeId: string;
    fromDate: string;
    thruDate?: string;
    extension?: string;
    comments?: string;
    allowSolicitation?: string;
    usedSince?: string;
    usedUntil?: string;
    verifyCode?: string;
    verifyCodeDate?: string;
    verifyCodeAttempts?: number;
    contactMech?: ContactMech;
    purpose?: {
      contactMechPurposeId: string;
      contactMechTypeEnumId?: string;
      description?: string;
    };
  }>;
}
export interface ContactMech {
  contactMechId?: string;
  contactMechTypeEnumId?: string;
  dataSourceId?: string;
  infoString?: string;
  gatewayCimId?: string;
  trustLevelEnumId?: string;
  validateMessage?: string;
  paymentFraudEvidenceId?: string;
  replacesContactMechId?: string;
  telecomNumber?: {
    contactMechId: string;
    countryCode?: string;
    areaCode?: string;
    contactNumber?: string;
    askForName?: string;
  };
  postalAddress?: {
    contactMechId: string;
    toName?: string;
    attnName?: string;
    address1?: string;
    address2?: string;
    unitNumber?: string;
    directions?: string;
    city?: string;
    cityGeoId?: string;
    schoolDistrictGeoId?: string;
    countyGeoId?: string;
    stateProvinceGeoId?: string;
    countryGeoId?: string;
    postalCode?: string;
    postalCodeExt?: string;
    postalCodeGeoId?: string;
    geoPointId?: string;
    commercial?: string;
    accessCode?: string;
    telecomContactMechId?: string;
    emailContactMechId?: string;
    shipGatewayAddressId?: string;
    cityGeo?: Geo;
    countyGeo?: Geo;
    stateProvinceGeo?: Geo;
    postalCodeGeo?: Geo;
    countryGeo?: Geo;
    telecomContactMech?: string;
    emailContactMech?: string;
  };
}
export interface Product {
  productId: string;
  pseudoId?: string;
  productTypeEnumId?: string;
  productClassEnumId?: string;
  assetTypeEnumId?: string;
  assetClassEnumId?: string;
  statusId?: string;
  ownerPartyId?: string;
  productName?: string;
  description?: string;
  comments?: string;
  salesIntroductionDate?: string;
  salesDiscontinuationDate?: string;
  salesDiscWhenNotAvail?: string;
  supportDiscontinuationDate?: string;
  requireInventory?: string;
  chargeShipping?: string;
  signatureRequiredEnumId?: string;
  shippingInsuranceReqd?: string;
  inShippingBox?: string;
  defaultShipmentBoxTypeId?: string;
  taxable?: string;
  taxCode?: string;
  returnable?: string;
  amountUomId?: string;
  amountFixed?: number;
  amountRequire?: string;
  originGeoId?: string;
  type?: Enumeration;
  class?: Enumeration;
  assetType?: Enumeration;
  assetClass?: Enumeration;
  status?: Status;
  originGeo?: Geo;
  defaultBoxType?: {
    shipmentBoxTypeId?: string;
    pseudoId?: string;
    description?: string;
    dimensionUomId?: string;
    boxLength?: number;
    boxWidth?: number;
    boxHeight?: number;
    weightUomId?: string;
    boxWeight?: number;
    defaultGrossWeight?: number;
    capacityUomId?: string;
    boxCapacity?: number;
    gatewayBoxId?: string;
  };
  amountUom?: Uom;
  assocs?: Array<ProductAssoc>;
  toAssocs?: Array<ProductAssoc>;
  contents?: Array<{
    productContentId?: string;
    productId?: string;
    contentLocation?: string;
    productContentTypeEnumId?: string;
    locale?: string;
    productFeatureId?: string;
    productStoreId?: string;
    fromDate?: string;
    thruDate?: string;
    description?: string;
    sequenceNum?: number;
    userId?: string;
  }>;
  dimensions?: Array<{
    productId?: string;
    dimensionTypeId?: string;
    value?: number;
    valueUomId?: string;
  }>;
  geos?: Array<{
    productId?: string;
    geoId?: string;
    productGeoPurposeEnumId?: string;
    description?: string;
    geo?: Geo;
  }>;
  identifications?: Array<{
    productId?: string;
    productIdTypeEnumId?: string;
    idValue?: string;
  }>;
  parties?: Array<{
    productId?: string;
    partyId?: string;
    roleTypeId?: string;
    fromDate?: string;
    thruDate?: string;
    sequenceNum?: number;
    comments?: string;
    otherPartyItemName?: string;
    otherPartyItemId?: string;
    party?: Party;
    role?: {
      roleTypeId?: string;
      parentTypeId?: string;
      description?: string;
    };
  }>;
  prices?: Array<{
    productPriceId?: string;
    productId?: string;
    productStoreId?: string;
    vendorPartyId?: string;
    customerPartyId?: string;
    priceTypeEnumId?: string;
    pricePurposeEnumId?: string;
    fromDate?: string;
    thruDate?: string;
    minQuantity?: number;
    price?: number;
    priceUomId?: string;
    termUomId?: string;
    taxInPrice?: string;
    taxAmount?: number;
    taxPercentage?: number;
    taxAuthorityId?: string;
    agreementId?: string;
    agreementItemSeqId?: string;
    otherPartyItemName?: string;
    otherPartyItemId?: string;
    comments?: string;
    quantityIncrement?: number;
    quantityIncluded?: number;
    quantityUomId?: string;
    preferredOrderEnumId?: string;
    supplierRatingTypeEnumId?: string;
    standardLeadTimeDays?: number;
    canDropShip?: string;
  }>;
  categories?: Array<{
    productCategoryId?: string;
    productId?: string;
    fromDate?: string;
    thruDate?: string;
    comments?: string;
    sequenceNum?: number;
    quantity?: number;
    category: {
      pseudoId: string;
      ownerPartyId: string;
      productCategoryTypeEnumId: string;
      categoryName: string;
    };
  }>;
  features?: Array<{
    productFeatureId?: string;
    desc?: string;
    value?: string;
  }>;
  images?: {
    [x: string]: string;
  };
  sku?: string;
  parent?: {
    [x: string]: string;
  };
  variants?: Array<string>;
  brandName?: string;
}

async function fetchProductsGroupedBy(params: any): Promise<any | Response> {

  const payload = {
    "json": {
      "params": {
        "group": true,
        "group.field": params.groupField,
        "group.limit": params.groupLimit ? params.groupLimit : 10000,
        "group.ngroups": params.ngroups ? params.ngroups : true,
        "rows": params.viewSize,
        "start": params.viewIndex,
        "q.op": OPERATOR.AND
      },
      "query": "*:*",
      "filter": "docType: PRODUCT"
    } as any
  }

  const queryFields = params.queryFields ? params.queryFields : "productId productName internalName";

  // checking that if the params has filters, and then adding the filter values in the payload filter
  // for each key present in the params filters
  if (params.filters) {
    Object.keys(params.filters).map((key: any) => {
      const filterValue = params.filters[key].value;

      if (Array.isArray(filterValue)) {
        const filterOperator = params.filters[key].op ? params.filters[key].op : OPERATOR.OR ;
        payload.json.filter += ` ${OPERATOR.AND} ${key}: (${filterValue.join(' ' + filterOperator + ' ')})`
      } else {
        payload.json.filter += ` ${OPERATOR.AND} ${key}: ${filterValue}`
      }
    })
  }

  if (params.queryString) {
    // TODO: need to check how to handle the case when we want to make exact search match
    payload.json.query = `(*${params.queryString}*)`
    payload.json.params['qf'] = queryFields
    payload.json.params['defType'] = "edismax"
  }

  try {
    const resp = await api({
      url: "solr-query",
      method: "get",
      params: payload,
      cache: true
    }) as any;

    if (resp.status == 200 && !hasError(resp) && resp.data?.grouped?.groupId.ngroups > 0) {

      const products = resp.data.grouped.groupId.groups.map((group: any) => {
        const variants: Array<Product> = transform(group.doclist.docs, productTransformRule)
        return {
          groupValue: group.groupValue,
          variants
        }
      })

      return {
        products,
        matches: resp.data?.grouped?.groupId.matches,
        ngroups: resp.data?.grouped?.groupId.ngroups
      }
    } else {
      return {
        products: {},
        matches: 0,
        ngroups: 0
      }
    }
  } catch (err) {
    return Promise.reject({
      code: 'error',
      message: 'Something went wrong',
      serverResponse: err
    })
  }
}

async function fetchProductsGroupedByParent(params: any): Promise<Product[] | Response> {

  const payload = {
    ...params,
    "groupField": "groupId",
    "groupLimit": 10000,
    "ngroups": true
  }

  return await fetchProductsGroupedBy(payload);
}

async function omsFetchGoodIdentificationTypes(parentTypeId: string = "HC_GOOD_ID_TYPE"): Promise<any> {
  const payload = {
    "inputFields": {
      "parentTypeId": parentTypeId,
    },
    "fieldList": ["goodIdentificationTypeId", "description"],
    "viewSize": 50,
    "entityName": "GoodIdentificationType",
    "noConditionFind": "Y"
  }
  try {
    const resp = await api({
      url: "performFind",
      method: "get",
      params: payload
    }) as any

    if (!hasError(resp)) {
      return Promise.resolve(resp.data.docs)
    } else {
      throw resp.data;
    }
  } catch (err) {
    return Promise.reject({
      code: 'error',
      message: 'Something went wrong',
      serverResponse: err
    })
  }
}

const fetchGoodIdentificationTypes = async (parentTypeId = "HC_GOOD_ID_TYPE"): Promise <any>  => {
  try {
    const resp: any = await api({
      url: "oms/goodIdentificationTypes",
      method: "get",
      params: {
        parentTypeId,
        pageSize: 50
      }
    });

    return Promise.resolve(resp.data)
  } catch(error) {
    return Promise.reject({
      code: 'error',
      message: 'Failed to fetch good identification types',
      serverResponse: error
    })
  }
}

const setUserPreference = async (payload: any) => {
  const apiConfig = getConfig() as any;
  if(apiConfig.systemType === "MOQUI") {
    return await updateUserPreference(payload) // moquiIndex
  } else {
    return await omsSetUserPreference(payload)
  }
}

const productTransformRule = {
  item: {
    productId: "productId",
    pseudoId: "internalName",
    productName: "productName",
    salesIntroductionDate: "introductionDate",
    variants: "variantProductIds",
    parent: {
      "productName": "parentProductName",
      "id": "groupId"
    },
    images: {
      mainImageUrl: "mainImageUrl",
      additionalImageUrls: "additionalImageUrls"
    },
    features: "productFeatures",
    identifications: "goodIdentifications",
    brandName: "brandName",
    sku: "sku"
  },
  operate: [{
    run: function(features: any) {
      // Used productFeatures that contains values in the format(featureId/featureValue)
      if (features) {
        const productFeatures = features?.reduce((acc: any, feature: any) => {
          const key = feature.split('/')[0]
          const value = feature.split('/')[1]
          if (acc[key]) {
            acc[key].push(value)
          } else {
            acc[key] = [value]
          }
          return acc;
        }, {})

        return Object.keys(productFeatures).map((key: string) => ({
          "desc": key,
          "value": productFeatures[key]
        }))
      }
    },
    on: "features"
  }, {
    run: function(identifications: Array<string>) {
      // used goodIdentifications that contains values in the format(id/value OR id/child-id/value)
      if (identifications?.length) {
        return identifications.map((identification: string) => {
          // using lastIndexOf `/` as some of the identifiers are in the format `ABC/abc/123` and thus to handle check for `ABC/abc`
          const index = identification.lastIndexOf('/')
          const key = identification.slice(0, index);
          const value = identification.slice(index + 1)
          return {
            productIdTypeEnumId: key,
            idValue: value
          }
        })
      }

      return []
    },
    on: "identifications"
  }]
}

async function getUserFacilities(token: any, baseURL: string, partyId: string, facilityGroupId: any, isAdminUser = false, payload = {}) {
  const apiConfig = getConfig() as any;
  if(apiConfig.systemType === "MOQUI") {
    return await fetchFacilities(token, baseURL, partyId, facilityGroupId, isAdminUser, payload) // moquiIndex
  } else {
    return await omsGetUserFacilities(token, baseURL, partyId, facilityGroupId, isAdminUser, payload)
  }
}

export {
  getProfile,
  logout,
  omsGetAvailableTimeZones,
  omsGetUserFacilities,
  omsGetEComStoresByFacility,
  omsGetEComStores,
  omsGetProductIdentificationPref,
  omsGetUserPreference,
  omsSetProductIdentificationPref,
  omsSetUserPreference,
  setUserLocale,
  setUserTimeZone,
  client,
  fetchProductsStock,
  fetchProductsStockAtFacility,
  fetchGoodIdentificationTypes,
  getAvailableTimeZones,
  getEComStores,
  getEComStoresByFacility,
  getProductIdentificationPref,
  getUserFacilities,
  getUserPreference,
  setProductIdentificationPref,
  setUserPreference,
  fetchFacilities,
  fetchFacilitiesByParty,
  fetchFacilitiesByGroup,
  updateUserPreference,
  fetchProducts, 
  fetchProductsGroupedBy, 
  fetchProductsGroupedByParent, 
  omsFetchGoodIdentificationTypes
}