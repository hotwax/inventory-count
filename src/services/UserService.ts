import api from '@/api'
import { client } from '@/api';
import store from '@/store';

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

const getProfile = async (payload: any): Promise <any>  => {
    const baseURL = store.getters['user/getInstanceUrl'];
    const headers = {
      'Authorization': `Bearer ${payload.token}`,
      'Content-Type': 'application/json'
    }

    return client({
      url: "user-profile",
      baseURL: `https://${baseURL}.hotwax.io/api/`,
      method: "get",
      headers
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

const getEComStores = async (payload: any): Promise<any> => {
  return api({
    url: "performFind",
    method: "post",
    data: payload
  });
}

const setUserPreference = async (payload: any): Promise<any> => {
  return api({
    url: "service/setUserPreference",
    method: "post",
    data: payload
  });
}

const getUserPreference = async (payload: any): Promise<any> => {
  return api({
    url: "service/getUserPreference",
    //TODO Due to security reasons service model OMS 1.0 does not support sending parameters in get request that's why we use post here
    method: "post",
    data: payload
  });
}

export const UserService = {
    login,
    getAvailableTimeZones,
    getProfile,
    setUserTimeZone,
    getEComStores,
    setUserPreference,
    getUserPreference
}