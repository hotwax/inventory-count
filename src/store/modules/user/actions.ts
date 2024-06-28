import { UserService } from "@/services/UserService"
import { ActionTree } from "vuex"
import RootState from "@/store/RootState"
import UserState from "./UserState"
import * as types from "./mutation-types"
import { hasError, showToast } from "@/utils"
import logger from "@/logger"
import { translate } from "@/i18n"
import { Settings } from "luxon";
import { resetConfig } from "@/adapter"
import { useAuthStore } from "@hotwax/dxp-components"
import emitter from "@/event-bus"
import { getServerPermissionsFromRules, prepareAppPermissions, resetPermissions, setPermissions } from "@/authorization"

const actions: ActionTree<UserState, RootState> = {

    /**
  * Login user and return token
  */
  async login ({ commit, dispatch }, payload) {
    try {

      // TODO: implement support for permission check

      const { token, oms, omsRedirectionUrl } = payload;
      dispatch("setUserInstanceUrl", oms);

      // Getting the permissions list from server
      const permissionId = process.env.VUE_APP_PERMISSION_ID;
      // Prepare permissions list
      const serverPermissionsFromRules = getServerPermissionsFromRules();
      if (permissionId) serverPermissionsFromRules.push(permissionId);

      const serverPermissions = await UserService.getUserPermissions({
        permissionIds: [...new Set(serverPermissionsFromRules)]
      }, omsRedirectionUrl, token);
      const appPermissions = prepareAppPermissions(serverPermissions);


      // Checking if the user has permission to access the app
      // If there is no configuration, the permission check is not enabled
      if (permissionId) {
        // As the token is not yet set in the state passing token headers explicitly
        // TODO Abstract this out, how token is handled should be part of the method not the callee
        const hasPermission = appPermissions.some((appPermission: any) => appPermission.action === permissionId );
        // If there are any errors or permission check fails do not allow user to login
        if (!hasPermission) {
          const permissionError = 'You do not have permission to access the app.';
          showToast(translate(permissionError));
          logger.error("error", permissionError);
          return Promise.reject(new Error(permissionError));
        }
      }

      emitter.emit("presentLoader", { message: "Logging in...", backdropDismiss: false })
      const api_key = await UserService.login(token)

      const userProfile = await UserService.getUserProfile(api_key);

      if (userProfile.timeZone) {
        Settings.defaultZone = userProfile.timeZone;
      }

      setPermissions(appPermissions);
      if(omsRedirectionUrl && token) {
        dispatch("setOmsRedirectionInfo", { url: omsRedirectionUrl, token })
      }
      commit(types.USER_TOKEN_CHANGED, { newToken: api_key })
      commit(types.USER_INFO_UPDATED, userProfile);
      commit(types.USER_PERMISSIONS_UPDATED, appPermissions);
      await dispatch("fetchFacilities")
      emitter.emit("dismissLoader")
    } catch (err: any) {
      emitter.emit("dismissLoader")
      showToast(translate(err));
      logger.error("error", err);
      return Promise.reject(new Error(err))
    }
  },
  
  /**
  * Logout user
  */
  async logout({ commit, dispatch }) {
    emitter.emit('presentLoader', { message: 'Logging out', backdropDismiss: false })

    const authStore = useAuthStore()

    // TODO add any other tasks if need
    commit(types.USER_END_SESSION)
    // this.dispatch("util/clearUtilState");
    dispatch("setOmsRedirectionInfo", { url: "", token: "" })
    resetConfig();
    resetPermissions();

    // reset plugin state on logout
    authStore.$reset()

    commit(types.USER_FACILITIES_UPDATED, [])
    commit(types.USER_CURRENT_FACILITY_UPDATED, {})
    this.dispatch('pickerCount/clearCycleCounts')
    this.dispatch('pickerCount/clearCycleCountItems')

    emitter.emit('dismissLoader')
  },

  /**
  * Update user timeZone
  */
  async setUserTimeZone({ state, commit }, payload) {
    const current: any = state.current;
    // TODO: add support to change the user time on server, currently api to update user is not available
    if(current.timeZone !== payload.tzId) {
      current.timeZone = payload.tzId;
      commit(types.USER_INFO_UPDATED, current);
      Settings.defaultZone = current.timeZone;
      showToast(translate("Time zone updated successfully"));
    }
  },

  setOmsRedirectionInfo({ commit }, payload) {
    commit(types.USER_OMS_REDIRECTION_INFO_UPDATED, payload)
  },

  /**
  * Set User Instance Url
  */
  setUserInstanceUrl({ commit }, payload) {
    commit(types.USER_INSTANCE_URL_UPDATED, payload)
  },

  async fetchFacilities({ commit }) {
    let facilities: Array<any> = []
    try {
      const resp = await UserService.fetchFacilities({
        parentTypeId: "VIRTUAL_FACILITY",
        parentTypeId_not: "Y",
        facilityTypeId: "VIRTUAL_FACILITY",
        facilityTypeId_not: "Y",
        pageSize: 200
      })

      if(!hasError(resp)) {
        facilities = resp.data
      }
    } catch(err) {
      logger.error("Failed to fetch facilities")
    }

    // Updating current facility with a default first facility when fetching facilities on login
    if(facilities.length) {
      commit(types.USER_CURRENT_FACILITY_UPDATED, facilities[0])
    }

    commit(types.USER_FACILITIES_UPDATED, facilities)
  },

  async updateCurrentFacility({ commit }, facility) {
    commit(types.USER_CURRENT_FACILITY_UPDATED, facility)
  }
}
export default actions;