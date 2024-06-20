import { UserService } from '@/services/UserService'
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import UserState from './UserState'
import { hasError, showToast } from '@/utils'
import { translate } from '@/i18n'
import { Settings } from 'luxon';
import { getUserFacilities, logout, updateInstanceUrl, updateToken, resetConfig } from '@/adapter'
import {
  getServerPermissionsFromRules,
  prepareAppPermissions,
  resetPermissions,
  setPermissions
} from '@/authorization'
import { useAuthStore, useProductIdentificationStore } from '@hotwax/dxp-components'
import emitter from '@/event-bus'

const actions: ActionTree<UserState, RootState> = {


}
export default actions;