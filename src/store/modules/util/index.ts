import actions from './actions'
import getters from './getters'
import mutations from './mutations'
import { Module } from 'vuex'
import RootState from '../../RootState'
import UtilState from './UtilState'

const utilModule: Module<UtilState, RootState> = {
  namespaced: true,
  state: {
    facilityGroups: [],
    statusDesc: {},
  },
  getters,
  actions,
  mutations,
}

export default utilModule;