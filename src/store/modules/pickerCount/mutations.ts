import { MutationTree } from 'vuex'	
import pickerCountState from './pickerCountState'	
import * as types from "./mutation-types"

const mutations: MutationTree <pickerCountState> = {	
  [types.PICKER_COUNT_UPDATED] (state, payload) {
    state.cycleCounts.list = payload.cycleCount
    state.cycleCounts.isScrollable = payload.isScrollable;
  },
  [types.PICKER_COUNT_ITEMS_UPDATED] (state, payload) {
    state.cycleCountItems = payload
  }
}	
export default mutations;	
