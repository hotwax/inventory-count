import { UtilService } from '@/services/UtilService'
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import UserState from './UtilState'
import * as types from './mutation-types'
import { hasError } from '@/utils'

const actions: ActionTree<UserState, RootState> = {
  async fetchVarianceReasons({ commit }) {
    let varianceReasons = [];
    try {
      const payload = {
        "inputFields": {
          "enumTypeId": "IID_REASON"
        },
        "fieldList": ["enumId", "description"],
        "distinct": "Y",
        "entityName": "Enumeration",
        "viewSize": 20
      }

      const resp = await UtilService.fetchVarianceReasons(payload)
      if (!hasError(resp)) {
        varianceReasons = resp.data.docs
      }
    } catch (err) {
      console.error(err)
    }

    commit(types.UTIL_VARIANCE_REASONS_UPDATED, varianceReasons)
  }
}
export default actions;