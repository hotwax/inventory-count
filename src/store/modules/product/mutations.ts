import { MutationTree } from 'vuex'
import ProductState from './ProductState'
import * as types from './mutation-types'

const mutations: MutationTree <ProductState> = {
  [types.PRODUCT_ADD_TO_CACHED_MULTIPLE] (state, payload) {
    if (payload.products) {
      payload.products.forEach((product: any) => {
        state.cached[product.productId] = product
      });
    }
  },
  [types.PRODUCT_ADD_TO_CACHED] (state, payload) {
    if(payload.productId) {
      state.cached[payload.productId] = payload
    }
  },
  [types.PRODUCT_CURRENT_UPDATED] (state, payload) {
    state.currentProduct = payload
  },
  [types.PRODUCT_LIST_UPDATED](state, payload) {
    state.list.items = payload.products
    state.list.total = payload.total
  },
  [types.PRODUCT_CACHED_CLEARED] (state) {
    state.cached = {}
  },
  [types.PRODUCT_STOCK_UPDATED] (state, payload) {
    Object.entries(payload).forEach(([productId, facilityStock]) => {
      if(!state.productStock[productId]) {
        state.productStock[productId] = {};
      }
      state.productStock[productId] = {...state.productStock[productId], ...(facilityStock as any)};
    });
  }
}
export default mutations;