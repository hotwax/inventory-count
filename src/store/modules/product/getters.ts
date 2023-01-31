import { GetterTree } from "vuex";
import ProductState from "./ProductState";
import RootState from "../../RootState";

const getters: GetterTree<ProductState, RootState> = {
  getCurrent: (state) => {
    return JSON.parse(JSON.stringify(state.current));
  },
  getUploadProducts(state) {
    return state.uploadProducts;
  },
  getSearchProducts(state) {
    return state.products.list;
  },
  isScrollable(state) {
    return (
      state.products.list.length > 0 &&
      state.products.list.length < state.products.total
    );
  },
  getSearchQuery(state){
    return state.searchQuery;
  }
};
export default getters;
