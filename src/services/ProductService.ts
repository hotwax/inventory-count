import { client } from '@/api';

const fetchProducts = async (query: any): Promise <any>  => {
  return client({
    url: "searchProducts",
    baseURL: "https://dev-oms.hotwax.io/api", // Make it dynamic based on the used oms
    method: "post",
    data: query,
    cache: true,
    noAuth: true  // Need to check how to make call to ofbiz, currently as api does not require auth so used this param
  });
}

export const ProductService = {
  fetchProducts
}