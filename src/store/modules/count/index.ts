import actions from './actions'
import getters from './getters'
import { Module } from 'vuex'
import CountState from './CountState'
import RootState from '../../RootState'

const countModule: Module<CountState, RootState> = {
  namespaced: true,
  state: {
    list: [],
    total: 0
  },
  getters,
  actions,
}

export default countModule;
