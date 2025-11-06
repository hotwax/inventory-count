import { defineStore } from 'pinia'
import { DateTime } from 'luxon'
import { useInventoryCountRun } from '@/composables/useInventoryCountRun'
import { hasError } from '@/utils'
import logger from '@/logger'

interface CountQuery {
  facilityIds: string[]
  noFacility: boolean
  queryString: string
  sortBy: string
  createdDate_from: string
  createdDate_thru: string
  closedDate_from: string
  closedDate_thru: string
}

interface CountState {
  assignedWorkEfforts: any[]
  draftWorkEfforts: any[]
  inReviewWorkEfforts: any[]
  closedWorkEfforts: any[]
  list: any[]
  total: number
  isScrollable: boolean
  query: CountQuery
  stats: any
  cycleCounts: { list: any[]; isScrollable: boolean }
  cycleCountItems: any
  cycleCountImportSystemMessages: any[]
  defaultRecountUpdateBehaviour: string
  cachedUnmatchProducts: any
  closedCycleCountsTotal: any
  isCountDetailPageActive: boolean
}

export const useCountStore = defineStore('count', {
  state: (): CountState => ({
    assignedWorkEfforts: [],
    draftWorkEfforts: [],
    inReviewWorkEfforts: [],
    closedWorkEfforts: [],
    list: [],
    total: 0,
    isScrollable: true,
    query: {
      facilityIds: [],
      noFacility: false,
      queryString: '',
      sortBy: 'dueDate asc',
      createdDate_from: '',
      createdDate_thru: '',
      closedDate_from: '',
      closedDate_thru: ''
    },
    stats: {},
    cycleCountImportSystemMessages: [],
    cycleCounts: {
      list: [],
      isScrollable: true
    },
    cycleCountItems: {},
    defaultRecountUpdateBehaviour: 'add',
    cachedUnmatchProducts: {},
    closedCycleCountsTotal: '',
    isCountDetailPageActive: false
  }),

  getters: {
    getAssignedWorkEfforts: (state: any) =>
      JSON.parse(JSON.stringify(state.assignedWorkEfforts || [])),
    getCycleCountsList: (state: any) =>
      JSON.parse(JSON.stringify(state.cycleCounts.list || [])),
    getIsCountDetailPageActive: (state: any) => state.isCountDetailPageActive,
    getCycleCountImportSystemMessages: (state: any) =>
      state.cycleCountImportSystemMessages,
    getDraftWorkEfforts: (state: any) =>
      JSON.parse(JSON.stringify(state.draftWorkEfforts || [])),
    getInReviewCounts: (state: any) =>
      JSON.parse(JSON.stringify(state.inReviewWorkEfforts || [])),
    getClosedCounts: (state: any) =>
      JSON.parse(JSON.stringify(state.closedWorkEfforts || [])),
    isScrollable: (state: any) => state.isScrollable,
    getList: (state: any) => JSON.parse(JSON.stringify(state.list || []))
  },

  actions: {
    /** Fetch created and assigned work efforts */
    async getCreatedAndAssignedWorkEfforts(this: CountState, params: any) {
      let assignedWorkEfforts =
        params.pageIndex > 0 && this.assignedWorkEfforts
          ? JSON.parse(JSON.stringify(this.assignedWorkEfforts))
          : []

      let total = 0
      let isScrollable = true

      if (this.query.facilityIds.length) {
        params['facilityId'] = this.query.facilityIds.join(',')
        params['facilityId_op'] = 'in'
      }

      try {
        const resp = await useInventoryCountRun().getWorkEfforts({
          pageSize: params.pageSize || process.env.VUE_APP_VIEW_SIZE,
          pageIndex: params.pageIndex || 0,
          facilityId: params.facilityId,
          currentStatusId: params.currentStatusId,
          currentStatusId_op: params.currentStatusId_op
        })

        if (!hasError(resp) && resp.data?.cycleCounts?.length > 0) {
          const workEfforts = resp.data.cycleCounts
          const totalCount = resp.data.cycleCountsCount || 0

          for (const workEffort of workEfforts) {
            assignedWorkEfforts.push({
              ...workEffort,
              sessions: workEffort.sessions || []
            })
          }

          total = totalCount
          isScrollable = assignedWorkEfforts.length < totalCount
        } else {
          if (params.pageIndex > 0) isScrollable = false
          else assignedWorkEfforts = []
          throw resp.data
        }
      } catch (err) {
        logger.error('Error fetching work efforts:', err)
        isScrollable = false
        if (params.pageIndex === 0) assignedWorkEfforts = []
      }

      this.assignedWorkEfforts = assignedWorkEfforts
      this.total = total
      this.isScrollable = isScrollable
    },

    /** Fetch system messages for cycle count import */
    async getCycleCntImportSystemMessages(this: CountState) {
      try {
        const twentyFourHoursEarlier = DateTime.now().minus({ hours: 24 })
        const resp = await useInventoryCountRun().getCycleCountImportSystemMessages({
          systemMessageTypeId: 'ImportInventoryCounts',
          initDate_from: twentyFourHoursEarlier.toMillis(),
          orderByField: 'initDate desc, processedDate desc',
          pageSize: 100
        })
        if (!hasError(resp)) {
          this.cycleCountImportSystemMessages = resp.data
        } else {
          throw resp.data
        }
      } catch (err: any) {
        logger.error(err)
      }
    },

    /** Toggle detail page active flag */
    setCountDetailPageActive(this: CountState, isPageActive: boolean) {
      this.isCountDetailPageActive = isPageActive
    },

    /** Fetch cycle counts list */
    async getCycleCounts(this: CountState, payload: any) {
      let counts =
        payload.pageIndex && payload.pageIndex > 0 && this.list
          ? JSON.parse(JSON.stringify(this.list))
          : []

      let total = 0
      let isScrollable = true

      const params = { ...payload }

      try {
        const resp = await useInventoryCountRun().getWorkEfforts(params)

        if (!hasError(resp) && resp.data?.cycleCounts?.length > 0) {
          const newCycleCounts = resp.data.cycleCounts

          if (payload.pageIndex && payload.pageIndex > 0) {
            counts = counts.concat(newCycleCounts)
          } else {
            counts = newCycleCounts
          }

          total = resp.data.cycleCountsCount || 0
          isScrollable = counts.length < total
        } else {
          if (payload.pageIndex > 0) isScrollable = false
          else counts = []
          throw resp.data
        }
      } catch (err) {
        isScrollable = false
        if (payload.pageIndex === 0) counts = []
        logger.error('Error fetching cycle counts:', err)
      }

      this.list = counts
      this.total = total
      this.isScrollable = isScrollable
    },

    /** Clear the cycle count list */
    clearCycleCountList(this: CountState) {
      this.list = []
      this.total = 0
    }
  }
})