import api from '@/api';
import { hasError } from '@/utils';
import logger from '@/logger';


const fetchAllNotificationTopics = async (params: any): Promise<any> => {
  let topics = [];

  try {
    const resp = await api({
      url: "/notificationTopics",
      method: "GET",
      params
    }) as any

    if(!hasError(resp) && resp.data?.length) {
      topics = resp.data.map((notification: any) => notification.topic)
    } else {
      resp;
    }
  } catch(err) {
    logger.error(err)
  }
  return topics;
}

const createNotificationTopic = async (payload: any): Promise<any> => {
  try {
    const resp = await api({
      url: "/notificationTopics",
      method: "POST",
      data: payload
    }) as any

    if(hasError(resp)) {
      throw resp.data
    }
  } catch(err) {
    logger.error(err)
  }
}

const createNotificationTopicUser = async (payload: any): Promise<any> => {
  try {
    const resp = await api({
      url: `/notificationTopics/${payload.topic}/users`,
      method: "POST",
      data: payload
    }) as any

    if(!hasError(resp)) {
      return resp.data.userId;
    } else {
      resp;
    }
  } catch(err) {
    logger.error(err)
    return false;
  }
}

const deleteNotificationTopicUser = async (payload: any): Promise<any> => {
  try {
    const resp = await api({
      url: `/notificationTopics/${payload.topic}/users/${payload.userId}`,
      method: "DELETE",
      data: payload
    }) as any

    if(!hasError(resp)) {
      return true;
    } else {
      resp;
    }
  } catch(err) {
    logger.error(err)
    return false;
  }
}

const checkIfUserSubscribedToTopic = async (params: any): Promise<any> => {
  try {
    const resp = await api({
      url: `/notificationTopics/${params.topic}/users`,
      method: "GET",
      params
    }) as any

    if(!hasError(resp) && resp.data?.length) {
      return true;
    } else {
      throw resp;
    }
  } catch(err) {
    logger.error(err)
    return false;
  }
}

export const WebSocketService = {
  checkIfUserSubscribedToTopic,
  createNotificationTopic,
  createNotificationTopicUser,
  deleteNotificationTopicUser,
  fetchAllNotificationTopics
}