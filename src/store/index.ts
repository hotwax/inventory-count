import { createStore, useStore as useVuexStore } from "vuex"
import mutations  from "./mutations"
import getters  from "./getters"
import actions from "./actions"
import RootState from "./RootState"
import createPersistedState from "vuex-persistedstate";
import userModule from "./modules/user";
import countModule from "./modules/count"
import productModule from "./modules/product"
import { setPermissions } from "@/authorization"


// TODO check how to register it from the components only
// Handle same module registering multiple time on page refresh
//store.registerModule("user", userModule);

const state: any = {}

const persistState = createPersistedState({
  paths: ["user"],
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
    "user": userModule,
    "count": countModule,
    "product": productModule
  },
})

setPermissions(store.getters['user/getUserPermissions']);

export default store
export function useStore(): typeof store {
  return useVuexStore()
}