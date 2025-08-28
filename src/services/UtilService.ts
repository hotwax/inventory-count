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
    url: "facilities",
    method: "GET",
    params: payload
  })
}

const createBulkCycleCounts = async (payload: any): Promise<any> => {
  return api({
    url: "cycleCounts/bulk",
    method: "POST",
    data: payload
  })
}

const fetchFacilityGroups = async (payload: any): Promise<any> => {
  const token = store.getters["user/getUserToken"]
  const url = store.getters["user/getBaseUrl"]
  const baseURL = url.startsWith('http') ? url.includes('/rest/s1/inventory-cycle-count') ? url.replace("inventory-cycle-count", "admin") : `${url}/rest/s1/admin/` : `https://${url}.hotwax.io/rest/s1/admin/`;

  return client({
    url: "facilityGroups",
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
  const url = store.getters["user/getBaseUrl"]
  
  const baseURL = url.startsWith('http') ? url.includes('/rest/s1/inventory-cycle-count') ? url.replace("inventory-cycle-count", "admin") : `${url}/rest/s1/admin/` : `https://${url}.hotwax.io/rest/s1/admin/`;

  return client({
    url: `facilityGroups/${payload.facilityGroupId}/facilities`,
    baseURL,
    method: "GET",
    params: payload,
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
  getOrdinalSuffix
}