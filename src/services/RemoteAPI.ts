import axios from 'axios';
import { setupCache } from "axios-cache-adapter"
import { StatusCodes } from 'http-status-codes';
import qs from 'qs';
import { useAuthStore } from '@/stores/authStore';
import emitter from '@/event-bus';
import { loader } from './uiUtils';

function unauthorised() {
  const authStore = useAuthStore();
  const appLoginUrl = process.env.VUE_APP_LOGIN_URL;
  // Mark the user as unauthorised, this will help in not making the logout api call in actions
  authStore.logout();
  const redirectUrl = window.location.origin + '/login';
  window.location.href = `${appLoginUrl}?redirectUrl=${redirectUrl}`;
}

axios.interceptors.request.use(async (config: any) => {
  config.headers["Authorization"] = "Bearer " + useAuthStore().token.value;
  config.headers['Content-Type'] = 'application/json';
  return config;
});

axios.interceptors.response.use(function (response) {
  // Any status code that lie within the range of 2xx cause this function to trigger
  // Do something with response data
  const csrfToken = response.headers["x-csrf-token"]
  const meta = document.createElement("meta")
  meta.name = "csrf"
  meta.content = csrfToken
  document.getElementsByTagName("head")[0].appendChild(meta)
  document.cookie = `x-csrf-token=${csrfToken}`
  return response;
}, function (error: any) {
  setTimeout(() => function dismissLoader() {
    if (loader.value) {
      loader.value.dismiss();
      loader.value = null as any;
    }
  }, 100)
  // As we have yet added support for logout on unauthorization hence emitting unauth event only in case of ofbiz app
  const { status } = error.response || {};
  if (status == StatusCodes.UNAUTHORIZED) {
    unauthorised();
  }
  // Any status codes that falls outside the range of 2xx cause this function to trigger
  // Do something with response error
  return Promise.reject(error);
});

// `paramsSerializer` is an optional function in charge of serializing `params`
// (e.g. https://www.npmjs.com/package/qs, http://api.jquery.com/jquery.param/)
//   paramsSerializer: function (params) {
//     return Qs.stringify(params, {arrayFormat: 'brackets'})
//   },
// This implemmentation is done to ensure array and object is passed correctly in OMS 1.0
const paramsSerializer = (parameters: any) => {
  // When objects are stringified, by default they use bracket notation:
  // qs.stringify({ a: { b: { c: 'd', e: 'f' } } });
  // 'a[b][c]=d&a[b][e]=f'
  //We may override this to use dot notation by setting the allowDots option to true:
  // qs.stringify({ a: { b: { c: 'd', e: 'f' } } }, { allowDots: true });
  // 'a.b.c=d&a.b.e=f'
  // OMS 1.0 supports objects passed as strings
  const params = Object.keys(parameters).reduce((params: any, key: string) => {
    let value = parameters[key];
    if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
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
  return qs.stringify(params, { arrayFormat: 'repeat' });
}

const maxAge = process.env.VUE_APP_CACHE_MAX_AGE ? parseInt(process.env.VUE_APP_CACHE_MAX_AGE) : 0;
const axiosCache = setupCache({
  maxAge: maxAge * 1000
})

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
  if (customConfig.responseType) config['responseType'] = customConfig.responseType

  config.baseURL = useAuthStore().getBaseUrl;
  if (customConfig.cache) {
    console.warn('Caching is not enabled in this build. Ignoring cache flag for request:', customConfig.url);
  }

  if(customConfig.cache) config.adapter = axiosCache.adapter;
  
  if (customConfig.queue) {
    if (!config.headers) config.headers = { ...axios.defaults.headers.common, ...config.headers, "Authorization": `Bearer ${useAuthStore().token.value}` };

    if (config.events.queueTask) {
      emitter.emit("queueTask", {
        callbackEvent: customConfig.callbackEvent,
        payload: config
      })
    }
  } else {
    if (!config.headers) config.headers = { ...axios.defaults.headers.common, ...config.headers, "Authorization": `Bearer ${useAuthStore().token.value}` };
    return axios(config);
  }
}

const client = (config: any) => {
  return axios.create().request(config)
}


export { api as default, axios, client };
