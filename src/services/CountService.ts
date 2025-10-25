import { api } from '@/adapter';
import emitter from '@/event-bus';
import { translate } from '@hotwax/dxp-components';
import store from '@/store';
import logger from '@/logger';
import { cogOutline } from 'ionicons/icons';
import { UtilService } from "@/services/UtilService";

const getAssignedWorkEfforts = async (params: any): Promise <any> => {
  return api({
    url: "inventory-cycle-count/cycleCounts/workEfforts",
    method: "get",
    params
  });
}
const getInventoryCountImportsByWorkEffort = async (params: any): Promise <any> => {
  return api({
    url: `inventory-cycle-count/cycleCounts/workEfforts/${params.workEffortId}/imports`,
    method: "get",
    params
  });
}
const getInventoryCountImportSession = async (params: { workEffortId: string; inventoryCountImportId: string; }): Promise<any> => {
  return await api({
    url: `inventory-cycle-count/cycleCounts/workEfforts/${params.workEffortId}/sessions/${params.inventoryCountImportId}`,
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

export const CountService = {
  getAssignedWorkEfforts,
  getInventoryCountImportsByWorkEffort,
  getInventoryCountImportSession,
  bulkUploadInventoryCounts,
  fetchCycleCountImportSystemMessages
}