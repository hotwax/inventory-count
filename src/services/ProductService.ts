import { client } from '@/api';
import store from '@/store';

const fetchProducts = async (query: any): Promise <any>  => {
  const omsRedirectionInfo = store.getters["user/getOmsRedirectionInfo"]
  const baseURL = omsRedirectionInfo.url.startsWith('http') ? omsRedirectionInfo.url.includes('/api') ? omsRedirectionInfo.url : `${omsRedirectionInfo.url}/api/` : `https://${omsRedirectionInfo.url}.hotwax.io/api/`;

  console.log(omsRedirectionInfo)
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

export const ProductService = {
  fetchProducts
}