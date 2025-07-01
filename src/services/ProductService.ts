import api from '@/api';
import { client } from '@/api';
import store from '@/store';

const fetchProducts = async (query: any): Promise <any>  => {
  const omsRedirectionInfo = store.getters["user/getOmsRedirectionInfo"]
  const baseURL = omsRedirectionInfo.url.startsWith('http') ? omsRedirectionInfo.url.includes('/api') ? omsRedirectionInfo.url : `${omsRedirectionInfo.url}/api/` : `https://${omsRedirectionInfo.url}.hotwax.io/api/`;

  return await client({
    url: "searchProducts",
    method: "POST",
    baseURL,
    data: query,
    headers: {
      "Authorization":  'Bearer ' + omsRedirectionInfo.token,
      'Content-Type': 'application/json'
    }
  });
}

const fetchProductStock = async (query: any): Promise<any> => {
  const url = store.getters["user/getBaseUrl"];
  const token = store.getters["user/getUserToken"]
  const baseURL = url.startsWith("http") ? (url.includes("/rest/s1/inventory-cycle-count") ? url.replace("/inventory-cycle-count", "") : `${url}/rest/s1`) : `https://${url}.hotwax.io/rest/s1`;

  return await client({
    url: `/poorti/getInventoryAvailableByFacility`,
    method: "GET",
    baseURL,
    params: query,
    headers: {
      Api_Key: token,
      'Content-Type': 'application/json'
    }
  });
}

export const ProductService = {
  fetchProducts,
  fetchProductStock
}