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
  const baseURL = store.getters["user/getBaseUrl"];
  const token = store.getters["user/getUserToken"]

  return await client({
    url: "poorti/getInventoryAvailableByFacility",
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