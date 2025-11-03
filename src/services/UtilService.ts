import api, {client} from '@/api';
import store from '@/store';

const fetchVarianceReasons = async (payload: any): Promise<any> => {
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

const fetchFacilities = async (payload: any): Promise<any> => {
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

const fetchFacilityGroups = async (payload: any): Promise<any> => {
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

const fetchGroupFacilities = async (payload: any): Promise<any> => {
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

const fetchCycleCountStatusDesc = async (): Promise<any> => {
  const token = store.getters["user/getUserToken"]
  const baseURL = store.getters["user/getBaseUrl"]
  console.log("This is base url and token: ", baseURL, " and ", token);
  return api({
    url: "oms/statuses",
    baseURL,
    method: "GET",
    params: {
      statusTypeId: "CYCLE_CNT_STATUS"
    },
    headers: {
      "api_key": token,
      "Content-Type": "application/json"
    }
  })
}

export const UtilService = {
  createBulkCycleCounts,
  fetchFacilities,
  fetchFacilityGroups,
  fetchGroupFacilities,
  fetchVarianceReasons,
  getOrdinalSuffix,
  fetchCycleCountStatusDesc
}