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
import { getServerPermissionsFromRules, hasPermission, prepareAppPermissions, resetPermissions, setPermissions } from "@/authorization"

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
      await dispatch("fetchProductStores")
      await dispatch('getFieldMappings')
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
    commit(types.USER_PRODUCT_STORES_UPDATED, [])
    commit(types.USER_PRODUCT_STORE_SETTING_UPDATED, { showQoh: false, forceScan: false, barcodeIdentificationPref: "internalName", productIdentificationPref: {
      primaryId: 'productId',
      secondaryId: ''
    }})
    commit(types.USER_GOOD_IDENTIFICATION_TYPES_UPDATED, [])
    this.dispatch('count/clearCycleCounts')
    this.dispatch('count/clearCycleCountItems')

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

  async fetchFacilities({ commit, dispatch, state }) {
    let facilities: Array<any> = []
    try {
      let associatedFacilityIds: Array<string> = []
      let params = {}

      if(!hasPermission("APP_DRAFT_VIEW")) {
        const associatedFacilitiesResp = await UserService.fetchAssociatedFacilities({
          partyId: (state.current as any).partyId,
          pageSize: 200
        })

        if(!hasError(associatedFacilitiesResp)) {
          // Filtering facilities on which thruDate is set, as we are unable to pass thruDate check in the api payload
          // Considering that the facilities will always have a thruDate of the past.
          associatedFacilityIds = associatedFacilitiesResp.data.filter((facility: any) => !facility.thruDate)?.map((facility: any) => facility.facilityId)
        }

        if(!associatedFacilityIds.length) {
          throw "Failed to fetch facilities"
        }

        params = {
          facilityId: associatedFacilityIds.join(","),
          facilityId_op: "in",
          pageSize: associatedFacilityIds.length,
        }
      }

      // Making this call to fetch the facility details like name, as the above api does not return facility details, need to replace this once api has support to return facility details
      const resp = await UserService.fetchFacilities({
        parentTypeId: "VIRTUAL_FACILITY",
        parentTypeId_not: "Y",
        facilityTypeId: "VIRTUAL_FACILITY",
        facilityTypeId_not: "Y",
        pageSize: 200,
        ...params
      })

      if(!hasError(resp)) {
        facilities = resp.data
      }
    } catch(err) {
      logger.error("Failed to fetch facilities")
    }

    // Updating current facility with a default first facility when fetching facilities on login
    if(facilities.length) {
      dispatch("updateCurrentFacility", facilities[0])
    }

    commit(types.USER_FACILITIES_UPDATED, facilities)
  },

  async updateCurrentFacility({ commit, dispatch }, facility) {
    if(!facility.productStore) {
      // Fetching productStore for the facility and storing it in the facility, as we want to manage the productStores separately as well
      // Thus to not have any conflicts in the information, saving the productStores on facility
      try {
        const resp = await UserService.fetchProductStores({
          parentFacilityTypeId: "VIRTUAL_FACILITY",
          parentFacilityTypeId_not: "Y",
          facilityTypeId: "VIRTUAL_FACILITY",
          facilityTypeId_not: "Y",
          facilityId: facility.facilityId,
          pageSize: 1
        })

        if(!hasError(resp) && resp.data.length > 0) {
          facility.productStore = resp.data[0]
        }
      } catch(err) {
        logger.error("Failed to fetch facilities for product store")
      }
    }

    if(facility?.productStore?.productStoreId) {
      dispatch("getProductStoreSetting", facility.productStore.productStoreId)
    }

    commit(types.USER_CURRENT_FACILITY_UPDATED, facility)
  },

  async fetchProductStores({ commit, dispatch }) {
    let productStores: Array<any> = []
    try {
      const resp = await UserService.fetchProductStores({
        parentFacilityTypeId: "VIRTUAL_FACILITY",
        parentFacilityTypeId_not: "Y",
        facilityTypeId: "VIRTUAL_FACILITY",
        facilityTypeId_not: "Y",
        pageSize: 200
      })

      if(!hasError(resp)) {
        const productStoresResp = resp.data.reduce((productStores: any, data: any) => {
          // TODO: Added this check as we are getting duplicate productStores in resp
          if(productStores[data.productStoreId]) {
            return productStores
          }

          productStores[data.productStoreId] = {
            productStoreId: data.productStoreId,
            storeName: data.storeName,
            facilityId: data.facilityId
          }
          return productStores
        }, {})

        productStores = Object.values(productStoresResp)
      }
    } catch(err) {
      logger.error("Failed to fetch product stores")
    }

    // Updating current facility with a default first facility when fetching facilities on login
    if(productStores.length) {
      commit(types.USER_CURRENT_PRODUCT_STORE_UPDATED, productStores[0])
      dispatch("getProductStoreSetting")
    }

    commit(types.USER_PRODUCT_STORES_UPDATED, productStores)
  },

  async updateCurrentProductStore({ commit, dispatch }, productStore) {
    commit(types.USER_CURRENT_PRODUCT_STORE_UPDATED, productStore)
    commit(types.USER_PRODUCT_STORE_SETTING_UPDATED, { showQoh: false, forceScan: false, barcodeIdentificationPref: "internalName", productIdentificationPref: {
      primaryId: 'productId',
      secondaryId: ''
    } })
    dispatch("getProductStoreSetting")
  },

  async getProductStoreSetting({ commit, state }, productStoreId?: string) {
    const payload = {
      "productStoreId": productStoreId ? productStoreId : state.currentProductStore.productStoreId,
      "settingTypeEnumId": "INV_CNT_VIEW_QOH,INV_FORCE_SCAN,PRDT_IDEN_PREF,BARCODE_IDEN_PREF",
      "settingTypeEnumId_op": "in",
      "pageSize": 10
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

          if(setting.settingTypeEnumId === "PRDT_IDEN_PREF" && setting.settingValue) {
            settings["productIdentificationPref"] = JSON.parse(setting.settingValue)
          }

          if(setting.settingTypeEnumId === "BARCODE_IDEN_PREF" && setting.settingValue) {
            settings["barcodeIdentificationPref"] = setting.settingValue
          }
          return settings
        }, {
          showQoh: false,
          forceScan: false,
          barcodeIdentificationPref: "internalName"
        })
        commit(types.USER_PRODUCT_STORE_SETTING_UPDATED, settings)
      }
    } catch(err) {
      console.error(err)
    }
  },

  async createProductStoreSetting({ commit, state }, payload) {
    const eComStoreId = state.currentProductStore.productStoreId;
    const fromDate = Date.now()

    let settingValue = false as any;
    if(payload.enumId === "BARCODE_IDEN_PREF") settingValue = "internalName"
    if(payload.enumId === "PRDT_IDEN_PREF") settingValue = JSON.stringify({
      primaryId: 'productId',
      secondaryId: ''
    })

    const params = {
      fromDate,
      "productStoreId": eComStoreId,
      "settingTypeEnumId": payload.enumId,
      settingValue
    }

    try {
      await UserService.createProductStoreSetting(params) as any
    } catch(err) {
      console.error(err)
    }

    // not checking for resp success and fail case as every time we need to update the state with the
    // default value when creating a scan setting
    commit(types.USER_PRODUCT_STORE_SETTING_UPDATED, { [payload.key]: settingValue })
    return fromDate;
  },

  async setProductStoreSetting({ commit, dispatch, state }, payload) {
    const eComStoreId = state.currentProductStore.productStoreId;
    let prefValue = (state.settings as any)[payload.key]

    let enumId = "";

    if(payload.key === "showQoh") {
      enumId = "INV_CNT_VIEW_QOH"
    }

    if(payload.key === "forceScan") {
      enumId = "INV_FORCE_SCAN"
    }

    if(payload.key === "productIdentificationPref") {
      enumId = "PRDT_IDEN_PREF"
    }

    if(payload.key === "barcodeIdentificationPref") {
      enumId = "BARCODE_IDEN_PREF"
    }

    let fromDate;

    try {
      const resp = await UserService.fetchProductStoreSettings({
        "productStoreId": state.currentProductStore.productStoreId,
        "settingTypeEnumId": enumId
      })
      if(!hasError(resp) && resp.data.length) {
        fromDate = resp.data[0]?.fromDate
      }
    } catch(err) {
      console.error(err)
    }

    if(!fromDate) {
      fromDate = await dispatch("createProductStoreSetting", { key: payload.key, enumId });
    }

    const params = {
      "fromDate": fromDate,
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

  async fetchGoodIdentificationTypes({ commit }, parentTypeId = "HC_GOOD_ID_TYPE") {
    let identificationTypes = process.env.VUE_APP_PRDT_IDENT ? JSON.parse(process.env.VUE_APP_PRDT_IDENT) : []
    const payload = {
      "inputFields": {
        parentTypeId
      },
      "fieldList": ["goodIdentificationTypeId", "description"],
      "viewSize": 50,
      "entityName": "GoodIdentificationType",
    }
    try {
      const resp = await UserService.fetchGoodIdentificationTypes(payload)
      if (!hasError(resp) && resp.data?.docs?.length) {
        const identificationOptions = resp.data.docs?.map((fetchedGoodIdentificationType: any) => fetchedGoodIdentificationType.goodIdentificationTypeId) || [];
        // Merge the arrays and remove duplicates
        identificationTypes = Array.from(new Set([...identificationOptions, ...identificationTypes])).sort();
      } else {
        throw resp.data;
      }
    } catch (err) {
      console.error('Failed to fetch the good identification types, setting default types')
    }
    commit(types.USER_GOOD_IDENTIFICATION_TYPES_UPDATED, identificationTypes)
  }
}
export default actions;