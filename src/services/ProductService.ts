import api from '@/api';

const fetchProducts = async (query: any): Promise <any>  => {
  return api({
    url: "searchProducts",
    method: "post",
    data: query,
    cache: true,
    useOmsRedirection: true
  });
}

export const ProductService = {
  fetchProducts
}