import { UserService } from '@/services/UserService'
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import UserState from './UserState'
import * as types from './mutation-types'
import { hasError, showToast } from '@/utils'
import { translate } from '@/i18n'
import { Settings } from 'luxon';
import { updateInstanceUrl, updateToken, resetConfig } from '@/adapter'
import {
  getServerPermissionsFromRules,
  prepareAppPermissions,
  resetPermissions,
  setPermissions
} from '@/authorization'
import { useProductIdentificationStore } from '@hotwax/dxp-components'

const actions: ActionTree<UserState, RootState> = {

  /**
  * Login user and return token
  */
  async login ({ commit }, { username, password }) {
    try {
      const resp = await UserService.login(username, password);
      // Further we will have only response having 2xx status
      // https://axios-http.com/docs/handling_errors
      // We haven't customized validateStatus method and default behaviour is for all status other than 2xx
      // TODO Check if we need to handle all 2xx status other than 200


      /* ---- Guard clauses starts here --- */
      // Know about Guard clauses here: https://learningactors.com/javascript-guard-clauses-how-you-can-refactor-conditional-logic/
      // https://medium.com/@scadge/if-statements-design-guard-clauses-might-be-all-you-need-67219a1a981a


      // If we have any error most possible reason is incorrect credentials.
      if (hasError(resp)) {
        showToast(translate('Sorry, your username or password is incorrect. Please try again.'));
        console.error("error", resp.data._ERROR_MESSAGE_);
        return Promise.reject(new Error(resp.data._ERROR_MESSAGE_));
      }

      const token = resp.data.token;

      // Getting the permissions list from server
      const permissionId = process.env.VUE_APP_PERMISSION_ID;
      // Prepare permissions list
      const serverPermissionsFromRules = getServerPermissionsFromRules();
      if (permissionId) serverPermissionsFromRules.push(permissionId);

      const serverPermissions = await UserService.getUserPermissions({
        permissionIds: serverPermissionsFromRules
      }, token);
      const appPermissions = prepareAppPermissions(serverPermissions);


      // Checking if the user has permission to access the app
      // If there is no configuration, the permission check is not enabled
      if (permissionId) {
        // As the token is not yet set in the state passing token headers explicitly
        // TODO Abstract this out, how token is handled should be part of the method not the callee
        const hasPermission = appPermissions.some((appPermissionId: any) => appPermissionId === permissionId );
        // If there are any errors or permission check fails do not allow user to login
        if (hasPermission) {
          const permissionError = 'You do not have permission to access the app.';
          showToast(translate(permissionError));
          console.error("error", permissionError);
          return Promise.reject(new Error(permissionError));
        }
      }

      const userProfile = await UserService.getUserProfile(token);

      // removing duplicate records as a single user can be associated with a facility by multiple roles.
      userProfile.facilities.reduce((uniqueFacilities: any, facility: any, index: number) => {
        if(uniqueFacilities.includes(facility.facilityId)) userProfile.facilities.splice(index, 1);
        else uniqueFacilities.push(facility.facilityId);
        return uniqueFacilities
      }, []);
      // TODO Use a separate API for getting facilities, this should handle user like admin accessing the app
      const currentFacility = userProfile.facilities.length > 0 ? userProfile.facilities[0] : {};
      const currentEComStore = await UserService.getCurrentEComStore(token, currentFacility?.facilityId);
      const currentQOHViewConfig = await UserService.getQOHViewConfig(token, currentEComStore?.productStoreId);

      /*  ---- Guard clauses ends here --- */

      setPermissions(appPermissions);
      if (userProfile.userTimeZone) {
        Settings.defaultZone = userProfile.userTimeZone;
      }
      updateToken(token)

      // TODO user single mutation
      commit(types.USER_INFO_UPDATED, userProfile);
      commit(types.USER_CURRENT_FACILITY_UPDATED, currentFacility);
      commit(types.USER_CURRENT_ECOM_STORE_UPDATED, currentEComStore)
      commit(types.USER_PERMISSIONS_UPDATED, appPermissions);
      commit(types.USER_VIEW_QOH_CNFG_UPDATED, currentQOHViewConfig.settingValue == "true" )
      commit(types.USER_TOKEN_CHANGED, { newToken: token })

      // Handling case for warnings like password may expire in few days
      if (resp.data._EVENT_MESSAGE_ && resp.data._EVENT_MESSAGE_.startsWith("Alert:")) {
      // TODO Internationalise text
        showToast(translate(resp.data._EVENT_MESSAGE_));
      }
    } catch (err: any) {
      // If any of the API call in try block has status code other than 2xx it will be handled in common catch block.
      // TODO Check if handling of specific status codes is required.
      showToast(translate('Something went wrong while login. Please contact administrator'));
      console.error("error", err);
      return Promise.reject(new Error(err))
    }
  },

  /**
   * Logout user
   */
  async logout ({ commit }) {
    // TODO add any other tasks if need
    commit(types.USER_END_SESSION)
    this.dispatch('product/clearSearchProducts');
    this.dispatch('product/clearUploadProducts');
    resetPermissions();
    resetConfig();
  },

  /**
   * Update user timeZone
   */
     async setUserTimeZone ( { state, commit }, payload) {
      const resp = await UserService.setUserTimeZone(payload)
      if (resp.status === 200 && !hasError(resp)) {
        const current: any = state.current;
        current.userTimeZone = payload.timeZoneId;
        commit(types.USER_INFO_UPDATED, current);
        Settings.defaultZone = current.userTimeZone;
        showToast(translate("Time zone updated successfully"));
      }
    },

  // update current facility information
  async setFacility ({ commit, state }, payload) {
    let facility = payload.facility;
    if(!facility && state.current?.facilities) {
      facility = state.current.facilities.find((facility: any) => facility.facilityId === payload.facilityId);
    }
    commit(types.USER_CURRENT_FACILITY_UPDATED, facility);
    const eComStore = await UserService.getCurrentEComStore(undefined, facility?.facilityId);
    commit(types.USER_CURRENT_ECOM_STORE_UPDATED, eComStore);
  },

  // Set User Instance Url
  setUserInstanceUrl ({ commit }, payload){
    commit(types.USER_INSTANCE_URL_UPDATED, payload)
    updateInstanceUrl(payload)
  },

  updateViewQOHConfig( { commit }, config){
    commit(types.USER_VIEW_QOH_CNFG_UPDATED, config)
  },
}
export default actions;