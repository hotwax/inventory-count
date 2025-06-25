import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import ProductState from './ProductState'
import * as types from './mutation-types'
import { ProductService } from "@/services/ProductService"
import { hasError } from '@/utils';
import emitter from '@/event-bus';
import logger from '@/logger'
import store from '@/store'

const actions: ActionTree<ProductState, RootState> = {

  async fetchProducts({ commit, state }, { productIds }) {
    const cachedProductIds = Object.keys(state.cached);
    const remainingProductIds = productIds.filter((productId: any) => !cachedProductIds.includes(productId));
    if(!remainingProductIds.length) return;
    const batchSize = 250, fetchedProducts = [];
    let index = 0;
  
    try {
      do {
        const productIdBatch = remainingProductIds.slice(index, index + batchSize);
        const productIdFilter = productIdBatch.join(' OR ');
  
        const resp = await ProductService.fetchProducts({
          filters: ['productId: (' + productIdFilter + ')'],
          viewSize: productIdBatch.length
        });
  
        if(!hasError(resp)) {
          const products = resp.data.response.docs;
          if(products?.length) {
            fetchedProducts.push(...products);
          }
        }
        index += batchSize;
      } while (index < remainingProductIds.length);
  
      if(fetchedProducts.length) {
        commit(types.PRODUCT_ADD_TO_CACHED_MULTIPLE, { products: fetchedProducts });
      }
    } catch (err) {
      logger.error("Failed to fetch products", err);
    }
  },

  async currentProduct ({ commit }, payload) {
    commit(types.PRODUCT_CURRENT_UPDATED, payload)
  },

  async findProduct({ commit, state }, payload) {
    let resp;
    if (payload.viewIndex === 0) emitter.emit("presentLoader");
    try {
      resp = await ProductService.fetchProducts({
        "filters": ['isVirtual: false', `sku: *${payload.queryString}*`],
        "viewSize": payload.viewSize,
        "viewIndex": payload.viewIndex
      })
      if (resp.status === 200 && resp.data.response?.docs.length > 0 && !hasError(resp)) {
        let products = resp.data.response.docs;
        const total = resp.data.response.numFound;

        if (payload.viewIndex && payload.viewIndex > 0) products = state.list.items.concat(products)
        commit(types.PRODUCT_LIST_UPDATED, { products, total });
        commit(types.PRODUCT_ADD_TO_CACHED_MULTIPLE, { products });
      } else {
        throw resp.data.docs;
      }
    } catch (error) {
      commit(types.PRODUCT_LIST_UPDATED, { products: [], total: 0 });
    } finally {
      if (payload.viewIndex === 0) emitter.emit("dismissLoader");
    }
    
    return resp;
  },

  async fetchProductByIdentification ( { commit, state }, payload) {
    const cachedProductIds = Object.keys(state.cached);
    if(cachedProductIds.includes(payload.scannedValue)) return state.cached[payload.scannedValue];
    const productIdentifications = process.env.VUE_APP_PRDT_IDENT ? JSON.parse(JSON.stringify(process.env.VUE_APP_PRDT_IDENT)) : []

    const productStoreSettings = store.getters["user/getProductStoreSettings"];
    const barcodeIdentification = productStoreSettings["barcodeIdentificationPref"]
    let resp;

    try {
      resp = await ProductService.fetchProducts({
        "filters": [productIdentifications.includes(barcodeIdentification) ? `${barcodeIdentification}: ${payload.scannedValue}` : `goodIdentifications: ${barcodeIdentification}/${payload.scannedValue}`],
        "viewSize": 1
      })
      if(resp.status === 200 && !hasError(resp)) {
        const products = resp.data.response.docs;
        // Handled empty response in case of failed query
        if (resp.data) commit(types.PRODUCT_ADD_TO_CACHED_MULTIPLE, { products });
        return resp.data.response.docs[0]
      }
    } catch(err) {
      logger.error("Failed to fetch products", err)
    }
    return {};
  },

  async addProductToCached({ commit }, payload) {
    commit(types.PRODUCT_ADD_TO_CACHED, payload);
  },

  async clearProducts({ commit }) {
    commit(types.PRODUCT_LIST_UPDATED, { products: [], total: 0 });
  },

  async clearCachedProducts({ commit }) {
    commit(types.PRODUCT_CACHED_CLEARED);
  }
}

export default actions;
