import { ProductService } from "@/services/ProductService";
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import ProductState from './ProductState'
import * as types from './mutation-types'
import { hasError } from "@/utils";
import logger from "@/logger";

const actions: ActionTree<ProductState, RootState> = {

  async fetchProducts ( { commit, state }, { productIds }) {
    const cachedProductIds = Object.keys(state.cached);
    let viewSize = 0;
    const productIdFilter= productIds.reduce((filter: string, productId: any) => {
      // If product already exist in cached products skip
      if (cachedProductIds.includes(productId)) {
        return filter;
      } else {
        // checking condition that if the filter is not empty then adding 'OR' to the filter
        if (filter !== '') filter += ' OR '
        viewSize++; // updating viewSize when productId is not found in the cache state
        return filter += productId;
      }
    }, '');

    // If there are no products skip the API call
    if (productIdFilter === '') return;

    let resp; 
    try {
      resp = await ProductService.fetchProducts({
        "filters": ['productId: (' + productIdFilter + ')'],
        viewSize
      })
      if (resp.status === 200 && resp.data?.response && !hasError(resp)) {
        const products = resp.data.response.docs;
        commit(types.PRODUCT_ADD_TO_CACHED, { products });
      } else {
        throw resp.data
      }
    } catch(err) {
      logger.error('Failed to fetch products information', err)
    }
    return resp;
  },

  async currentProduct ({ commit }, payload) {
    commit(types.PRODUCT_CURRENT_UPDATED, payload )
  }

}

export default actions;