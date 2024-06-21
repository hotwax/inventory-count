import { MutationTree } from 'vuex'	
import pickerCountState from './pickerCountState'	
import * as types from "./mutation-types"

const mutations: MutationTree <pickerCountState> = {	
  [types.PICKER_COUNT_UPDATED] (state, payload) {
    state.cycleCounts = payload;
  },
}	
export default mutations;	
