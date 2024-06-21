import { api } from '@/adapter';

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

export const UtilService = {
  fetchVarianceReasons,
  getOrdinalSuffix
}