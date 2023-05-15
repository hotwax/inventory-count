import { api, client } from '@/adapter'
import store from '@/store';
import { hasError } from '@/utils'
const login = async (username: string, password: string): Promise <any> => {
  return api({
    url: "login", 
    method: "post",
    data: {
      'USERNAME': username, 
      'PASSWORD': password
    }
  });
}

const getUserProfile = async (token: any): Promise<any> => {
  const baseURL = store.getters['user/getBaseUrl'];
  try {
    const resp = await client({
      url: "user-profile",
      method: "get",
      baseURL,
      headers: {
        Authorization:  'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    });
    if(hasError(resp)) return Promise.reject("Error getting user profile: " + JSON.stringify(resp.data));
    if(resp.data.facilities.length === 0 ) return Promise.reject("User is not associated with any facility: " + JSON.stringify(resp.data));
    return Promise.resolve(resp.data)
  } catch(error: any) {
    return Promise.reject(error)
  }
}

const checkPermission = async (payload: any): Promise <any>  => {
  let baseURL = store.getters['user/getInstanceUrl'];
  baseURL = baseURL && baseURL.startsWith('http') ? baseURL : `https://${baseURL}.hotwax.io/api/`;
  return client({
    url: "checkPermission",
    method: "post",
    baseURL: baseURL,
    ...payload
  });
}

const getAvailableTimeZones = async (): Promise <any>  => {
  return api({
    url: "getAvailableTimeZones",
    method: "get",
    cache: true
  });
}
const setUserTimeZone = async (payload: any): Promise <any>  => {
  return api({
    url: "setUserTimeZone",
    method: "post",
    data: payload
  });
}
const getQOHViewConfig = async (token: any, productStoreId: any): Promise<any> => {
  const baseURL = store.getters['user/getBaseUrl'];
  try {
    const params = {
      "inputFields": {
        "productStoreId": productStoreId,
        "settingTypeEnumId": "INV_CNT_VIEW_QOH"
      },
      "filterByDate": 'Y',
      "entityName": "ProductStoreSetting",
      "fieldList": ["settingTypeEnumId", "settingValue", "fromDate"],
      "viewSize": 1
    }
    const resp = await client({
      url: "performFind",
      method: "get",
      params,
      baseURL,
      headers: {
        Authorization:  'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    });
    // In all cases we resolve to empty object, as default option would be to hide QOH
    return Promise.resolve(!hasError(resp) && resp.data.docs?.length ? resp.data.docs[0] : {});
  } catch(error: any) {
    return Promise.resolve({})
  }
}
const updateQOHViewConfig = async (payload: any): Promise<any> => {
  return api({
    url: "service/updateProductStoreSetting",
    method: "post",
    data: payload
  });
}

const getUserPermissions = async (payload: any, token: any): Promise<any> => {
  const baseURL = store.getters['user/getBaseUrl'];
  let serverPermissions = [] as any;

  // If the server specific permission list doesn't exist, getting server permissions will be of no use
  // It means there are no rules yet depending upon the server permissions.
  if (payload.permissionIds && payload.permissionIds.length == 0) return serverPermissions;
  // TODO pass specific permissionIds
  let resp;
    // TODO Make it configurable from the environment variables.
    // Though this might not be an server specific configuration, 
    // we will be adding it to environment variable for easy configuration at app level
    const viewSize = 200;

    try {
      const params = {
        "viewIndex": 0,
        viewSize,
        permissionIds: payload.permissionIds
      }
      resp = await client({
        url: "getPermissions",
        method: "post",
        baseURL,
        data: params,
        headers: {
          Authorization:  'Bearer ' + token,
          'Content-Type': 'application/json'
        }
      })
      if(resp.status === 200 && resp.data.docs?.length && !hasError(resp)) {
        serverPermissions = resp.data.docs.map((permission: any) => permission.permissionId);
        const total = resp.data.count;
        const remainingPermissions = total - serverPermissions.length;
        if (remainingPermissions > 0) {
          // We need to get all the remaining permissions
          const apiCallsNeeded = Math.floor(remainingPermissions / viewSize) + ( remainingPermissions % viewSize != 0 ? 1 : 0);
          const responses = await Promise.all([...Array(apiCallsNeeded).keys()].map(async (index: any) => {
            const response = await client({
              url: "getPermissions",
              method: "post",
              baseURL,
              data: {
                "viewIndex": index + 1,
                viewSize,
                permissionIds: payload.permissionIds
              },
              headers: {
                Authorization:  'Bearer ' + token,
                'Content-Type': 'application/json'
              }
            })
            if(!hasError(response)){
              return Promise.resolve(response);
              } else {
              return Promise.reject(response);
              }
          }))
          const permissionResponses = {
            success: [],
            failed: []
          }
          responses.reduce((permissionResponses: any, permissionResponse: any) => {
            if (permissionResponse.status !== 200 || hasError(permissionResponse) || !permissionResponse.data?.docs) {
              permissionResponses.failed.push(permissionResponse);
            } else {
              permissionResponses.success.push(permissionResponse);
            }
            return permissionResponses;
          }, permissionResponses)

          serverPermissions = permissionResponses.success.reduce((serverPermissions: any, response: any) => {
            serverPermissions.push(...response.data.docs.map((permission: any) => permission.permissionId));
            return serverPermissions;
          }, serverPermissions)

          // If partial permissions are received and we still allow user to login, some of the functionality might not work related to the permissions missed.
          // Show toast to user intimiting about the failure
          // Allow user to login
          // TODO Implement Retry or improve experience with show in progress icon and allowing login only if all the data related to user profile is fetched.
          if (permissionResponses.failed.length > 0) Promise.reject("Something went wrong while getting complete user permissions.");
        }
      }
      return serverPermissions;
    } catch(error: any) {
      return Promise.reject(error);
    }
}
const getCurrentEComStore = async (token: any, facilityId: any): Promise<any> => {
  // If the facilityId is not provided, it may be case of user not associated with any facility or the logout
  if (!facilityId) {
    return Promise.resolve({});
  }
  const baseURL = store.getters['user/getBaseUrl'];
  try {
    const params = {
      "inputFields": {
        "facilityId": facilityId,
      },
      "fieldList": ["storeName", "productStoreId"], 
      "entityName": "ProductStoreFacilityDetail",
      "distinct": "Y",
      "noConditionFind": "Y",
      "filterByDate": 'Y',
      "viewSize": 1

    }   
    const resp = await client({
      url: "performFind",
      method: "get",
      params,
      baseURL,
      headers: {
        Authorization:  'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    });
    if (hasError(resp)) {
      return Promise.reject(resp.data);
    }   
    return Promise.resolve(resp.data.docs?.length ? resp.data.docs[0] : {});
  } catch(error: any) {
    return Promise.reject(error)
  }
}

export const UserService = {
    login,
    getAvailableTimeZones,
    getCurrentEComStore,
    getQOHViewConfig,
    getUserPermissions,
    getUserProfile,
    setUserTimeZone,
    checkPermission,
    updateQOHViewConfig
}