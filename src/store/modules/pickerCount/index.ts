import actions from './actions'
import getters from './getters'
import mutations from "./mutations";
import { Module } from 'vuex'
import pickerCountState from './pickerCountState'
import RootState from '../../RootState'

const pickerCountModule: Module<pickerCountState, RootState> = {
    namespaced: true,
    state: {
      cycleCounts: {},
    },
    getters,
    actions,
    mutations,
}

export default pickerCountModule;

// TODO
// store.registerModule('product', pickerCountModule);