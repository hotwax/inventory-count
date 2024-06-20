import actions from './actions'
import getters from './getters'
import { Module } from 'vuex'
import UserState from './UserState'
import RootState from '@/store/RootState'

const userModule: Module<UserState, RootState> = {
    namespaced: true,
    state: {
     
    },
    getters,
    actions,
}

export default userModule;

// TODO
// store.registerModule('user', userModule);