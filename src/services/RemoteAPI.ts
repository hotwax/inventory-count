import axios from 'axios';
import { StatusCodes } from 'http-status-codes';
import qs from 'qs';
import merge from 'deepmerge';

const requestInterceptor = async (config: any) => {
  if (apiConfig.token) {
    config.headers["Authorization"] =  "Bearer " + apiConfig.token;
    config.headers['Content-Type'] = 'application/json';
  }
  return config;
}

// configuration passed from the app
let appConfig = {};

const responseSuccessInterceptor = (response: any) => {
  // Any status code that lie within the range of 2xx cause this function to trigger
  // Do something with response data
  if (apiConfig.events.responseSuccess) apiConfig.events.responseSuccess(response);

  if(apiConfig.systemType === "MOQUI") {
    const csrfToken = response.headers["x-csrf-token"]
    const meta = document.createElement("meta")
    meta.name = "csrf"
    meta.content = csrfToken
    document.getElementsByTagName("head")[0].appendChild(meta)
    document.cookie = `x-csrf-token=${csrfToken}`
  }
  return response;
}

const responseErrorInterceptor = (error: any) => {
  if (apiConfig.events.responseError) apiConfig.events.responseError(error);
  // As we have yet added support for logout on unauthorization hence emitting unauth event only in case of ofbiz app
  if(error.response && apiConfig.systemType === "OFBIZ") {
      // TODO Handle case for failed queue request
      const { status } = error.response;
      if (status == StatusCodes.UNAUTHORIZED) {
        if (apiConfig.events.unauthorised) apiConfig.events.unauthorised(error);
      }
  }
  // Any status codes that falls outside the range of 2xx cause this function to trigger
  // Do something with response error
  return Promise.reject(error);
}

const responseClientErrorInterceptor = (error: any) => {
  if (apiConfig.events.responseError) apiConfig.events.responseError(error);
  // As we have yet added support for logout on unauthorization hence emitting unauth event only in case of ofbiz app
  if(error.response && apiConfig.systemType === "MOQUI") {
      // TODO Handle case for failed queue request
      const { status } = error.response;
      if (status == StatusCodes.UNAUTHORIZED) {
        if (apiConfig.events.unauthorised) apiConfig.events.unauthorised(error);
      }
  }
  // Any status codes that falls outside the range of 2xx cause this function to trigger
  // Do something with response error
  return Promise.reject(error);
}

const defaultConfig = {
  token: '',
  instanceUrl: '',
  cacheMaxAge: 0,
  events: {
    unauthorised: undefined,
    responseSuccess: undefined,
    responseError: undefined,
    queueTask: undefined
  } as any,
  interceptor: {
    request: requestInterceptor,
    response: {
      success: responseSuccessInterceptor,
      error: responseErrorInterceptor
    }
  },
  systemType: "MOQUI"
}
let apiConfig = { ...defaultConfig }

// `paramsSerializer` is an optional function in charge of serializing `params`
// (e.g. https://www.npmjs.com/package/qs, http://api.jquery.com/jquery.param/)
//   paramsSerializer: function (params) {
//     return Qs.stringify(params, {arrayFormat: 'brackets'})
//   },
// This implemmentation is done to ensure array and object is passed correctly in OMS 1.0
const paramsSerializer = (p: any) => {
  // When objects are stringified, by default they use bracket notation:
  // qs.stringify({ a: { b: { c: 'd', e: 'f' } } });
  // 'a[b][c]=d&a[b][e]=f'
  //We may override this to use dot notation by setting the allowDots option to true:
  // qs.stringify({ a: { b: { c: 'd', e: 'f' } } }, { allowDots: true });
  // 'a.b.c=d&a.b.e=f'
  // OMS 1.0 supports objects passed as strings
  const params = Object.keys(p).reduce((params: any, key: string) => {
      let value = p[key];
      if ( typeof value === 'object' && !Array.isArray(value) && value !== null) {
          value = JSON.stringify(value)
      }
      params[key] = value;
      return params;
  }, {})
  // arrayFormat option is used to specify the format of the output array:
  //qs.stringify({ a: ['b', 'c'] }, { arrayFormat: 'indices' })
  // 'a[0]=b&a[1]=c'
  //qs.stringify({ a: ['b', 'c'] }, { arrayFormat: 'brackets' })
  // 'a[]=b&a[]=c'
  //qs.stringify({ a: ['b', 'c'] }, { arrayFormat: 'repeat' })
  // 'a=b&a=c'
  //qs.stringify({ a: ['b', 'c'] }, { arrayFormat: 'comma' })
  // 'a=b,c'
  // Currently OMS 1.0 supports values as repeat
  return qs.stringify(params, {arrayFormat: 'repeat'});
}

function updateToken(key: string) {
  apiConfig.token = key
}

function updateInstanceUrl(url: string) {
  apiConfig.instanceUrl = url
}

function resetConfig() {
  apiConfig = { ...defaultConfig }
}

function init(key: string, url: string, cacheAge: number) {
  apiConfig.token = key
  apiConfig.instanceUrl = url
  apiConfig.cacheMaxAge = cacheAge
}

function initialise(customConfig: any) {
  appConfig = customConfig;
  apiConfig = merge(apiConfig, customConfig)
  axios.interceptors.request.use(apiConfig.interceptor.request);
  axios.interceptors.response.use(apiConfig.interceptor.response.success, apiConfig.interceptor.response.error);
}

function getConfig() {
  return appConfig;
}

axios.interceptors.request.use(apiConfig.interceptor.request);

axios.interceptors.response.use(apiConfig.interceptor.response.success, apiConfig.interceptor.response.error);

/**
 * Generic method to call APIs
 *
 * @param {string}  url - API Url
 * @param {string=} method - 'GET', 'PUT', 'POST', 'DELETE , and 'PATCH'
 * @param {any} [data] - Optional: `data` is the data to be sent as the request body. Only applicable for request methods 'PUT', 'POST', 'DELETE , and 'PATCH'
 * When no `transformRequest` is set, must be of one of the following types:
 * - string, plain object, ArrayBuffer, ArrayBufferView, URLSearchParams
 * - Browser only: FormData, File, Blob
 * - Node only: Stream, Buffer
 * @param {any} [params] - Optional: `params` are the URL parameters to be sent with the request. Must be a plain object or a URLSearchParams object
 * @param {boolean} [cache] - Optional: Apply caching to it
 *  @param {boolean} [queue] - Optional: Apply offline queueing to it
 * @return {Promise} Response from API as returned by Axios
 */
const api = async (customConfig: any) => {
    // Prepare configuration
    const config: any = {
        url: customConfig.url,
        method: customConfig.method,
        data: customConfig.data,
        params: customConfig.params,
        paramsSerializer
    }

    // if passing responseType in payload then only adding it as responseType
    if(customConfig.responseType) config['responseType'] = customConfig.responseType

    if(apiConfig.instanceUrl && apiConfig.systemType === "MOQUI") config.baseURL = apiConfig.instanceUrl.startsWith('http') ? apiConfig.instanceUrl.includes('/rest/s1') ? apiConfig.instanceUrl : `${apiConfig.instanceUrl}/rest/s1/` : `https://${apiConfig.instanceUrl}.hotwax.io/rest/s1/`;
    else if(apiConfig.instanceUrl) config.baseURL = apiConfig.instanceUrl.startsWith('http') ? apiConfig.instanceUrl.includes('/api') ? apiConfig.instanceUrl : `${apiConfig.instanceUrl}/api/` : `https://${apiConfig.instanceUrl}.hotwax.io/api/`;

    if (customConfig.cache) {
      console.warn('Caching is not enabled in this build. Ignoring cache flag for request:', customConfig.url);
    }

    if (customConfig.queue) {
        if (!config.headers) config.headers = { ...axios.defaults.headers.common, ...config.headers };

        if (config.events.queueTask) {
          config.events.queueTask ({
            callbackEvent: customConfig.callbackEvent,
            payload: config
          })
        }
    } else {
        return axios(config);
    }
}

const client = (config: any) => {
  return axios.create().request(config)
}


export { api as default, initialise, axios, getConfig, init, updateToken, updateInstanceUrl, resetConfig, client };
