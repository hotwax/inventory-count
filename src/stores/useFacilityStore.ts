import { defineStore } from 'pinia'
import api from '@/services/RemoteAPI';
import { hasError } from '@/utils'
import logger from '@/logger'

export const useFacilityStore = defineStore('facilityStore', {
  state: () => ({
    facilities: [] as any[],
    current: null as any
  }),

  persist: true,

  actions: {
    async loadUserFacilities(partyId: string) {
      try {
        const resp = await api({
          url: `inventory-cycle-count/users/${partyId}/facilities`,
          method: 'GET'
        })
        if (!hasError(resp)) this.facilities = resp?.data
      } catch (err) {
        logger.error('Failed to load facilities', err)
      }
    },

    setCurrent(facility: any) {
      this.current = facility
    }
  }
})