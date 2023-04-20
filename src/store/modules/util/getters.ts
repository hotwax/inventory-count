import { GetterTree } from 'vuex'
import UserState from './UtilState'
import RootState from '@/store/RootState'

const getters: GetterTree <UserState, RootState> = {
   getVarianceReasons(state) {
      return state.varianceReasons ? state.varianceReasons : []
   }
}
export default getters;