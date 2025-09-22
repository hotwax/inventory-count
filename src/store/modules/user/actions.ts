import { UserService } from "@/services/UserService"
import { ActionTree } from "vuex"
import RootState from "@/store/RootState"
import UserState from "./UserState"
import * as types from "./mutation-types"
import { getProductStoreId, hasError, showToast } from "@/utils"
import logger from "@/logger"
import { translate } from "@/i18n"
import { Settings } from "luxon";
import { resetConfig, updateToken, updateInstanceUrl } from "@/adapter"
import { useAuthStore, useProductIdentificationStore, useUserStore } from "@hotwax/dxp-components"
import emitter from "@/event-bus"
import { getServerPermissionsFromRules, prepareAppPermissions, resetPermissions, setPermissions } from "@/authorization"
import store from "@/store"
import { deleteDB } from "@/utils/indexeddb"

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

      const serverPermissions: Array<string> = await UserService.getUserPermissions({
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

      const api_key = await UserService.login(token)

      const userProfile = await UserService.getUserProfile(api_key);

      if (userProfile.timeZone) {
        Settings.defaultZone = userProfile.timeZone;
      }

      // Update dxp state, as we need to set updated token and oms in dxp
      const authStore = useAuthStore()
      authStore.$patch({
        token: { value: api_key, expiration: authStore.token.expiration as any },
        oms,
        isEmbedded: authStore.isEmbedded,
        shop: authStore.shop as any,
        host: authStore.host as any
      })

      const isAdminUser = appPermissions.some((appPermission: any) => appPermission?.action === "APP_DRAFT_VIEW")
      const facilities = await useUserStore().getUserFacilities(isAdminUser ? "" : userProfile.partyId, "", isAdminUser, {
        parentTypeId: "VIRTUAL_FACILITY",
        parentTypeId_not: "Y",
        facilityTypeId: "VIRTUAL_FACILITY",
        facilityTypeId_not: "Y"
      });
      await useUserStore().getFacilityPreference("SELECTED_FACILITY", userProfile?.userId)
      if(!facilities.length) throw "Unable to login. User is not associated with any facility"
      const currentFacility: any = useUserStore().getCurrentFacility
      isAdminUser ? await useUserStore().getEComStores() : await useUserStore().getEComStoresByFacility(currentFacility?.facilityId)
      await useUserStore().getEComStorePreference("SELECTED_BRAND", userProfile?.userId)
      const preferredStore: any = useUserStore().getCurrentEComStore

      setPermissions(appPermissions);
      if(omsRedirectionUrl && token) {
        dispatch("setOmsRedirectionInfo", { url: omsRedirectionUrl, token })
      }

      updateToken(api_key);

      commit(types.USER_PERMISSIONS_UPDATED, appPermissions);
      commit(types.USER_TOKEN_CHANGED, { newToken: api_key })
      commit(types.USER_INFO_UPDATED, userProfile);

      // Get product identification from api using dxp-component
      await useProductIdentificationStore().getIdentificationPref(preferredStore.productStoreId)
      .catch((error) => logger.error(error));
    
      await dispatch("getProductStoreSetting")
      await dispatch('getFieldMappings')
    } catch (err: any) {
      logger.error("error", err);
      return Promise.reject(new Error(err))
    }
  },
  
  /**
  * Logout user
  */
  async logout({ commit, dispatch }, payload = { isUserUnauthorised: false }) {
    if(!payload.isUserUnauthorised) emitter.emit('presentLoader', { message: 'Logging out', backdropDismiss: false })

    const authStore = useAuthStore()
    const userStore = useUserStore()

    // TODO add any other tasks if need
    commit(types.USER_END_SESSION)
    // this.dispatch("util/clearUtilState");
    dispatch("setOmsRedirectionInfo", { url: "", token: "" })
    resetConfig();
    resetPermissions();

    // reset plugin state on logout
    authStore.$reset()
    userStore.$reset()

    commit(types.USER_PRODUCT_STORE_SETTING_UPDATED, { showQoh: false, forceScan: false, barcodeIdentificationPref: "internalName" })
    this.dispatch('count/clearCycleCounts')
    this.dispatch('count/clearCycleCountItems')
    this.dispatch('product/clearCachedProducts')

    // Clear indexedDB storage on logout
    deleteDB("cycleCounts");

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
    updateInstanceUrl(payload)
  },

  async updateCurrentFacility({ dispatch }, facility) {
    const previousEComStoreId = getProductStoreId()
    const userProfile = store.getters["user/getUserProfile"]
    await useUserStore().getEComStoresByFacility(facility.facilityId);
    await useUserStore().getEComStorePreference('SELECTED_BRAND', userProfile.userId);
    const preferredStore: any = useUserStore().getCurrentEComStore

    if(previousEComStoreId !== preferredStore.productStoreId) {
      dispatch("getProductStoreSetting", preferredStore.productStoreId)
      await useProductIdentificationStore().getIdentificationPref(preferredStore.productStoreId)
      .catch((error) => logger.error(error));
    }
  },

  async updateCurrentProductStore({ commit, dispatch }, selectedProductStore) {
    commit(types.USER_PRODUCT_STORE_SETTING_UPDATED, { showQoh: false, forceScan: false, isFirstScanCountEnabled: false, barcodeIdentificationPref: "internalName" })

    await useProductIdentificationStore().getIdentificationPref(selectedProductStore.productStoreId)
      .catch((error) => logger.error(error));
    dispatch("getProductStoreSetting", selectedProductStore?.productStoreId);
  },

  async getProductStoreSetting({ commit }, productStoreId?: string) {
    const payload = {
      "productStoreId": productStoreId ? productStoreId : getProductStoreId(),
      "settingTypeEnumId": "INV_CNT_VIEW_QOH,INV_FORCE_SCAN,INV_COUNT_FIRST_SCAN,BARCODE_IDEN_PREF",
      "settingTypeEnumId_op": "in",
      "pageSize": 50
    }

    try {
      const resp = await UserService.fetchProductStoreSettings(payload) as any
      if(!hasError(resp) && resp.data.length) {
        const settings = resp.data.reduce((settings: any, setting: any) => {
          if(setting.settingTypeEnumId === "INV_CNT_VIEW_QOH" && setting.settingValue) {
            settings["showQoh"] = JSON.parse(setting.settingValue)
          }

          if(setting.settingTypeEnumId === "INV_FORCE_SCAN" && setting.settingValue) {
            settings["forceScan"] = JSON.parse(setting.settingValue)
          }

          if(setting.settingTypeEnumId === "INV_COUNT_FIRST_SCAN" && setting.settingValue) {
            settings["isFirstScanCountEnabled"] = JSON.parse(setting.settingValue)
          }

          if(setting.settingTypeEnumId === "BARCODE_IDEN_PREF" && setting.settingValue) {
            settings["barcodeIdentificationPref"] = setting.settingValue
          }
          return settings
        }, {
          showQoh: false,
          forceScan: false,
          isFirstScanCountEnabled: false,
          barcodeIdentificationPref: "internalName"
        })
        commit(types.USER_PRODUCT_STORE_SETTING_UPDATED, settings)
      }
    } catch(err) {
      console.error(err)
    }
  },

  async createProductStoreSetting({ commit }, payload) {
    const eComStoreId = getProductStoreId();
    let isSettingExists = false;

    let settingValue = false as any;
    if(payload.enumId === "BARCODE_IDEN_PREF") settingValue = "internalName"

    const params = {
      "productStoreId": eComStoreId,
      "settingTypeEnumId": payload.enumId,
      settingValue
    }

    try {
      await UserService.createProductStoreSetting(params) as any
      isSettingExists = true
    } catch(err) {
      console.error(err)
    }

    // not checking for resp success and fail case as every time we need to update the state with the
    // default value when creating a scan setting
    commit(types.USER_PRODUCT_STORE_SETTING_UPDATED, { [payload.key]: settingValue })
    return isSettingExists;
  },

  async setProductStoreSetting({ commit, dispatch, state }, payload) {
    const eComStoreId = getProductStoreId();
    let prefValue = (state.settings as any)[payload.key]

    let enumId = "";

    if(payload.key === "showQoh") {
      enumId = "INV_CNT_VIEW_QOH"
    }

    if(payload.key === "forceScan") {
      enumId = "INV_FORCE_SCAN"
    }

    if(payload.key === "isFirstScanCountEnabled") {
      enumId = "INV_COUNT_FIRST_SCAN"
    }

    if(payload.key === "barcodeIdentificationPref") {
      enumId = "BARCODE_IDEN_PREF"
    }

    let isSettingExists = false;

    try {
      const resp = await UserService.fetchProductStoreSettings({
        "productStoreId": getProductStoreId(),
        "settingTypeEnumId": enumId
      })
      if(!hasError(resp) && resp.data[0]?.settingTypeEnumId) {
        isSettingExists = true;
      }
    } catch(err) {
      console.error(err)
    }

    if(!isSettingExists) {
      isSettingExists = await dispatch("createProductStoreSetting", { key: payload.key, enumId });
    }

    if(!isSettingExists) {
      showToast(translate("Failed to update Store preference."))
      commit(types.USER_PRODUCT_STORE_SETTING_UPDATED, { [payload.key]: prefValue })
      return;
    }

    const params = {
      "productStoreId": eComStoreId,
      "settingTypeEnumId": enumId,
      "settingValue": payload.key !== "barcodeIdentificationPref" ? JSON.stringify(payload.value) : payload.value
    }

    try {
      const resp = await UserService.updateProductStoreSetting(params) as any

      if((!hasError(resp))) {
        showToast(translate("Store preference updated successfully."))
        prefValue = payload.value
      } else {
        throw resp.data;
      }
    } catch(err) {
      showToast(translate("Failed to update Store preference."))
      console.error(err)
    }
    commit(types.USER_PRODUCT_STORE_SETTING_UPDATED, { [payload.key]: prefValue })
  },

  async getFieldMappings({ commit }) {
    let fieldMappings = {} as any;
    try {
      const payload = {
        "mappingPrefTypeEnumId": Object.values(JSON.parse(process.env.VUE_APP_MAPPING_TYPES as string)),
        "mappingPrefTypeEnumId_op": "in",
        "pageSize": 20 // considered a user won't have more than 20 saved mappings
      }

      const mappingTypes = JSON.parse(process.env.VUE_APP_MAPPING_TYPES as string)
      
      // This is needed as it would easy to get app name to categorize mappings
      const mappingTypesFlip = Object.keys(mappingTypes).reduce((mappingTypesFlip: any, mappingType) => {
        // Updating fieldMpaaings here in case the API fails 
        fieldMappings[mappingType] = {};
        mappingTypesFlip[mappingTypes[mappingType]] = mappingType;
        return mappingTypesFlip;
      }, {});

      const resp = await UserService.getFieldMappings(payload);
      if(!hasError(resp)) {
        // updating the structure for mappings so as to directly store it in state
        fieldMappings = resp.data.reduce((mappings: any, fieldMapping: any) => {
          const mappingType = mappingTypesFlip[fieldMapping.mappingPrefTypeEnumId]
          const mapping = mappings[mappingType];

          mapping[fieldMapping.mappingPrefId] = {
            name: fieldMapping.mappingPrefName,
            value: JSON.parse(fieldMapping.mappingPrefValue)
          }

          fieldMappings[mappingType] = mapping;
          return mappings;
        }, fieldMappings)

      } else {
        logger.error('error', 'No field mapping preference found')
      }
    } catch(err) {
      logger.error('error', err)
    }
    commit(types.USER_FIELD_MAPPINGS_UPDATED, fieldMappings)
  },

  async createFieldMapping({ commit }, payload) {
    try {

      const mappingTypes = JSON.parse(process.env.VUE_APP_MAPPING_TYPES as string)
      const mappingPrefTypeEnumId = mappingTypes[payload.mappingType];

      const params = {
        mappingPrefId: payload.id,
        mappingPrefName: payload.name,
        mappingPrefValue: JSON.stringify(payload.value),
        mappingPrefTypeEnumId
      }

      const resp = await UserService.createFieldMapping(params);

      if (!hasError(resp)) {

        // using id coming from server, as the random generated id sent in payload is not set as mapping id
        // and an auto generated mapping from server is set as id
        const fieldMapping = {
          id: resp.data.mappingPrefId,
          name: payload.name,
          value: payload.value,
          type: payload.mappingType
        }

        commit(types.USER_FIELD_MAPPING_CREATED, fieldMapping)
        showToast(translate('This CSV mapping has been saved.'))
      } else {
        logger.error('error', 'Failed to save CSV mapping.')
        showToast(translate('Failed to save CSV mapping.'))
      }
    } catch(err) {
      logger.error('error', err)
      showToast(translate('Failed to save CSV mapping.'))
    }
  },

  async updateFieldMapping({ commit, state }, payload) {
    try {

      const mappingTypes = JSON.parse(process.env.VUE_APP_MAPPING_TYPES as string)
      const mappingPrefTypeEnumId = mappingTypes[payload.mappingType];

      const params = {
        mappingPrefId: payload.id,
        mappingPrefName: payload.name,
        mappingPrefValue: JSON.stringify(payload.value),
        mappingPrefTypeEnumId
      }

      const resp = await UserService.updateFieldMapping(params);

      if(!hasError(resp)) {
        const mappings = JSON.parse(JSON.stringify(state.fieldMappings))

        mappings[payload.mappingType][payload.id] = {
          name: payload.name,
          value: payload.value
        }

        commit(types.USER_FIELD_MAPPINGS_UPDATED, mappings)
        showToast(translate('Changes to the CSV mapping has been saved.'))
      } else {
        logger.error('error', 'Failed to update CSV mapping.')
        showToast(translate('Failed to update CSV mapping.'))
      }
    } catch(err) {
      logger.error('error', err)
      showToast(translate('Failed to update CSV mapping.'))
    }
  },

  async deleteFieldMapping({ commit, state }, payload) {
    try {
      const resp = await UserService.deleteFieldMapping({
        'mappingPrefId': payload.id
      });

      if(!hasError(resp)) {

        const mappings = JSON.parse(JSON.stringify(state.fieldMappings))
        delete mappings[payload.mappingType][payload.id]

        commit(types.USER_FIELD_MAPPINGS_UPDATED, mappings)
        commit(types.USER_CURRENT_FIELD_MAPPING_UPDATED, {
          id: '',
          mappingType: '',
          name: '',
          value: {}
        })
        showToast(translate('This CSV mapping has been deleted.'))
      } else {
        logger.error('error', 'Failed to delete CSV mapping.')
        showToast(translate('Failed to delete CSV mapping.'))
      }
    } catch(err) {
      logger.error('error', err)
      showToast(translate('Failed to delete CSV mapping.'))
    }
  },

  async updateCurrentMapping({ commit, state }, payload) {
    const currentMapping = {
      id: payload.id,
      mappingType: payload.mappingType,
      ...(state.fieldMappings as any)[payload.mappingType][payload.id]
    }
    commit(types.USER_CURRENT_FIELD_MAPPING_UPDATED, currentMapping)
  },
  async clearCurrentMapping({ commit }) {
    commit(types.USER_CURRENT_FIELD_MAPPING_UPDATED, {
      id: '',
      mappingType: '',
      name: '',
      value: {}
    })
  },

  async updateScrollingAnimationPreference({commit}, payload) {
    commit(types.USER_ENABLE_SCROLLING_ANIMATION_UPDATED, payload)
  },

}
export default actions;