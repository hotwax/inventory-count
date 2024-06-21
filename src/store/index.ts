import { createStore, useStore as useVuexStore } from "vuex"
import mutations  from "./mutations"
import getters  from "./getters"
import actions from "./actions"
import RootState from "./RootState"
import createPersistedState from "vuex-persistedstate";
import userModule from "./modules/user";
import pickerCountModule from "./modules/pickerCount"


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
    "user": userModule,
    "pickerCount": pickerCountModule
  },
})

export default store
export function useStore(): typeof store {
  return useVuexStore()
}