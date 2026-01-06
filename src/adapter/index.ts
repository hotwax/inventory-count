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
      url: "getAvailableTimeZones",
      method: "get",
      cache: true
    });
    return Promise.resolve(resp.data)
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

async function omsGetUserFacilities(partyId: string, facilityGroupId: any, isAdminUser = false): Promise<any> {
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
      params.fieldList = ["facilityId", "facilityName", "sequenceNum", "facilityTypeId"];
      params.fromDateName = "FGMFromDate";
      params.thruDateName = "FGMThruDate";
      params.orderBy = "sequenceNum ASC | facilityName ASC";
      params.inputFields["facilityGroupId"] = facilityGroupId;
    } else {
      params.entityName = "FacilityAndParty";
      params.fieldList = ["facilityId", "facilityName", "facilityTypeId"];
      params.inputFields["facilityParentTypeId"] = "VIRTUAL_FACILITY";
      params.inputFields["facilityParentTypeId_op"] = "notEqual";
      params.orderBy = "facilityName ASC";
    }
    if (!isAdminUser) {
      params.inputFields["partyId"] = partyId;
    }
    let resp = {} as any;
    resp = await api({
      url: "performFind",
      method: "get",
      params,
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

async function getUserPreference(token: any, baseURL: string, userPrefTypeId: string): Promise<any> {
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
  let resp = {} as any;
  let isSettingExists = false;

  const payload = {
    "inputFields": {
      "productStoreId": productStoreId,
      "settingTypeEnumId": "PRDT_IDEN_PREF",
      "filterByDate": "Y"
    },
    "entityName": "ProductStoreSetting",
    "fieldList": ["productStoreId", "settingTypeEnumId", "fromDate"],
    "viewSize": 1
  }

  try {
    resp = await api({
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
  try {
    resp = await api({
      url: `service/updateProductStoreSetting`,
      method: "POST",
      data: {
        productStoreId,
        fromDate: resp.data.docs[0].fromDate,
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
      url: "setUserTimeZone",
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

const setUserPreference = async (payload: any) => {
  try {
    const resp = await api({
      url: "service/setUserPreference",
      method: "POST",
      data: {
        userPrefTypeId: payload.userPrefTypeId,
        userPrefValue: payload.userPrefValue,
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

async function getUserFacilities(partyId: string, facilityGroupId: any, isAdminUser = false) {
  return await omsGetUserFacilities(partyId, facilityGroupId, isAdminUser)
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

async function getEComStoresByFacility(token: any, baseURL: string, vSize = 100, facilityId?: string): Promise<any> {

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

async function getEComStores(vSize = 100): Promise<any> {
  const params = {
    "viewSize": vSize,
    "fieldList": ["productStoreId", "storeName", "productIdentifierEnumId"],
    "entityName": "ProductStore",
    "distinct": "Y",
    "noConditionFind": "Y"
  };

  try {
    const resp = await api({
      url: "performFind",
      method: "get",
      params
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
  updateSecurityGroupPermission
}