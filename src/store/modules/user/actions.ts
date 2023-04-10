import { UserService } from '@/services/UserService'
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import UserState from './UserState'
import * as types from './mutation-types'
import { hasError, showToast } from '@/utils'
import { translate } from '@/i18n'
import { Settings } from 'luxon';
import { updateInstanceUrl, updateToken, resetConfig } from '@/adapter'

const actions: ActionTree<UserState, RootState> = {

  /**
  * Login user and return token
  */
  async login ({ commit, dispatch }, { username, password }) {
    try {
      const resp = await UserService.login(username, password)
      if (resp.status === 200 && resp.data) {
        if (resp.data.token) {
          const permissionId = process.env.VUE_APP_PERMISSION_ID;
          if (permissionId) {
            const checkPermissionResponse = await UserService.checkPermission({
              data: {
                permissionId
              },
              headers: {
                Authorization:  'Bearer ' + resp.data.token,
                'Content-Type': 'application/json'
              }
            });

            if (checkPermissionResponse.status === 200 && !hasError(checkPermissionResponse) && checkPermissionResponse.data && checkPermissionResponse.data.hasPermission) {
              commit(types.USER_TOKEN_CHANGED, { newToken: resp.data.token })
              updateToken(resp.data.token)
              await dispatch('getProfile')
              if (resp.data._EVENT_MESSAGE_ && resp.data._EVENT_MESSAGE_.startsWith("Alert:")) {
              // TODO Internationalise text
                showToast(translate(resp.data._EVENT_MESSAGE_));
              }
              return resp.data;
            } else {
              const permissionError = 'You do not have permission to access the app.';
              showToast(translate(permissionError));
              console.error("error", permissionError);
              return Promise.reject(new Error(permissionError));
            }
          } else {
            commit(types.USER_TOKEN_CHANGED, { newToken: resp.data.token })
            updateToken(resp.data.token)
            await dispatch('getProfile')
            return resp.data;
          }
        } else if (hasError(resp)) {
          showToast(translate('Sorry, your username or password is incorrect. Please try again.'));
          console.error("error", resp.data._ERROR_MESSAGE_);
          return Promise.reject(new Error(resp.data._ERROR_MESSAGE_));
        }
      } else {
        showToast(translate('Something went wrong'));
        console.error("error", resp.data._ERROR_MESSAGE_);
        return Promise.reject(new Error(resp.data._ERROR_MESSAGE_));
      }
    } catch (err: any) {
      showToast(translate('Something went wrong'));
      console.error("error", err);
      return Promise.reject(new Error(err))
    }
    // return resp
  },

  /**
   * Logout user
   */
  async logout ({ commit }) {
    // TODO add any other tasks if need
    commit(types.USER_END_SESSION)
    this.dispatch('product/clearSearchProducts');
    this.dispatch('product/clearUploadProducts');
    resetConfig();
  },

  /**
   * Get User profile
   */
  async getProfile ( { commit }) {
    const resp = await UserService.getProfile()
    if (resp.status === 200) {
      if (resp.data.userTimeZone) {
        Settings.defaultZone = resp.data.userTimeZone;
      }
      commit(types.USER_INFO_UPDATED, resp.data);
      commit(types.USER_CURRENT_FACILITY_UPDATED, resp.data.facilities.length > 0 ? resp.data.facilities[0] : {});
    }
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
  async setFacility ({ commit }, payload) {
    commit(types.USER_CURRENT_FACILITY_UPDATED, payload.facility);
  },

  // Set User Instance Url
  setUserInstanceUrl ({ commit }, payload){
    commit(types.USER_INSTANCE_URL_UPDATED, payload)
    updateInstanceUrl(payload)
  }
}
export default actions;