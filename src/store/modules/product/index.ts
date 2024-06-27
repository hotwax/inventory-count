import actions from './actions'
import getters from './getters'
import mutations from './mutations'
import { Module } from 'vuex'
import ProductState from './ProductState'
import RootState from '../../RootState'

const productModule: Module<ProductState, RootState> = {
  namespaced: true,
  state: {
    cached: {},
    list: {
      items: [],
      total: 0
    }
  },
  getters,
  actions,
  mutations,
}

export default productModule;