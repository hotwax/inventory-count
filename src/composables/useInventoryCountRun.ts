import { ref } from 'vue';
import api from '@/services/RemoteAPI';
import { hasError } from '@hotwax/oms-api';
import { DateTime } from 'luxon';
import logger from '@/logger';

const statuses = ref<any[]>([])
let statusesLoaded = false

async function loadStatusDescription() {
  if (statusesLoaded && statuses.value.length) return statuses.value
  try {
    const resp = await getCycleCountStatusDesc()
    if (resp?.status === 200 && resp.data?.length) {
      statuses.value = resp.data
      statusesLoaded = true
    } else {
      logger.warn('No statuses found or response invalid:', resp)
      statuses.value = []
    }
  } catch (error) {
    logger.error('Failed to fetch cycle count status descriptions', error)
    statuses.value = []
  }
  return statuses.value
}

function getStatusDescription(statusId: string): string {
  const found = statuses.value.find((s: any) => s.statusId === statusId)
  return found?.description || statusId
}

/** Get all work efforts */
const getWorkEfforts = async (params: any): Promise<any> => {
  return api({
    url: "inventory-cycle-count/cycleCounts/workEfforts",
    method: "get",
    params
  });
};

/** Get specific work effort detail */
const getWorkEffort = async (payload: any): Promise<any> => {
  return api({
    url: `inventory-cycle-count/cycleCounts/workEfforts/${payload.workEffortId}`,
    method: "get"
  });
};

/** Get cycle count review details for work effort */
const getProductReviewDetail = async (payload: any): Promise<any> => {
  return api({
    url: `inventory-cycle-count/cycleCounts/workEfforts/${payload.workEffortId}/reviews`,
    method: "get",
    params: payload
  });
};

/** Get cycle count review summary */
const getCycleCount = async (payload: any): Promise<any> => {
  return api({
    url: `inventory-cycle-count/cycleCounts/workEfforts/${payload.workEffortId}/reviews`,
    method: "get",
    params: payload
  });
};

/** Get sessions under a work effort */
const getSessions = async (payload: any): Promise<any> => {
  return api({
    url: `inventory-cycle-count/cycleCounts/workEfforts/${payload.workEffortId}/counts`,
    method: "get",
    params: payload
  });
};

/** Update a work effort */
const updateWorkEffort = async (payload: any): Promise<any> => {
  return api({
    url: `inventory-cycle-count/cycleCounts/workEfforts/${payload.workEffortId}`,
    method: "put",
    data: payload
  });
};

/** Create a session under a work effort */
const createSessionOnServer = async (payload: any): Promise<any> => {
  return api({
    url: `inventory-cycle-count/cycleCounts/workEfforts/${payload.workEffortId}/sessions`,
    method: "post",
    data: payload
  });
};

/** System message–level operations (imports, errors, uploads) */
const getCycleCountImportSystemMessages = async (payload: any): Promise<any> => {
  return api({
    url: `inventory-cycle-count/cycleCounts/systemMessages`,
    method: "get",
    params: payload
  });
};

const cancelCycleCountFileProcessing = async (payload: any): Promise<any> => {
  return api({
    url: `inventory-cycle-count/cycleCounts/systemMessages/${payload.systemMessageId}`,
    method: "post",
    data: payload
  });
};

const getCycleCountUploadedFileData = async (payload: any): Promise<any> => {
  return api({
    url: `inventory-cycle-count/cycleCounts/systemMessages/${payload.systemMessageId}/downloadFile`,
    method: "get",
    params: payload
  });
};

const getCycleCountImportErrors = async (payload: any): Promise<any> => {
  return api({
    url: `inventory-cycle-count/cycleCounts/systemMessages/${payload.systemMessageId}/errors`,
    method: "get",
    data: payload
  });
};

const submitProductReview = async (payload: any): Promise<any> => {
  return api({
    url: `inventory-cycle-count/cycleCounts/submit`,
    method: "post",
    data: payload
  })
}

const getCycleCountStatusDesc = async (): Promise<any> => {
  return api({
    url: "oms/statuses",
    method: "GET",
    params: {
      statusTypeId: "CYCLE_CNT_STATUS"
    }
  })
}

/**
 * Composable for work-effort (cycle count run) level operations
 */
export function useInventoryCountRun() {

  async function getCreatedAndAssignedWorkEfforts(params: any) {
    let workEfforts: any[] = [];
    let total = 0;
    let isScrollable = true;

    try {
      const resp = await api({
        url: 'inventory-cycle-count/cycleCounts/workEfforts',
        method: 'get',
        params: {
          pageSize: params.pageSize || process.env.VUE_APP_VIEW_SIZE,
          pageIndex: params.pageIndex || 0,
          facilityId: params.facilityId,
          currentStatusId: params.currentStatusId,
          currentStatusId_op: params.currentStatusId_op
        }
      });

      if (!hasError(resp) && resp?.data?.cycleCounts?.length > 0) {
        const fetched = resp?.data.cycleCounts;
        const totalCount = resp?.data.cycleCountsCount || 0;

        workEfforts = fetched.map((we: any) => ({
          ...we,
          sessions: we.sessions || []
        }));

        total = totalCount;
        isScrollable = workEfforts.length < totalCount;
      } else {
        isScrollable = params.pageIndex > 0 ? false : true;
        workEfforts = [];
        throw resp?.data;
      }
    } catch (err) {
      logger.error('Error fetching work efforts:', err);
      isScrollable = false;
    }

    return { workEfforts, total, isScrollable };
  }

  /** Fetch cycle count import system messages (24h window) */
  async function getCycleCntImportSystemMessages() {
    try {
      const twentyFourHoursEarlier = DateTime.now().minus({ hours: 24 });
      const resp = await api({
        url: 'inventory-cycle-count/cycleCounts/systemMessages',
        method: 'get',
        params: {
          systemMessageTypeId: 'ImportInventoryCounts',
          initDate_from: twentyFourHoursEarlier.toMillis(),
          orderByField: 'initDate desc, processedDate desc',
          pageSize: 100
        }
      });

      if (!hasError(resp)) return resp?.data;
      throw resp?.data;
    } catch (err) {
      logger.error('Error fetching system messages:', err);
      return [];
    }
  }

  /** Fetch generic cycle counts list */
  async function getCycleCounts(params: any) {
    let cycleCounts: any[] = [];
    let total = 0;
    let isScrollable = true;

    try {
      const resp = await api({
        url: 'inventory-cycle-count/cycleCounts/workEfforts',
        method: 'get',
        params
      });

      if (!hasError(resp) && resp?.data?.cycleCounts?.length > 0) {
        cycleCounts = resp?.data.cycleCounts;
        total = resp?.data.cycleCountsCount || 0;
        isScrollable = cycleCounts.length < total;
      } else {
        isScrollable = params.pageIndex > 0 ? false : true;
        cycleCounts = [];
        throw resp?.data;
      }
    } catch (err) {
      logger.error('Error fetching cycle counts:', err);
      isScrollable = false;
    }

    return { cycleCounts, total, isScrollable };
  }

  async function getAssignedCycleCounts(params: any): Promise<{ data: any[]; total: number }> {
    try {
      const resp = await api({
        url: 'inventory-cycle-count/cycleCounts/workEfforts',
        method: 'get',
        params: {
          pageSize: params.pageSize || Number(process.env.VUE_APP_VIEW_SIZE) || 20,
          pageIndex: params.pageIndex || 0,
          currentStatusId: params.currentStatusId || 'CYCLE_CNT_CREATED,CYCLE_CNT_IN_PRGS',
          currentStatusId_op: params.currentStatusId_op || 'in'
        }
      })

      if (!hasError(resp) && resp?.data?.cycleCounts?.length > 0) {
        return {
          data: resp?.data.cycleCounts,
          total: resp?.data.cycleCountsCount || 0
        }
      } else {
        return { data: [], total: 0 }
      }
    } catch (err) {
      logger.error('Error fetching cycle counts:', err)
      return { data: [], total: 0 }
    }
  }

  /** Clear list utility */
  function clearCycleCountList() {
    return { cycleCounts: [], total: 0, isScrollable: false };
  }

  return {
    getWorkEfforts,
    getWorkEffort,
    getProductReviewDetail,
    getCycleCount,
    getCycleCountStatusDesc,
    getSessions,
    updateWorkEffort,
    createSessionOnServer,
    getCycleCountImportSystemMessages,
    cancelCycleCountFileProcessing,
    getCycleCountUploadedFileData,
    getCycleCountImportErrors,
    submitProductReview,
    getCreatedAndAssignedWorkEfforts,
    getCycleCntImportSystemMessages,
    getAssignedCycleCounts,
    getCycleCounts,
    clearCycleCountList,
    loadStatusDescription,
    getStatusDescription
  };
}