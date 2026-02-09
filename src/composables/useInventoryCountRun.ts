import { api } from '@common';
import { hasError } from '@common';
import { DateTime } from 'luxon';
import logger from '@/logger';
import { useProductStore } from '@/stores/productStore';

async function loadStatusDescription() {
    // Skip reload if already present
    if (useProductStore().statusDesc?.length) {
      return useProductStore().statusDesc;
    }

  try {
    const resp = await getCycleCountStatusDesc()
    if (resp?.status === 200 && resp.data?.length) {
      useProductStore().setStatusDescriptions(resp.data);
    } else {
      logger.warn('No statuses found or response invalid:', resp)
      useProductStore().setStatusDescriptions([]);
    }
  } catch (error) {
    logger.error('Failed to fetch cycle count status descriptions', error)
    useProductStore().setStatusDescriptions([]);
  }
  return useProductStore().statusDesc;
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

const getProductReviewDetailCount = async (payload: any): Promise<any> => {
  return api({
    url: `inventory-cycle-count/cycleCounts/workEfforts/${payload.workEffortId}/reviews/count`,
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
const getSessionsCount = async (payload: any): Promise<any> => {
  return api({
    url: `inventory-cycle-count/cycleCounts/workEfforts/${payload.workEffortId}/count`,
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

const queueCycleCountsFileExport = async (payload: any): Promise<any> => {
  return api({
    url: `inventory-cycle-count/cycleCounts/export`,
    method: "post",
    data: payload
  });
}

const getExportedCycleCountsSystemMessages = async (payload: any): Promise<any> => {
  return api({
    url: `inventory-cycle-count/cycleCounts/systemMessages`,
    method: "get",
    params: payload
  });
};

const getExportedCycleCountsFileData = async (payload: any): Promise<any> => {
  return api({
    url: `inventory-cycle-count/cycleCounts/export/${payload.systemMessageId}`,
    method: "get",
    params: payload
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
      statusTypeId: "CYCLE_CNT_STATUS",
      pageSize: 20
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
          pageSize: params.pageSize || import.meta.env.VITE_VIEW_SIZE,
          pageIndex: params.pageIndex || 0,
          facilityId: params.facilityId,
          statusId: params.statusId,
          statusId_op: params.statusId_op
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
          pageSize: params.pageSize || Number(import.meta.env.VITE_VIEW_SIZE) || 20,
          pageIndex: params.pageIndex || 0,
          statusId: params.statusId || 'CYCLE_CNT_CREATED,CYCLE_CNT_IN_PRGS',
          statusId_op: params.statusId_op || 'in',
          ...(params.keyword ? { keyword: params.keyword} : {}),
          ...(params.countType ? { countType: params.countType }: {}),
          ...(params.facilityId ? { facilityId: params.facilityId } : {}),
          ...(params.facilityId_op ? { facilityId_op: params.facilityId_op } : {})
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

  async function getCycleCountSessions (params: any): Promise<any> {
    const resp = await api({
      url: `inventory-cycle-count/cycleCounts/workEfforts/${params.workEffortId}/sessions`,
      method: 'get',
      params
    });
    return resp;
  }

  async function getDiagnostics (): Promise<any> {
    const resp = await api({
      url: `inventory-cycle-count/diagnostics`,
      method: 'get'
    });
    return resp;
  }
  /** Clear list utility */
  function clearCycleCountList() {
    return { cycleCounts: [], total: 0, isScrollable: false };
  }

  return {
    getDiagnostics,
    getWorkEfforts,
    getWorkEffort,
    getProductReviewDetail,
    getProductReviewDetailCount,
    getCycleCount,
    getCycleCountStatusDesc,
    getSessionsCount,
    updateWorkEffort,
    createSessionOnServer,
    getCycleCountImportSystemMessages,
    cancelCycleCountFileProcessing,
    getCycleCountUploadedFileData,
    getCycleCountImportErrors,
    getExportedCycleCountsFileData,
    getExportedCycleCountsSystemMessages,
    submitProductReview,
    getCreatedAndAssignedWorkEfforts,
    getCycleCntImportSystemMessages,
    getAssignedCycleCounts,
    getCycleCounts,
    clearCycleCountList,
    loadStatusDescription,
    queueCycleCountsFileExport,
    getCycleCountSessions,
  };
}