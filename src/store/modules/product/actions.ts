import { ProductService } from "@/services/ProductService";
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import ProductState from './ProductState'
import * as types from './mutation-types'
import { hasError, showToast } from '@/utils'
import { translate } from '@/i18n'
import emitter from '@/event-bus'
import { prepareProductQuery } from '@/utils/solrHelper'


const actions: ActionTree<ProductState, RootState> = {

  // Find Product
  async findProduct ({ commit, state, dispatch }, payload) {

    // Show loader only when new query and not the infinite scroll
    if (payload.viewIndex === 0) emitter.emit("presentLoader");

    let resp;

    try {
      const params = {
        ...payload,
        filters: {
          isVirtual: { value: 'false' },
        }
      }
      const productQueryPayload = prepareProductQuery(params)
      resp = await ProductService.fetchProducts(productQueryPayload)
      // resp.data.response.numFound tells the number of items in the response
      if (resp.status === 200 && resp.data.response?.numFound > 0 && !hasError(resp)) {
        let products = resp.data.response.docs;
        const totalProductsCount = resp.data.response.numFound;

        if (payload.viewIndex && payload.viewIndex > 0) products = state.products.list.concat(products)
        commit(types.PRODUCT_SEARCH_UPDATED, { products: products, totalProductsCount: totalProductsCount })
      } else if (payload.viewIndex == 0) {
        dispatch('clearSearchProducts')
      }
      // Remove added loader only when new query and not the infinite scroll
      if (payload.viewIndex === 0) emitter.emit("dismissLoader");
    } catch(error){
      console.error(error)
      dispatch('clearSearchProducts')
      showToast(translate("Something went wrong"));
    }
    // TODO Handle specific error
    return resp;
  },

  async removeItemFromUploadProducts( {commit}, payload) {
    commit(types.PRODUCT_REMOVE_FROM_UPLD_PRDTS, {sku: payload});
  },

  async clearUploadProducts ({ commit }) {
    commit(types.PRODUCT_CLEAR_UPLD_PRDTS);
  },

  async uploadInventoryCount({ commit }, payload) {
    emitter.emit("presentLoader");
    let resp;
    try {
      resp = await ProductService.importInventoryCount({
        inventoryCountRegister: payload.inventoryCountRegister,
        facilityId: payload.facilityId
      });

      if (resp.status == 200 && !hasError(resp)) {
        commit(types.PRODUCT_CLEAR_UPLD_PRDTS);
        showToast(translate("Products inventory updated"))
      } else {
        showToast(translate("Something went wrong"))
      }

      emitter.emit("dismissLoader");
    } catch (error) {
      console.error(error);
      showToast(translate("Something went wrong"));
    }

    return resp;
  },
  
  async updateInventoryCount ({ commit }, payload) {
    commit(types.PRODUCT_ADD_TO_UPLD_PRDTS, { product: payload })
  },

  clearSearchProducts({commit}){
    commit(types.PRODUCT_SEARCH_UPDATED, { products: [], totalProductsCount: 0 })
  },

  async updateCurrentProduct ({ commit, state }, payload) {
    // search in uploadProducts that if the clicked product is already in the upload list and set it as current product
    const currentProduct = state.uploadProducts[payload]
    if(currentProduct) {
      commit(types.PRODUCT_CURRENT_UPDATED, { product: currentProduct })
    } else {
      // used sku as we are currently only using sku to search for the product
      const params = {
        filters: {
          isVirtual: { value: 'false' },
          sku: { value: payload }
        }
      }
      const productQueryPayload = prepareProductQuery(params)

      const resp = await ProductService.fetchProducts(productQueryPayload)

      if(resp.status === 200 && !hasError(resp) && resp.data.response?.numFound > 0) {
        commit(types.PRODUCT_CURRENT_UPDATED, { product: resp.data.response.docs[0] })
      } else {
        showToast(translate("Something went wrong"));
      }
    }
  }
}

export default actions;
