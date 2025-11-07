import { defineStore } from 'pinia'
import api, { client } from '@/api'
import { hasError, showToast } from '@/utils'
import logger from '@/logger'
import { translate } from '@/i18n'

export const useUserProfile = defineStore('userProfile', {
  state: () => ({
    current: null as any,
    permissions: [] as string[],
    fieldMappings: {} as Record<string, any>,
    currentMapping: {
      id: '',
      mappingType: '',
      name: '',
      value: {}
    },
    settings: {
      isFirstScanCountEnabled: false,
      forceScan: false,
      showQoh: false,
      barcodeIdentificationPref: 'internalName'
    } as any,
    isScrollingAnimationEnabled: false,
    deviceId: '',
  }),

  persist: true,

  getters: {
    getUserProfile: (state) => state.current,
    getUserPermissions: (state) => state.permissions,
    getFieldMappings: (state) => (type?: string) =>
      type ? state.fieldMappings[type] || {} : state.fieldMappings,
    getProductStoreSettings: (state) => state.settings,
    getDeviceId: (state) => state.deviceId,
    getIsScrollingAnimationEnabled: (state) => state.isScrollingAnimationEnabled,
  },

  actions: {
    /** Initialize after login */
    async setUserProfile(profile: any) {
      this.current = profile
    },

    setDeviceId(deviceId: string) {
      this.deviceId = deviceId
    },

    setScrollingAnimationPreference(enabled: boolean) {
      this.isScrollingAnimationEnabled = enabled
    },

    async fetchProductStoreSettings(productStoreId: string) {
      try {
        const resp = await api({
          url: `inventory-cycle-count/productStores/${productStoreId}/settings`,
          method: 'GET'
        })
        if (!hasError(resp) && resp?.data.length) {
          const settings = resp.data.reduce((acc: any, setting: any) => {
            const keyMap: Record<string, string> = {
              INV_CNT_VIEW_QOH: 'showQoh',
              INV_FORCE_SCAN: 'forceScan',
              INV_COUNT_FIRST_SCAN: 'isFirstScanCountEnabled',
              BARCODE_IDEN_PREF: 'barcodeIdentificationPref'
            }
            const key = keyMap[setting.settingTypeEnumId]
            if (key) {
              acc[key] = setting.settingTypeEnumId === 'BARCODE_IDEN_PREF'
                ? setting.settingValue
                : JSON.parse(setting.settingValue)
            }
            return acc
          }, this.settings)
          this.settings = settings
        }
      } catch (err) {
        logger.error('Failed to load product store settings', err)
      }
    },

    async setProductStoreSetting(key: string, value: any, productStoreId: string) {
      const keyToEnum: Record<string, string> = {
        showQoh: 'INV_CNT_VIEW_QOH',
        forceScan: 'INV_FORCE_SCAN',
        isFirstScanCountEnabled: 'INV_COUNT_FIRST_SCAN',
        barcodeIdentificationPref: 'BARCODE_IDEN_PREF'
      }
      const enumId = keyToEnum[key]
      if (!enumId) return

      try {
        const resp = await api({
          url: `inventory-cycle-count/productStores/${productStoreId}/settings`,
          method: 'POST',
          data: {
            productStoreId,
            settingTypeEnumId: enumId,
            settingValue: key === 'barcodeIdentificationPref'
              ? value
              : JSON.stringify(value)
          }
        })
        if (!hasError(resp)) {
          this.settings[key] = value
          showToast(translate('Store preference updated successfully.'))
        } else {
          throw resp
        }
      } catch (err) {
        showToast(translate('Failed to update Store preference.'))
        logger.error(err)
      }
    },

    async fetchFieldMappings() {
      let fieldMappings: Record<string, any> = {}
      try {
        const mappingTypes = JSON.parse(process.env.VUE_APP_MAPPING_TYPES as string)
        const payload = {
          mappingPrefTypeEnumId: Object.values(mappingTypes),
          mappingPrefTypeEnumId_op: 'in',
          pageSize: 100
        }
        const mappingTypesFlip = Object.keys(mappingTypes).reduce((acc: any, key) => {
          fieldMappings[key] = {}
          acc[mappingTypes[key]] = key
          return acc
        }, {})

        const resp = await api({
          url: 'inventory-cycle-count/dataManagerMappings',
          method: 'GET',
          params: payload
        })
        if (!hasError(resp) && Array.isArray(resp?.data)) {
          fieldMappings = resp?.data?.reduce((acc: any, mapping: any) => {
            const mappingType = mappingTypesFlip[mapping.mappingPrefTypeEnumId]
            if (!mappingType) return acc // <-- skip missing type safely

            if (!acc[mappingType]) acc[mappingType] = {}

            let parsedValue = {}
            try {
              parsedValue =
                typeof mapping.mappingPrefValue === 'string' && mapping.mappingPrefValue.trim()
                  ? JSON.parse(mapping.mappingPrefValue)
                  : {}
            } catch {
              parsedValue = {}
            }

            acc[mappingType][mapping.mappingPrefId] = {
              name: mapping.mappingPrefName,
              value: parsedValue
            }

            return acc
          }, fieldMappings)
        }
        this.fieldMappings = fieldMappings
      } catch (err) {
        logger.error('Failed to load field mappings', err)
      }
    },

    async createFieldMapping(payload: any) {
      try {
        const mappingTypes = JSON.parse(process.env.VUE_APP_MAPPING_TYPES as string)
        const mappingPrefTypeEnumId = mappingTypes[payload.mappingType]
        const resp = await api({
          url: 'inventory-cycle-count/dataManagerMappings',
          method: 'POST',
          data: {
            mappingPrefName: payload.name,
            mappingPrefValue: JSON.stringify(payload.value),
            mappingPrefTypeEnumId
          }
        })
        if (!hasError(resp)) {
          const id = resp?.data.mappingPrefId
          if (!this.fieldMappings[payload.mappingType])
            this.fieldMappings[payload.mappingType] = {}
          this.fieldMappings[payload.mappingType][id] = {
            name: payload.name,
            value: payload.value
          }
          showToast(translate('This CSV mapping has been saved.'))
        }
      } catch (err) {
        showToast(translate('Failed to save CSV mapping.'))
        logger.error(err)
      }
    },

    async deleteFieldMapping(mappingType: string, id: string) {
      try {
        const resp = await api({
          url: `inventory-cycle-count/dataManagerMappings/${id}`,
          method: 'DELETE'
        })
        if (!hasError(resp)) {
          delete this.fieldMappings[mappingType][id]
          showToast(translate('This CSV mapping has been deleted.'))
        }
      } catch (err) {
        showToast(translate('Failed to delete CSV mapping.'))
        logger.error(err)
      }
    },

    setCurrentMapping(mappingType: string, id: string) {
      const mapping = this.fieldMappings[mappingType]?.[id]
      if (mapping) {
        this.currentMapping = {
          id,
          mappingType,
          ...mapping
        }
      }
    },

    clearCurrentMapping() {
      this.currentMapping = {
        id: '',
        mappingType: '',
        name: '',
        value: {}
      }
    },

    async login(token: string, omsBaseUrl: string): Promise<string> {
      const baseURL = omsBaseUrl.startsWith('http')
        ? omsBaseUrl.includes('/rest/s1')
          ? omsBaseUrl
          : `${omsBaseUrl}/rest/s1/`
        : `https://${omsBaseUrl}.hotwax.io/rest/s1/`

      try {
        const resp = await client({
          url: 'admin/login',
          method: 'POST',
          baseURL,
          params: { token },
          headers: { 'Content-Type': 'application/json' }
        })
        if (!hasError(resp) && (resp.data.api_key || resp.data.token)) {
          return resp.data.api_key || resp.data.token
        } else {
          throw 'Sorry, login failed. Please try again'
        }
      } catch (err) {
        logger.error('loginUser failed', err)
        throw new Error('Sorry, login failed. Please try again')
      }
    },

    /**
     * Get user profile with api_key
     */
    async fetchUserProfile(api_key: string, omsBaseUrl: string): Promise<any> {
      const baseURL = omsBaseUrl.startsWith('http')
        ? omsBaseUrl.includes('/rest/s1')
          ? omsBaseUrl
          : `${omsBaseUrl}/rest/s1/`
        : `https://${omsBaseUrl}.hotwax.io/rest/s1/`

      try {
        const resp = await client({
          url: 'admin/user/profile',
          method: 'GET',
          baseURL,
          headers: {
            api_key,
            'Content-Type': 'application/json'
          }
        })
        if (hasError(resp)) throw 'Error getting user profile'
        this.current = resp.data
        return resp.data
      } catch (error) {
        logger.error('getUserProfile failed', error)
        throw error
      }
    },

    /**
     * Get user-level permissions
     */
    async loadUserPermissions(payload: any, url: string, token: string): Promise<string[]> {
      const baseURL = url.startsWith('http')
        ? url.includes('/api')
          ? url
          : `${url}/api/`
        : `https://${url}.hotwax.io/api/`

      const viewSize = 200
      let serverPermissions: string[] = []

      if (!payload.permissionIds?.length) return []

      try {
        const params = {
          viewIndex: 0,
          viewSize,
          permissionIds: payload.permissionIds
        }

        const resp = await client({
          url: 'getPermissions',
          method: 'POST',
          baseURL,
          data: params,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (resp.status === 200 && resp.data.docs?.length && !hasError(resp)) {
          serverPermissions = resp.data.docs.map((p: any) => p.permissionId)

          const total = resp.data.count
          const remaining = total - serverPermissions.length

          if (remaining > 0) {
            const apiCallsNeeded =
              Math.floor(remaining / viewSize) + (remaining % viewSize !== 0 ? 1 : 0)
            const responses = await Promise.all(
              [...Array(apiCallsNeeded).keys()].map(async (i) =>
                client({
                  url: 'getPermissions',
                  method: 'POST',
                  baseURL,
                  data: {
                    viewIndex: i + 1,
                    viewSize,
                    permissionIds: payload.permissionIds
                  },
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  }
                })
              )
            )
            for (const response of responses) {
              if (!hasError(response) && response.data.docs) {
                serverPermissions.push(
                  ...response.data.docs.map((p: any) => p.permissionId)
                )
              }
            }
          }
        }

        this.permissions = serverPermissions
        return serverPermissions
      } catch (err) {
        logger.error('loadUserPermissions failed', err)
        throw err
      }
    }
  }
})