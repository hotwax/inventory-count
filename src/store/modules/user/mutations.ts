import { MutationTree } from 'vuex'
import UserState from './UserState'
import * as types from "./mutation-types"

const mutations: MutationTree <UserState> = {
  [types.USER_TOKEN_CHANGED] (state, payload) {
    state.token = payload.newToken
  },
  [types.USER_END_SESSION] (state) {
    state.token = ""
    state.current = null
    state.permissions = []
  },
  [types.USER_INFO_UPDATED] (state, payload) {
    state.current = payload
  },
  [types.USER_INSTANCE_URL_UPDATED] (state, payload) {
    state.instanceUrl = payload;
  },
  [types.USER_OMS_REDIRECTION_INFO_UPDATED](state, payload) {
    state.omsRedirectionInfo = payload;
  },
  [types.USER_PERMISSIONS_UPDATED] (state, payload) {
    state.permissions = payload
  },
  [types.USER_PRODUCT_STORE_SETTING_UPDATED] (state, payload) {
    Object.keys(payload).map((setting: any) => {
      (state.settings as any)[setting] = payload[setting]
    })
  },
  [types.USER_FIELD_MAPPINGS_UPDATED] (state, payload) {
    state.fieldMappings = payload;
  },    
  [types.USER_CURRENT_FIELD_MAPPING_UPDATED] (state, payload) {
      state.currentMapping = payload
  },
  [types.USER_FIELD_MAPPING_CREATED] (state, payload) {
      (state.fieldMappings as any)[payload.type][payload.id] = {
          name: payload.name,
          value: payload.value
      };
  },
  [types.USER_ENABLE_SCROLLING_ANIMATION_UPDATED] (state, payload) {
    state.isScrollingAnimationEnabled = payload
  }
}
export default mutations;