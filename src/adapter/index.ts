import api, { client } from '@/services/RemoteAPI';
import { hasError } from '@/stores/authStore';
import { transform } from 'node-json-transform';

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
          "Authorization": `Bearer ${token}`,
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
          "Authorization": `Bearer ${token}`,
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

async function fetchFacilities(token: string, baseURL: string, partyId: string, facilityGroupId: string, isAdminUser: boolean, payload: any): Promise <any> {
  let facilityIds: Array<string> = [];
  let filters: any = {};
  let resp = {} as any

  // Fetch the facilities associated with party
  if(partyId) {
    try {
      resp = await fetchFacilitiesByParty(partyId, baseURL, token)

      facilityIds = resp.map((facility: any) => facility.facilityId);
      if (!facilityIds.length) {
        return Promise.reject({
          code: 'error',
          message: 'Failed to fetch user facilities',
          serverResponse: resp.data
        })
      }
    } catch(error) {
      return Promise.reject({
        code: 'error',
        message: 'Failed to fetch user facilities',
        serverResponse: error
      })
    }
  }

  // Fetch the facilities associated with group
  if(facilityGroupId) {
    try {
      resp = await fetchFacilitiesByGroup(facilityGroupId, baseURL, token, filters)

      facilityIds = resp.map((facility: any) => facility.facilityId);
      if (!facilityIds.length) {
        return Promise.reject({
          code: 'error',
          message: 'Failed to fetch user facilities',
          serverResponse: resp.data
        })
      }
    } catch(error) {
      return Promise.reject({
        code: 'error',
        message: 'Failed to fetch user facilities',
        serverResponse: error
      })
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
          "Authorization": `Bearer ${token}`,
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
          "Authorization": `Bearer ${token}`,
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
          "Authorization": `Bearer ${token}`,
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
  const productStoresMap = {} as any;
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
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
  
      resp = await client(params);
    } else {
      resp = await api(params);
    }

    return Promise.resolve(resp.data[0]?.preferenceValue ? jsonParse(resp.data[0]?.preferenceValue).toString() : "")
  } catch(error) {
    return Promise.reject({
      code: "error",
      message: "Failed to get user preference",
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

async function setUserTimeZone(payload: any): Promise<any> {
  try {
    const resp = await api({
      url: "admin/user/profile",
      method: "POST",
      data: payload,
    }) as any;
    return Promise.resolve(resp);
  } catch (error: any) {
    return Promise.reject({
      code: "error",
      message: "Failed to set user time zone",
      serverResponse: error
    });
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

async function getUserFacilities(token: any, baseURL: string, partyId: string, facilityGroupId: any, isAdminUser = false, payload = {}) {
  return await fetchFacilities(token, baseURL, partyId, facilityGroupId, isAdminUser, payload)
}

const getSecurityGroupAndPermissions = async (payload: any) => {
    const {
      dataDocumentId,
      filterByDate,
      fieldsToSelect,
      distinct,
      pageSize,
      ...customParametersMap
    } = payload || {};

    return await api({
      url: `oms/dataDocumentView`,
      method: 'POST',
      data: {
        dataDocumentId: dataDocumentId || 'SecurityGroupAndPermission',
        filterByDate: filterByDate != null ? filterByDate : true,
        fieldsToSelect: fieldsToSelect || '',
        distinct: distinct != null ? distinct : '',
        pageIndex: 0,
        pageSize: pageSize || 100,
        customParametersMap
      }
    });
}

const createSecurityGroupPermission = async (payload: {
  groupId: string;
  permissionId: string;
  fromDate: number;
}) => {
  return await api({
    url: `admin/permissions/${payload.permissionId}`,
    method: "POST",
    data: payload,
  });
}

const updateSecurityGroupPermission = async (payload: {
  groupId: string;
  permissionId: string;
  fromDate?: number;
  thruDate: number;
}) => {
  return await api({
    url: `admin/permissions/${payload.permissionId}`,
    method: "PUT",
    data: payload,
  });
}

async function fetchShopifyShopLocation(payload: {
  shopifyLocationId: string,
  pageSize: number
}): Promise<any> {
  try {
    const resp = await api({
      url: "oms/shopifyShops/locations",
      method: "GET",
      params: payload
    }) as any;

    return Promise.resolve(resp.data[0]?.facilityId)
  } catch(error) {
    return Promise.reject({
      code: "error",
      message: "Failed to fetch location information",
      serverResponse: error
    })
  }
}

export {
  createSecurityGroupPermission,
  getProfile,
  omsGetAvailableTimeZones,
  setUserLocale,
  setUserTimeZone,
  client,
  fetchGoodIdentificationTypes,
  getAvailableTimeZones,
  getEComStores,
  getEComStoresByFacility,
  getProductIdentificationPref,
  getSecurityGroupAndPermissions,
  getUserFacilities,
  getUserPreference,
  setProductIdentificationPref,
  setUserPreference,
  fetchFacilities,
  fetchFacilitiesByParty,
  fetchFacilitiesByGroup,
  fetchShopifyShopLocation,
  updateSecurityGroupPermission
}