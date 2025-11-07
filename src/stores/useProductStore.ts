import { defineStore } from 'pinia'
import api from '@/api'
import { hasError } from '@/utils'
import logger from '@/logger'

export const useProductStore = defineStore('productStore', {
  state: () => ({
    productStores: [] as any[],
    current: null as any
  }),

  persist: true,

  actions: {
    async loadStoresByFacility(facilityId: string) {
      try {
        const resp = await api({
          url: `inventory-cycle-count/facilities/${facilityId}/productStores`,
          method: 'GET'
        })
        if (!hasError(resp)) this.productStores = resp?.data
      } catch (err) {
        logger.error('Failed to load product stores', err)
      }
    },

    setCurrent(productStore: any) {
      this.current = productStore
    }
  }
})
