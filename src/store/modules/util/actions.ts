import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import * as types from './mutation-types'
import { hasError } from '@/utils';
import logger from '@/logger'
import { UtilService } from '@/services/UtilService'
import UtilState from './UtilState';

const actions: ActionTree<UtilState, RootState> = {

  async fetchFacilityGroups ( { commit }) {
    let facilityGroups = [];

    try {
      const resp = await UtilService.fetchFacilityGroups({ pageSize: 200 })
      if(!hasError(resp)) {
        facilityGroups = resp.data;
      } else {
        throw resp
      }
    } catch(err) {
      logger.error("Failed to fetch facility groups", err)
    }
    commit(types.UTIL_FACILITY_GROUPS_UPDATED, facilityGroups);
  },
  async fetchStatusDesc ( {commit} ) {
    try {
      let statusDesc = [];

      const resp = await UtilService.fetchCycleCountStatusDesc();

      if (resp?.status === 200 && resp.data?.length) {
        statusDesc = resp.data;
      }

      commit(types.UTIL_STATUS_UPDATED, statusDesc);
    } catch (error) {
      logger.error("Failed to fetch cycle count status descriptions", error);
    }
  }
}

export default actions;