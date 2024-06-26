import { GetterTree } from "vuex";
import ProductState from "./ProductState";
import RootState from "../../RootState";

const getters: GetterTree<ProductState, RootState> = {
  getProduct: (state) => (productId: string) => {
    // Returning empty object so that it doesn't breaks the UI
    return state.cached[productId] ? state.cached[productId] : {};
  }
};
export default getters;