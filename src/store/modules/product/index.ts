import actions from './actions'
import getters from './getters'
import { Module } from 'vuex'
import ProductState from './ProductState'
import RootState from '../../RootState'

const productModule: Module<ProductState, RootState> = {
    namespaced: true,
    state: {
     
    },
    getters,
    actions,
}

export default productModule;

// TODO
// store.registerModule('product', productModule);