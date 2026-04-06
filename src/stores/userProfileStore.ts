import { defineStore } from 'pinia'
import { api, client, commonUtil } from '@common';
import { showToast } from '@/services/uiUtils';
import logger from '@/logger'
import { i18n, translate } from '@common'
import { prepareAppPermissions } from '@/authorization';
import { DateTime, Settings } from 'luxon';

export const useUserProfile = defineStore('userProfile', {
  state: () => ({
    current: null as any,
    permissions: [] as any,
    localeOptions: import.meta.env.VITE_LOCALES ? JSON.parse(import.meta.env.VITE_LOCALES) : { "en-US": "English" },
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

        const resp = await api({
          url: "admin/user/profile",
          method: "POST",
          data: { userId: userProfile.userId, timeZone: tzId },
        }) as any;

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
        const resp: any = await api({
          url: "admin/user/getAvailableTimeZones",
          method: "get",
          cache: true
        });
        
        const timeZoneList = resp.data?.timeZones || [];
        this.timeZones = timeZoneList.filter((timeZone: any) => DateTime.local().setZone(timeZone.id).isValid);
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
        if (!commonUtil.hasError(resp) && (resp.data.api_key || resp.data.token)) {
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
        if (commonUtil.hasError(resp)) throw 'Error getting user profile'
        this.current = resp.data
        this.currentTimeZoneId = this.current.timeZone
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

        if (resp.status === 200 && resp.data.docs?.length && !commonUtil.hasError(resp)) {
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
              if (!commonUtil.hasError(response) && response.data.docs) {
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

    async getUserPreference(payload: { token?: string, baseURL?: string, preferenceKey: string, userId: string }) {
      try {
        let params: any = {
          url: "admin/user/preferences",
          method: "GET",
          params: {
            pageSize: 1,
            userId: payload.userId,
            preferenceKey: payload.preferenceKey
          }
        }

        let resp = {} as any;
        if(payload.token && payload.baseURL) {
          params = {
            ...params,
            baseURL: payload.baseURL,
            headers: {
              "Authorization": `Bearer ${payload.token}`,
              "Content-Type": "application/json"
            }
          }
          resp = await client(params);
        } else {
          resp = await api(params);
        }

        const preferenceValue = resp.data[0]?.preferenceValue ? resp.data[0]?.preferenceValue : "";
        let parsedValue;
        try {
          parsedValue = JSON.parse(preferenceValue);
        } catch (e) {
          parsedValue = preferenceValue;
        }
        return Promise.resolve(parsedValue?.toString() || "");
      } catch(error) {
        return Promise.reject({
          code: "error",
          message: "Failed to get user preference",
          serverResponse: error
        })
      }
    },

    async setUserPreference(payload: { userId: string, userPrefTypeId: string, userPrefValue: any }) {
      try {
        const resp = await api({
          url: "admin/user/preferences",
          method: "PUT",
          data: {
            userId: payload.userId,
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
    }
  }
})
