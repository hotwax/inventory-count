import { createStore, useStore as useVuexStore, Store } from "vuex";
import createPersistedState from "vuex-persistedstate";
import RootState from "./RootState"; // Ensure this is correctly imported
import mutations from "./mutations";
import getters from "./getters";
import actions from "./actions";
import userModule from "./modules/user";
import pickerCountModule from "./modules/pickerCount";
import productModule from "./modules/product";
import countModule from "./modules/count";


// TODO check how to register it from the components only
// Handle same module registering multiple time on page refresh
//store.registerModule("user", userModule);

const state: any = {}

const persistState = createPersistedState({
  paths: ["user", "pickerCount"],
  fetchBeforeUse: true
})

// Added modules here so that hydration takes place before routing
const store = createStore<RootState>({
  state,
  actions,
  mutations,
  getters,
  plugins: [ persistState ],
  modules: {
    user: userModule,
    pickerCount: pickerCountModule,
    product: productModule,
    count: countModule,
  },
})

export default store
export function useStore(): typeof store {
  return useVuexStore()
}