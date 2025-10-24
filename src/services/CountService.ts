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

export const CountService = {
  getAssignedWorkEfforts,
  getInventoryCountImportsByWorkEffort,
  addSessionInCount
}