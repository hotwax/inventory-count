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

  async fetchCycleCount ({ commit }) {
    let count;
    
    try {
      const resp = await pickerService.fetchCycleCount({page: 20})
      if(!hasError(resp) && resp.data.length) {
        count = resp.data
      } else {
        throw resp.data;
      }
    } catch (err: any) {
      logger.error(err)
    }
    commit(types.PICKER_COUNT_UPDATED, count)
    return count;
  }

}	

export default actions;	
