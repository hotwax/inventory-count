import { UserService } from '@/services/UserService'
import { ActionTree } from 'vuex'
import RootState from '@/store/RootState'
import UserState from './UserState'
import * as types from './mutation-types'
import { hasError, showToast } from '@/utils'
import { translate } from '@/i18n'
import moment from 'moment';
import emitter from '@/event-bus'
import "moment-timezone";

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
              dispatch('getProfile')
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
            dispatch('getProfile')
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
    } catch (err) {
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
    
  },

  /**
   * Get User profile
   */
  async getProfile ( { commit, dispatch }) {
    const resp = await UserService.getProfile()
    if (resp.status === 200) {
      const localTimeZone = moment.tz.guess();
      if (resp.data.userTimeZone !== localTimeZone) {
        emitter.emit('timeZoneDifferent', { profileTimeZone: resp.data.userTimeZone, localTimeZone});
      }
      commit(types.USER_INFO_UPDATED, resp.data);
      if (resp.data.facilities.length > 0) {
        await dispatch('getEComStores', { facilityId: resp.data.facilities[0].facilityId })
      }
      commit(types.USER_CURRENT_FACILITY_UPDATED, resp.data.facilities.length > 0 ? resp.data.facilities[0] : {});
    }
    return resp;
  },

  /**
   *  update current eComStore information
  */
  async setEComStore({ commit, dispatch }, payload) {
    commit(types.USER_CURRENT_ECOM_STORE_UPDATED, payload.eComStore);
    await UserService.setUserPreference({
      'userPrefTypeId': 'SELECTED_BRAND',
      'userPrefValue': payload.eComStore.productStoreId
    });
  },

  /**
   * Update user timeZone
   */
     async setUserTimeZone ( { state, commit }, payload) {
      const resp = await UserService.setUserTimeZone(payload)
      if (resp.status === 200 && !hasError(resp)) {
        const current: any = state.current;
        current.userTimeZone = payload.tzId;
        commit(types.USER_INFO_UPDATED, current);
        showToast(translate("Time zone updated successfully"));
      }
    },

  // update current facility information
  async setFacility ({ commit, dispatch }, payload) {
    await dispatch("getEComStores", { facilityId: payload.facility.facilityId });
  },

  // Set User Instance Url
  setUserInstanceUrl ({ state, commit }, payload){
    commit(types.USER_INSTANCE_URL_UPDATED, payload)
  },

  async getEComStores({ state, commit, dispatch }, payload) {
    let resp;

    try {
      const param = {
        "inputFields": {
          "facilityId": payload.facilityId,
          "storeName_op": "not-empty"
        },
        "fieldList": ["productStoreId", "storeName"],
        "entityName": "ProductStore",
        "distinct": "Y",
        "noConditionFind": "Y"
      }

      resp = await UserService.getEComStores(param);
      if(resp.status === 200 && !hasError(resp) && resp.data.docs?.length > 0) {
        const user = state.current as any;
        user.stores = [{
          productStoreId: '',
          storeName: 'None'
        }, ...(resp.data.docs ? resp.data.docs : [])]

        let userPrefStore = ''

        try {
          const userPref =  await UserService.getUserPreference({
           'userPrefTypeId': 'SELECTED_BRAND'
          });
          userPrefStore = user.stores.find((store: any) => store.productStoreId == userPref.data.userPrefValue)
        } catch (err) {
          console.log(err)
        }

        dispatch('setEComStore', { eComStore: userPrefStore ? userPrefStore : user.stores.length > 0 ? user.stores[0] : {} });
        commit(types.USER_INFO_UPDATED, user);
        return user.stores
      } else {
        console.error(resp);
      }
    } catch(error) {
      console.error(error);
    }
    return []
  }
}
export default actions;