import { v4 as uuidv4 } from 'uuid'
import { db } from '@/database/commonDatabase'
import store from '@/store'

export async function initDeviceId() {
  const pref = await db.appPreferences.get("deviceId");
  let deviceId = pref?.key;

  if (!deviceId) {
    deviceId = uuidv4();
    await db.appPreferences.put({ "key": "deviceId", "value": deviceId });
    console.info("[DeviceID] Generated new:", deviceId);
  } else {
    console.info("[DeviceID] Found existing:", pref?.value);
  }

  // Store it in Vuex state
  store.dispatch("user/setDeviceId", { "deviceId": pref?.value || deviceId });

  return deviceId;
}