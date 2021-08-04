import { ProductService } from "@/services/ProductService";
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import ProductState from './ProductState'
import * as types from './mutation-types'
import { hasError, showToast } from '@/utils'
import { translate } from '@/i18n'
import emitter from '@/event-bus'


const actions: ActionTree<ProductState, RootState> = {

  // Find Product
  async findProduct ({ commit, state }, payload) {

    // Show loader only when new query and not the infinite scroll
    if (payload.viewIndex === 0) emitter.emit("presentLoader");

    let resp;

    try {
      resp = await ProductService.fetchProducts({
        // used sku as we are currently only using sku to search for the product
        "filters": ['sku: ' + payload.queryString],
        "viewSize": payload.viewSize,
        "viewIndex": payload.viewIndex
      })

      // resp.data.response.numFound tells the number of items in the response
      if (resp.status === 200 && resp.data.response.numFound > 0 && !hasError(resp)) {
        let products = resp.data.response.docs;
        const totalProductsCount = resp.data.response.numFound;

        if (payload.viewIndex && payload.viewIndex > 0) products = state.products.list.concat(products)
        commit(types.PRODUCT_SEARCH_UPDATED, { products: products, totalProductsCount: totalProductsCount })
      } else {
        //showing error whenever getting no products in the response or having any other error
        showToast(translate("Product not found"));
      }
      // Remove added loader only when new query and not the infinite scroll
      if (payload.viewIndex === 0) emitter.emit("dismissLoader");
    } catch(error){
      console.log(error)
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
      console.log(error);
      showToast(translate("Something went wrong"));
    }

    return resp;
  },
  
  async updateInventoryCount ({ commit }, payload) {
    commit(types.PRODUCT_ADD_TO_UPLD_PRDTS, { product: payload })
  },

  async setCurrent ({ commit, state }, payload) {
    const sku = payload.product ? payload.product.sku : payload.sku;

    // search in uploadProducts that if the clicked product is already in the upload list and set it as current product
    let currentProduct = state.uploadProducts[sku];

    // checking whether we are getting a product in payload or we are having a currentProduct
    if ( currentProduct || payload.product) {

      // setting the product either with currentProduct or payload.product;
      commit(types.PRODUCT_CURRENT_UPDATED, { product: currentProduct ? currentProduct : payload.product });

      return currentProduct ? currentProduct : payload.product;
    } else {

      // if we are just getting an sku then making API call to get the product
      try {
        const resp = await ProductService.fetchProducts({
          // using sku to search for the product
          "filters": ['sku: ' + sku]
        })
  
        if (resp.status === 200 && resp.data.response.numFound > 0 && !hasError(resp)) {
          currentProduct = resp.data.response.docs[0];
  
          commit(types.PRODUCT_CURRENT_UPDATED, { product: currentProduct });
        } else {
          //showing error whenever getting no products in the response or having any other error
          showToast(translate("Product not found"));
        }
        // Remove added loader only when new query and not the infinite scroll
        emitter.emit("dismissLoader");
      } catch(error){
        console.log(error)
        showToast(translate("Something went wrong"));
      }
    }

    return currentProduct;
  }
}

export default actions;
