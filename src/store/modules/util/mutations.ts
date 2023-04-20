import { MutationTree } from 'vuex'
import UtilState from './UtilState'
import * as types from './mutation-types'

const mutations: MutationTree <UtilState> = {
  [types.UTIL_VARIANCE_REASONS_UPDATED] (state, payload) {
    state.varianceReasons = payload
  }
}
export default mutations;
