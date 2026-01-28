import { defineStore } from 'pinia'
import api, { client } from '@/services/RemoteAPI';
import { hasError } from '@/stores/authStore'
import { showToast } from '@/services/uiUtils';
import logger from '@/logger'
import i18n, { translate } from '@/i18n'
import { prepareAppPermissions } from '@/authorization';
import { DateTime, Settings } from 'luxon';
import { jsonParse } from '@/services/utils';

export const useUserProfile = defineStore('userProfile', {
  state: () => ({
    current: null as any,
    permissions: [] as any,
    localeOptions: process.env.VUE_APP_LOCALES ? JSON.parse(process.env.VUE_APP_LOCALES) : { "en-US": "English" },
    locale: 'en-US',
    currentTimeZoneId: '',
    timeZones: [],
    deviceId: '',
    uiFilters: {
      assigned: {
        status: '',
        countType: '',
        facilityIds: [] as string[]
      },
      pendingReview: {
        countType: '',
        facilityIds: [] as string[]
      },
      closed: {
        countType: '',
        facilityIds: [],
        createdFrom: '',
        createdTo: '',
        closedFrom: '',
        closedTo: ''
      },

      /** Detail page filters (SmartFilterSortBar) */
      reviewDetail: {
        status: 'all',
        compliance: 'all',
        sort: 'alphabetic',
        threshold: { unit: 'units', value: 2 }
      }
    } as any
  }),

  persist: true,

  getters: {
    getLocale: (state) => state.locale,
    getLocaleOptions: (state) => state.localeOptions,
    getTimeZones: (state) => state.timeZones,
    getCurrentTimeZone: (state) => state.currentTimeZoneId,
    getUserProfile: (state) => state.current,
    getUserPermissions: (state) => state.permissions,
    getDeviceId: (state) => state.deviceId,
    getListPageFilters: (state) => (segment: string) => {
      return state.uiFilters[segment] || {}
    },
    getDetailPageFilters: (state) => state.uiFilters.reviewDetail
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

        const resp = await this.setUserTimeZone({ userId: userProfile.userId, timeZone: tzId })

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
        const resp = await this.getAvailableTimeZones();
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
    async getProfile(): Promise<any> {
      try {
        const resp = await api({
          url: 'admin/user/profile',
          method: 'GET'
        })

        if (!resp) {
          throw 'Error getting user profile'
        }

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
    },

    updateUiFilter(page: string, key: string, value: any) {
      if (!this.uiFilters[page]) this.uiFilters[page] = {}
      this.uiFilters[page][key] = value
    },

    /** For SmartFilterSortBar threshold updates */
    updateThreshold(newConfig: any) {
      this.uiFilters.reviewDetail.threshold = newConfig
    },

    async updateUserPreference(payload: any) {
      try {
        await this.setUserPreference(payload);

        // This is to get update the current user profile in the state.
        await this.getProfile();
      } catch (error) {
        console.error("Error updating user profile: ", error);
      }
    },

    async setUserTimeZone(payload: any): Promise<any> {
      try {
        const resp = await api({
          url: "admin/user/profile",
          method: "POST",
          data: payload,
        }) as any;
        return Promise.resolve(resp);
      } catch (error: any) {
        return Promise.reject({
          code: "error",
          message: "Failed to set user time zone",
          serverResponse: error
        });
      }
    },

    async getAvailableTimeZones(): Promise <any> {
      try {
        const resp: any = await api({
          url: "admin/user/getAvailableTimeZones",
          method: "get",
          cache: true
        });
    
        return Promise.resolve(resp.data?.timeZones)
      } catch(error) {
        return Promise.reject({
          code: "error",
          message: "Failed to fetch available timezones",
          serverResponse: error
        })
      }
    },

    async getUserPreference(preferenceKey: string): Promise <any> {
      const params = {
        url: "admin/user/preferences",
        method: "GET",
        params: {
          pageSize: 1,
          userId: this.current.userId,
          preferenceKey
        }
      }

      let resp = {} as any;
      try {
        resp = await api(params);
        return Promise.resolve(resp.data[0]?.preferenceValue ? jsonParse(resp.data[0]?.preferenceValue).toString() : "")
      } catch(error) {
        return Promise.reject({
          code: "error",
          message: "Failed to get user preference",
          serverResponse: error
        })
      }
    },

    async setUserPreference(payload: any) {
      try {
        const resp = await api({
          url: "admin/user/preferences",
          method: "PUT",
          data: {
            userId: this.current.userId,
            preferenceKey: payload.userPrefTypeId,
            preferenceValue: payload.userPrefValue,
          },
        }) as any;
        return Promise.resolve(resp.data)
      } catch(error: any) {
        return Promise.reject({
          code: "error",
          message: "Failed to update user preference",
          serverResponse: error
        })
      }
    },

    
    async getSecurityGroupAndPermissions (payload: any) {
      const {
        dataDocumentId,
        filterByDate,
        fieldsToSelect,
        distinct,
        pageSize,
        ...customParametersMap
      } = payload || {};

      return await api({
        url: `oms/dataDocumentView`,
        method: 'POST',
        data: {
          dataDocumentId: dataDocumentId || 'SecurityGroupAndPermission',
          filterByDate: filterByDate != null ? filterByDate : true,
          fieldsToSelect: fieldsToSelect || '',
          distinct: distinct != null ? distinct : '',
          pageIndex: 0,
          pageSize: pageSize || 100,
          customParametersMap
        }
      });
    },

    async createSecurityGroupPermission (payload: {
      groupId: string;
      permissionId: string;
      fromDate: number;
    }) {
      return await api({
        url: `admin/permissions/${payload.permissionId}`,
        method: "POST",
        data: payload,
      });
    },

    async updateSecurityGroupPermission  (payload: {
      groupId: string;
      permissionId: string;
      fromDate?: number;
      thruDate: number;
    }) {
      return await api({
        url: `admin/permissions/${payload.permissionId}`,
        method: "PUT",
        data: payload,
      });
    }
  }
})
