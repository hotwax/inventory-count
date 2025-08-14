import { GetterTree } from "vuex";
import ProductState from "./ProductState";
import RootState from "../../RootState";
import { useUserStore } from "@hotwax/dxp-components"

const getters: GetterTree<ProductState, RootState> = {
  getProduct: (state) => (productId: string) => {
    // Returning empty object so that it doesn't breaks the UI
    return state.cached[productId] ? state.cached[productId] : {};
  },
  getCachedProducts(state) {
    return state.cached ? state.cached : {}
  },
  getCurrentProduct(state) {
    return state.currentProduct
  },
  getProducts: (state) => {
    return state.list.items
  },
  getProductStock: (state) => (productId: string) => {
    const currentFacility: any = useUserStore().getCurrentFacility;
    const facilityId = currentFacility.facilityId;
    return state.productStock?.[productId]?.[facilityId]
  },
  isScrollable(state) {
    return (
      state.list.items.length > 0 &&
      state.list.items.length < state.list.total
    );
  }
};
export default getters;