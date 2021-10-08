import api from '@/api';

const fetchProducts = async (query: any): Promise <any>  => {
  return api({
    url: "searchProducts", 
    method: "post",
    data: query,
    cache: true
  });
}

const importInventoryCount = async (query: any): Promise <any> => {
  return api({
    url: "importInventoryCount",
    method: "post",
    data: query
  })
}

export const ProductService = {
  fetchProducts,
  importInventoryCount
}