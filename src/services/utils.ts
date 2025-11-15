import { DateTime } from "luxon";
import { v4 as uuidv4 } from 'uuid'
import { db } from '@/services/commonDatabase'
import { useUserProfile } from '@/stores/useUserProfileStore';

async function initDeviceId() {
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

const dateOrdinalSuffix = {
  1: 'st',
  21: 'st',
  31: 'st',
  2: 'nd',
  22: 'nd',
  3: 'rd',
  23: 'rd'
} as any;

function getDateWithOrdinalSuffix(time: any) {
  if (!time) return "-";
  const dateTime = DateTime.fromMillis(time);
  const suffix = dateOrdinalSuffix[dateTime.day] || "th"
  return `${dateTime.day}${suffix} ${dateTime.toFormat("MMM yyyy")}`;
}

export {
  getDateWithOrdinalSuffix,
  initDeviceId
}