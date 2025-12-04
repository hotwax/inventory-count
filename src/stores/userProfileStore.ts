import { defineStore } from 'pinia'
import api, { client } from '@/services/remoteAPI';
import { hasError } from '@/stores/authStore'
import { showToast } from '@/services/uiUtils';
import logger from '@/logger'
import i18n, { translate } from '@/i18n'
import { prepareAppPermissions } from '@/authorization';
import { getAvailableTimeZones, setUserTimeZone } from '@/adapter';
import { DateTime, Settings } from 'luxon';

export const useUserProfile = defineStore('userProfile', {
  state: () => ({
    current: null as any,
    permissions: [] as any,
    fieldMappings: {} as Record<string, any>,
    currentMapping: {
      id: '',
      mappingType: '',
      name: '',
      value: {}
    },
    localeOptions: process.env.VUE_APP_LOCALES ? JSON.parse(process.env.VUE_APP_LOCALES) : { "en-US": "English" },
    locale: 'en-US',
    currentTimeZoneId: '',
    timeZones: [],
    deviceId: '',
  }),

  persist: true,

  getters: {
    getLocale: (state) => state.locale,
    getLocaleOptions: (state) => state.localeOptions,
    getTimeZones: (state) => state.timeZones,
    getCurrentTimeZone: (state) => state.currentTimeZoneId,
    getUserProfile: (state) => state.current,
    getUserPermissions: (state) => state.permissions,
    getFieldMappings: (state) => (type?: string) =>
      type ? state.fieldMappings[type] || {} : state.fieldMappings,
    getDeviceId: (state) => state.deviceId,
  },

  actions: {
    async setLocale(locale: string) {
      let newLocale, matchingLocale
      newLocale = this.locale
      // handling if locale is not coming from userProfile
      try {
        // const appState = appContext.config.globalProperties.$store;
        if (locale) {
          matchingLocale = Object.keys(this.localeOptions).find((option: string) => option === locale)
          // If exact locale is not found, try to match the first two characters i.e primary code
          matchingLocale = matchingLocale || Object.keys(this.localeOptions).find((option: string) => option.slice(0, 2) === locale.slice(0, 2))
          newLocale = matchingLocale || this.locale
          // update locale in state and globally
        //   if(userContext.setUserLocale) await userContext.setUserLocale({ userId: userProfile.userId, newLocale })
        }
      } catch (error) {
        console.error(error)
      } finally {
        i18n.global.locale = newLocale
        this.locale = newLocale
      }
    },
    async setDxpUserTimeZone(tzId: string) {
      // Do not make any api call if the user clicks the same timeZone again that is already selected
      if(this.currentTimeZoneId === tzId) {
        return;
      }

      try {
        // const appState = appContext.config.globalProperties.$store;
        const userProfile = useUserProfile().getUserProfile;

        const resp = await setUserTimeZone({ userId: userProfile.userId, timeZone: tzId })

        if (resp?.status === 200) {
          this.current.timeZone = tzId;
          this.currentTimeZoneId = tzId
          Settings.defaultZone = tzId;
        } else {
          throw resp;
        }
        showToast(translate("Time zone updated successfully"));
        return Promise.resolve(tzId)
      } catch(err) {
        console.error('Error', err)
        showToast(translate("Failed to update time zone"));
        return Promise.reject('')
      }
    },
    async getDxpAvailableTimeZones() {
      // Do not fetch timeZones information, if already available
      if(this.timeZones.length) {
        return;
      }

      try {
        // const resp = await userContext.getAvailableTimeZones()
        const resp = await getAvailableTimeZones();
        this.timeZones = resp.filter((timeZone: any) => DateTime.local().setZone(timeZone.id).isValid);
      } catch(err) {
        console.error('Error', err)
      }
    },
    updateTimeZone(tzId: string) {
      this.currentTimeZoneId = tzId
    },
    getPermissions() {
      return this.permissions;
    },
    /** Initialize after login */
    async setUserProfile(profile: any) {
      this.current = profile
    },

    setDeviceId(deviceId: string) {
      this.deviceId = deviceId
    },

    async loadFieldMappings() {
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
     * Get user profile with token as Maarg now supports token based auth
     */
    async getProfile(token: string, omsBaseUrl: string): Promise<any> {
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
            'Authorization': `Bearer ${token}`,
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
    async loadUserPermissions(payload: any, url: string, token: string): Promise<any[]> {
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
          serverPermissions = resp.data.docs.map((permission: any) => permission.permissionId)

          const total = resp.data.count
          const remaining = total - serverPermissions.length

          if (remaining > 0) {
            const apiCallsNeeded =
              Math.floor(remaining / viewSize) + (remaining % viewSize !== 0 ? 1 : 0)
            const responses = await Promise.all(
              [...Array(apiCallsNeeded).keys()].map(async (viewIndex) =>
                client({
                  url: 'getPermissions',
                  method: 'POST',
                  baseURL,
                  data: {
                    viewIndex: viewIndex + 1,
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
                  ...response.data.docs.map((permission: any) => permission.permissionId)
                )
              }
            }
          }
        }

        const appPermissions = prepareAppPermissions(serverPermissions)

        this.permissions = appPermissions

        // Return the normalized list for use in login() and setPermissions()
        return serverPermissions
      } catch (err) {
        logger.error('loadUserPermissions failed', err)
        throw err
      }
    }
  }
})