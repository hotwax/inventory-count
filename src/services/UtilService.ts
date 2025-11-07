import api, {client} from '@/services/RemoteAPI';
import store from '@/store';

const getVarianceReasons = async (payload: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "get",
    params: payload,
    cache: true
  });
}

function getOrdinalSuffix(day: any) {
  if (day == 1 || day == 21 || day == 31) return 'st';
  if (day == 2 || day == 22) return 'nd';
  if (day == 3 || day == 23) return 'rd';
  return 'th';
}

const getFacilities = async (payload: any): Promise<any> => {
  return api({
    url: "inventory-cycle-count/facilities",
    method: "GET",
    params: payload
  })
}

const createBulkCycleCounts = async (payload: any): Promise<any> => {
  return api({
    url: "inventory-cycle-count/cycleCounts/bulk",
    method: "POST",
    data: payload
  })
}

const getFacilityGroups = async (payload: any): Promise<any> => {
  const token = store.getters["user/getUserToken"]
  const baseURL = store.getters["user/getBaseUrl"]

  return client({
    url: "available-to-promise/facilityGroups",
    baseURL,
    method: "GET",
    params: payload,
    headers: {
      "api_key": token,
      "Content-Type": "application/json"
    }
  })
}

const getGroupFacilities = async (payload: any): Promise<any> => {
  const token = store.getters["user/getUserToken"]
  const baseURL = store.getters["user/getBaseUrl"]
  
  return client({
    url: `available-to-promise/facilityGroups/${payload.facilityGroupId}/facilities`,
    baseURL,
    method: "GET",
    params: payload,
    headers: {
      "api_key": token,
      "Content-Type": "application/json"
    }
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

export const UtilService = {
  createBulkCycleCounts,
  getFacilities,
  getFacilityGroups,
  getGroupFacilities,
  getVarianceReasons,
  getOrdinalSuffix,
  getCycleCountStatusDesc
}