import { MutationTree } from 'vuex'
import ProductState from './ProductState'
import * as types from './mutation-types'

const mutations: MutationTree <ProductState> = {
  [types.PRODUCT_CURRENT_UPDATED] (state, payload) {
    // storing current product
    state.current = payload.product
  },
  [types.PRODUCT_ADD_TO_UPLD_PRDTS] (state, payload) {
    // storing the product in the upload list
    if (payload) {
      // using sku as a key to store a product in the upload list
      state.uploadProducts[payload.product.sku] = payload.product;
    }
  },
  [types.PRODUCT_REMOVE_FROM_UPLD_PRDTS] (state, payload) {
    delete state.uploadProducts[payload.sku];
  },
  [types.PRODUCT_CLEAR_UPLD_PRDTS] (state) {
    state.uploadProducts = {};
  },
  [types.PRODUCT_SEARCH_UPDATED] (state, payload) {
    state.products.list = payload.products;
    state.products.total = payload.totalProductsCount;
  }
}
export default mutations;