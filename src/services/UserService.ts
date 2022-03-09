import api from '@/api'

const login = async (username: string, password: string): Promise <any> => {
  return api({
    url: "login", 
    method: "post",
    data: {
      'USERNAME': username, 
      'PASSWORD': password
    }
  });
}

const getProfile = async (): Promise <any>  => {
    return api({
      url: "user-profile", 
      method: "get",
    });
}
const getAvailableTimeZones = async (): Promise <any>  => {
  return api({
    url: "getAvailableTimeZones",
    method: "get",
    cache: true
  });
}
const setUserTimeZone = async (payload: any): Promise <any>  => {
  return api({
    url: "setUserTimeZone",
    method: "post",
    data: payload
  });
}

const getFacilityLocations = async (payload: any): Promise <any> => {
  return api({
    url: "/performFind",
    method: "POST",
    data: payload
  });
}

export const UserService = {
    login,
    getAvailableTimeZones,
    getProfile,
    setUserTimeZone,
    getFacilityLocations
}