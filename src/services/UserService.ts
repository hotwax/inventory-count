import { api } from '@common';
import { useAuthStore } from '@/stores/authStore';

const getAuthBaseUrl = () => {
  return useAuthStore().getOmsUrl;
}

const login = async (username: string, password: string): Promise<any> => {
  return api({
    url: "login",
    method: "post",
    baseURL: getAuthBaseUrl(),
    data: {
      'USERNAME': username,
      'PASSWORD': password
    }
  });
}

const checkLoginOptions = async (): Promise<any> => {
  return api({
    url: "checkLoginOptions",
    method: "get",
    baseURL: getAuthBaseUrl()
  });
}

const logout = async (): Promise<any> => {
  return api({
    url: "logout",
    method: "get",
    baseURL: getAuthBaseUrl()
  });
}

export const UserService = {
  checkLoginOptions,
  login,
  logout
}
