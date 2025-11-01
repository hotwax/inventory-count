import api, {client} from "@/api"
import store from "@/store";
import { hasError } from "@/utils";

const login = async (token: string): Promise <any> => {
  const baseURL = store.getters["user/getBaseUrl"]
  let api_key = ""

  try {
    const resp = await client({
      url: "admin/login", 
      method: "post",
      baseURL,
      params: {
        token
      },
      headers: {
        "Content-Type": "application/json"
      }
    }) as any;

    if(!hasError(resp) && (resp.data.api_key || resp.data.token)) {
      api_key = resp.data.api_key || resp.data.token
    } else {
      throw "Sorry, login failed. Please try again";
    }
  } catch(err) {
    return Promise.reject("Sorry, login failed. Please try again");
  }
  return Promise.resolve(api_key)
}

const getUserProfile = async (token: any): Promise<any> => {
  const baseURL = store.getters["user/getBaseUrl"]
  try {
    const resp = await client({
      url: "admin/user/profile",
      method: "GET",
      baseURL,
      headers: {
        "api_key": token,
        "Content-Type": "application/json"
      }
    });
    if(hasError(resp)) throw "Error getting user profile";
    return Promise.resolve(resp.data)
  } catch(error: any) {
    return Promise.reject(error)
  }
}

const fetchProductStoreSettings = async (payload: any): Promise <any>  => {
  return api({
    url: `inventory-cycle-count/productStores/${payload.productStoreId}/settings`,
    method: "GET",
    params: payload
  });
}

const updateProductStoreSetting = async (payload: any): Promise <any>  => {
  return api({
    url: `inventory-cycle-count/productStores/${payload.productStoreId}/settings`,
    method: "POST",
    data: payload
  });
}

const createProductStoreSetting = async (payload: any): Promise<any> => {
  return api({
    url: `inventory-cycle-count/productStores/${payload.productStoreId}/settings`,
    method: "post",
    data: payload
  });
}

const getUserPermissions = async (payload: any, url: string, token: any): Promise<any> => {
  // Currently, making this request in ofbiz
  const baseURL = url.startsWith('http') ? url.includes('/api') ? url : `${url}/api/` : `https://${url}.hotwax.io/api/`;
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

const createFieldMapping = async (payload: any): Promise <any> => {
  return api({
    url: "inventory-cycle-count/dataManagerMappings",
    method: "POST",
    data: payload
  });
}

const updateFieldMapping = async (payload: any): Promise <any> => {
  return api({
    url: `inventory-cycle-count/dataManagerMappings/${payload.mappingPrefId}`,
    method: "POST",
    data: payload
  });
}

const deleteFieldMapping = async (payload: any): Promise <any> => {
  return api({
    url: `inventory-cycle-count/dataManagerMappings/${payload.mappingPrefId}`,
    method: "DELETE",
    data: payload
  });
}

const getFieldMappings = async (payload: any): Promise <any> => {
  let url = "inventory-cycle-count/dataManagerMappings?"

  if (Array.isArray(payload.mappingPrefTypeEnumId)) {
    url += `mappingPrefTypeEnumId=${payload.mappingPrefTypeEnumId.join('&')}`
  } else {
    url += `mappingPrefTypeEnumId=${payload.mappingPrefTypeEnumId}`
  }
  delete payload.mappingPrefTypeEnumId

  return api({
    url,
    method: "GET",
    param: payload
  });
}

const createUserPreference = async(userId: string, preferenceKey: string, preferenceValue: string): Promise<any> => {
  const baseURL = store.getters["user/getBaseUrl"]
  const token = store.getters["user/getUserToken"]

  try {
    const resp = await client({
      url: "admin/user/preferences",
      method: "POST",
      baseURL,
      data: {
        userId,
        preferenceKey,
        preferenceValue,
      },
      headers: {
        "api_key": token,
        "Content-Type": "application/json"
      }
    });
    if(hasError(resp)) throw "Error creating user preference";
    return Promise.resolve(resp.data)
  } catch(error: any) {
    return Promise.reject(error)
  }
}

const updateUserPreference = async(userId: string, preferenceKey: string, preferenceValue: string): Promise<any> => {
  const baseURL = store.getters["user/getBaseUrl"]
  const token = store.getters["user/getUserToken"]

  try {
    const resp = await client({
      url: "admin/user/preferences",
      method: "PUT",
      baseURL,
      data: {
        userId,
        preferenceKey,
        preferenceValue,
      },
      headers: {
        "api_key": token,
        "Content-Type": "application/json"
      }
    });
    if(hasError(resp)) throw "Error creating user preference";
    return Promise.resolve(resp.data)
  } catch(error: any) {
    return Promise.reject(error)
  }
}

const getUserPreference = async(userId: string, preferenceKey: string): Promise<any> => {
  const baseURL = store.getters["user/getBaseUrl"]
  const token = store.getters["user/getUserToken"]

  try {
    const resp = await client({
      url: "admin/user/preferences",
      method: "GET",
      baseURL,
      params: {
        userId,
        preferenceKey
      },
      headers: {
        "api_key": token,
        "Content-Type": "application/json"
      }
    });
    if(hasError(resp)) throw "Error creating user preference";
    return Promise.resolve(resp.data)
  } catch(error: any) {
    return Promise.reject(error)
  }
}

export const UserService = {
  createFieldMapping,
  createProductStoreSetting,
  createUserPreference,
  deleteFieldMapping,
  fetchProductStoreSettings,
  getFieldMappings,
  getUserPermissions,
  getUserPreference,
  getUserProfile,
  login,
  updateFieldMapping,
  updateProductStoreSetting,
  updateUserPreference
}