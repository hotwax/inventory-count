import { v4 as uuidv4 } from 'uuid'
import { db } from '@/services/commonDatabase'
import { useUserProfile } from '@/stores/useUserProfileStore';

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
  useUserProfile().setDeviceId(pref?.value as string);

  return deviceId;
}