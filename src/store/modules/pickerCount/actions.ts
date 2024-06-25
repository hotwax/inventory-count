import { ActionTree } from 'vuex'	
import RootState from '@/store/RootState'	
import pickerCountState from './pickerCountState'	
import { pickerService } from '@/services/pickerService'
import * as types from "./mutation-types"
import { hasError, showToast } from '@/utils'	
import logger from '@/logger'
import { translate } from '@/i18n'	
import emitter from '@/event-bus'	


const actions: ActionTree<pickerCountState, RootState> = {	

  async fetchCycleCounts ({ commit, state }, payload) {

    const params = {
      pageSize: payload.pageSize,
      pageIndex: payload.pageIndex,
      facilityId: payload.facilityId
    }
    let counts = state.cycleCounts.list ? JSON.parse(JSON.stringify(state.cycleCounts.list)) : []
    let isScrollable = true

    try {
      const resp = await pickerService.fetchCycleCounts(params)
      if(!hasError(resp) && resp.data.length) {

        if(payload.pageIndex && payload.pageIndex > 0) {
          counts = counts.concat(resp.data)
        } else {
          counts = resp.data
        }

        if(resp.data.length == payload.pageSize) isScrollable = true
        else isScrollable = false
      } else {
        throw resp.data;
      }
    } catch (err: any) {
      logger.error(err)
    }
    commit(types.PICKER_COUNT_UPDATED, {cycleCount: counts, isScrollable})
  },

  async fetchCycleCountItems ({commit} ,payload) {
    let items;
    try {
      const resp = await pickerService.fetchCycleCountItems(payload)
      if(!hasError(resp)) {
        items = resp.data
      } else {
        throw resp.data;
      }
    } catch (err: any) {
      logger.error(err)
    }
    commit(types.PICKER_COUNT_ITEMS_UPDATED, items)
  }
}	

export default actions;	
