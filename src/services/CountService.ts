import { api } from '@/adapter';

const getAssignedWorkEfforts = async (params: any): Promise <any> => {
  return api({
    url: "inventory-cycle-count/cycleCounts/workEfforts",
    method: "get",
    params
  });
}
const getWorkEfforts = async (params: any): Promise <any> => {
  return api({
    url: "inventory-cycle-count/cycleCounts/workEfforts",
    method: "get",
    params
  });
}

const getInventoryCountImportsByWorkEffort = async (params: any): Promise <any> => {
  return api({
    url: `inventory-cycle-count/cycleCounts/workEfforts/${params.workEffortId}/sessions`,
    method: "get",
  });
}

const addSessionInCount = async (payload: any): Promise<any> => {
  return api({
    url: `inventory-cycle-count/cycleCounts/workEfforts/${payload.workEffortId}/sessions`,
    method: "post",
    data: payload
  }
  );
}

const getInventoryCountImportSession = async (params: { inventoryCountImportId: string; }): Promise<any> => {
  return await api({
    url: `inventory-cycle-count/cycleCounts/inventoryCountSession/${params.inventoryCountImportId}`,
    method: 'get',
    params
  });
}

const bulkUploadInventoryCounts = async (payload: any): Promise <any>  => {
  return api({
    url: `inventory-cycle-count/cycleCounts/upload`,
    method: "post",
    ...payload
  });
}

const fetchCycleCountImportSystemMessages = async (payload: any): Promise <any>  => {
  return api({
    url: `inventory-cycle-count/cycleCounts/systemMessages`,
    method: "get",
    params: payload
  });
}

const cancelCycleCountFileProcessing = async (payload: any): Promise <any>  => {
  return api({
    url: `inventory-cycle-count/cycleCounts/systemMessages/${payload.systemMessageId}`,
    method: "post",
    data: payload
  });
}

const fetchCycleCountUploadedFileData = async (payload: any): Promise <any> => {
  return api({
    url: `inventory-cycle-count/cycleCounts/systemMessages/${payload.systemMessageId}/downloadFile`,
    method: "get",
    data: payload
  });
}

export const CountService = {
  cancelCycleCountFileProcessing,
  getAssignedWorkEfforts,
  getInventoryCountImportsByWorkEffort,
  getInventoryCountImportSession,
  bulkUploadInventoryCounts,
  fetchCycleCountImportSystemMessages,
  fetchCycleCountUploadedFileData,
  addSessionInCount,
  getWorkEfforts
}