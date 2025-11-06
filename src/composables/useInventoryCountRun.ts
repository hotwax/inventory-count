import api from '@/api';

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

/**
 * Composable for work-effort (cycle count run) level operations
 */
export function useInventoryCountRun() {

  return {
    getWorkEfforts,
    getWorkEffort,
    getProductReviewDetail,
    getCycleCount,
    getSessions,
    updateWorkEffort,
    createSessionOnServer,
    getCycleCountImportSystemMessages,
    cancelCycleCountFileProcessing,
    getCycleCountUploadedFileData,
    getCycleCountImportErrors,
    submitProductReview
  };
}